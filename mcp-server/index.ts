import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

// Ensure Vertex AI only — never fall back to Gemini API key
delete process.env.GOOGLE_API_KEY;
delete process.env.GEMINI_API_KEY;

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { and, asc, desc, eq, gt, sql as sqlFragment } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { z } from 'zod';
import * as schema from '../src/db/schema.js';
import { GEMINI_MODELS } from './constants.js';

// ── Setup ────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT ?? 'armen-pbu',
    location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
});

const server = new McpServer({
    name: 'funnel-creator',
    version: '1.0.0',
});

// ── Helpers ──────────────────────────────────────────────────────────
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}

function deepMerge(
    base: Record<string, unknown>,
    override: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = { ...base };
    for (const key of Object.keys(override)) {
        const baseVal = base[key];
        const overrideVal = override[key];
        if (
            overrideVal !== null &&
            typeof overrideVal === 'object' &&
            !Array.isArray(overrideVal) &&
            baseVal !== null &&
            typeof baseVal === 'object' &&
            !Array.isArray(baseVal)
        ) {
            result[key] = deepMerge(
                baseVal as Record<string, unknown>,
                overrideVal as Record<string, unknown>
            );
        } else {
            result[key] = overrideVal;
        }
    }
    return result;
}

// ── Tool: create_project ─────────────────────────────────────────────
server.tool(
    'create_project',
    'Create a new ad project from intake data. Returns the project ID and slug.',
    {
        name: z.string().describe('Project name (e.g. "Aurora Smart Mirror")'),
        product_description: z.string().describe('What the product is (from Q1)'),
        target_audience: z.string().describe('Who it is for (from Q2)'),
        intake: z.object({
            product: z.string(),
            audience: z.string(),
            objective: z.string(),
            link: z.string(),
            has_logo: z.string(),
            brand_colors: z.string(),
            references: z.string(),
            budget: z.string(),
            placements: z.string(),
            geography: z.string(),
        }).describe('All 10 intake answers'),
        inferred: z.object({
            audience_profile: z.any(),
            targeting_strategy: z.any(),
            brand_tone: z.any(),
        }).describe('Inferred audience analysis from Step 2'),
    },
    async ({ name, product_description, target_audience, intake, inferred }) => {
        const slug = slugify(name) + '-' + Date.now().toString(36);

        const [project] = await db.insert(schema.projects).values({
            name,
            slug,
            productDescription: product_description,
            targetAudience: target_audience,
            intake,
            inferred,
        }).returning({ id: schema.projects.id, slug: schema.projects.slug });

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ project_id: project.id, slug: project.slug }, null, 2),
            }],
        };
    }
);

// ── Tool: add_ad_concepts ────────────────────────────────────────────
server.tool(
    'add_ad_concepts',
    'Add ad concepts to a project. Returns the created concept IDs.',
    {
        project_id: z.string().uuid().describe('Project UUID'),
        concepts: z.array(z.object({
            angle_name: z.string(),
            angle: z.string(),
            headline: z.string(),
            body_copy: z.string(),
            cta: z.string(),
            visual_direction: z.string(),
            image_prompt: z.string().describe('Detailed image generation prompt for Gemini'),
            why_this_works: z.string().optional(),
        })).describe('Array of ad concepts to add'),
    },
    async ({ project_id, concepts }) => {
        const rows = concepts.map((c, i) => ({
            projectId: project_id,
            sortOrder: i,
            angleName: c.angle_name,
            angle: c.angle,
            headline: c.headline,
            bodyCopy: c.body_copy,
            cta: c.cta,
            visualDirection: c.visual_direction,
            imagePrompt: c.image_prompt,
            whyThisWorks: c.why_this_works ?? null,
            status: 'draft' as const,
        }));

        const inserted = await db.insert(schema.adConcepts).values(rows)
            .returning({ id: schema.adConcepts.id, angleName: schema.adConcepts.angleName });

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    created: inserted.length,
                    concepts: inserted,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: generate_ad_design ───────────────────────────────────────────
server.tool(
    'generate_ad_design',
    'Generate structured design JSON for an ad creative using Gemini. All images are 9:16 aspect ratio.',
    {
        ad_concept_id: z.string().uuid().describe('Ad concept UUID to generate design for'),
    },
    async ({ ad_concept_id }) => {
        // 1. Get concept + project for context
        const concept = await db.query.adConcepts.findFirst({
            where: eq(schema.adConcepts.id, ad_concept_id),
            with: { project: true },
        });

        if (!concept) {
            return { content: [{ type: 'text' as const, text: 'Error: Concept not found' }] };
        }

        // 2. Define design schema for structured output
        const designSchema = {
            type: 'object',
            properties: {
                platform: { type: 'string', enum: ['meta'] },
                aspectRatio: { type: 'string', enum: ['9:16'] },
                colors: {
                    type: 'object',
                    properties: {
                        primary: { type: 'string', description: 'Primary brand color (hex)' },
                        secondary: { type: 'string', description: 'Secondary color (hex)' },
                        accent: { type: 'string', description: 'Accent color for highlights (hex)' },
                        background: { type: 'string', description: 'Background color (hex)' },
                        text: { type: 'string', description: 'Text color (hex)' },
                    },
                    required: ['primary', 'secondary', 'accent', 'background', 'text'],
                },
                typography: {
                    type: 'object',
                    properties: {
                        headline: {
                            type: 'object',
                            properties: {
                                font: { type: 'string' },
                                size: { type: 'string' },
                                weight: { type: 'string' },
                            },
                            required: ['font', 'size', 'weight'],
                        },
                        subtext: {
                            type: 'object',
                            properties: {
                                font: { type: 'string' },
                                size: { type: 'string' },
                                weight: { type: 'string' },
                            },
                            required: ['font', 'size', 'weight'],
                        },
                    },
                    required: ['headline', 'subtext'],
                },
                layout: {
                    type: 'object',
                    properties: {
                        composition: { type: 'string', description: 'e.g., center-focused, rule-of-thirds' },
                        elements: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['composition', 'elements'],
                },
                textOverlays: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            text: { type: 'string' },
                            position: { type: 'string' },
                            style: { type: 'string' },
                        },
                        required: ['text', 'position', 'style'],
                    },
                },
                visualStyle: { type: 'string', description: 'e.g., modern-minimalist, vibrant-lifestyle' },
                mood: { type: 'string', description: 'e.g., aspirational, trustworthy' },
            },
            required: ['platform', 'aspectRatio', 'colors', 'typography', 'layout', 'textOverlays', 'visualStyle', 'mood'],
        };

        // 3. Generate design JSON with Gemini
        const designPrompt = `
You are an expert Meta/Instagram ad designer creating scroll-stopping 9:16 creatives.

PROJECT: ${concept.project.name}
TARGET AUDIENCE: ${concept.project.targetAudience}

CONCEPT:
- Angle: ${concept.angle}
- Headline: ${concept.headline}
- Body Copy: ${concept.bodyCopy}
- CTA: ${concept.cta}
- Visual Direction: ${concept.visualDirection}

Create a PREMIUM design specification optimized for Stories/Reels with:

1. **Color Palette**: Vibrant, cohesive colors (NOT bland). Use gradients where appropriate.
2. **Typography**: Modern, bold fonts for headline. Mix sizes for hierarchy.
3. **Layout**: Choose composition that best fits this concept:
   - Rule of thirds (dynamic, professional)
   - Asymmetric (bold, editorial)
   - Center-focused (only if the concept demands symmetry/balance)
4. **Text Overlays** (critical - be VERY specific):
   - Headline: Large, bold, positioned strategically (specify exact position)
   - CTA: Styled as PILL BUTTON with background color, padding, rounded corners, shadow
   - Supporting text: Include badges, small pills for features/benefits/urgency
   - Specify shadow/glow/outline for readability
5. **Visual Elements** to include:
   - Gradients (top-to-bottom fade, radial glow, color overlays for depth)
   - Geometric shapes (circles, rounded rectangles for framing key elements)
   - Decorative elements (lines, dots, subtle patterns if they enhance the concept)

6. **Composition Type** - Choose ONE based on concept angle:
   - Product-only shot: Clean studio, floating product, macro detail (NO humans)
   - Lifestyle shot: Human using/interacting with product, emotion visible
   - Environment shot: Product in natural setting, atmospheric (NO humans)

OUTPUT: Detailed JSON with exact positions, font specs, overlay styles, visual treatments.
        `.trim();

        const response = await ai.models.generateContent({
            model: GEMINI_MODELS.TEXT,
            contents: designPrompt,
            config: {
                responseSchema: designSchema,
                responseMimeType: 'application/json',
            },
        });

        if (!response.text) {
            return { content: [{ type: 'text' as const, text: 'Error: Gemini did not return design JSON.' }] };
        }

        const designJson = JSON.parse(response.text);

        // 4. Create pending image record with design JSON
        const [image] = await db.insert(schema.adImages).values({
            adConceptId: ad_concept_id,
            designJson,
            prompt: '', // Will be filled during image generation
            status: 'pending',
            generationParams: { aspectRatio: '9:16' },
        }).returning({ id: schema.adImages.id });

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ image_id: image.id, design: designJson }, null, 2),
            }],
        };
    }
);

// ── Tool: generate_ad_image ──────────────────────────────────────────
server.tool(
    'generate_ad_image',
    'Generate ad image from design JSON using Gemini 3 Pro. Must call generate_ad_design first. Always generates 9:16 aspect ratio.',
    {
        image_id: z.string().uuid().describe('Image ID from generate_ad_design'),
    },
    async ({ image_id }) => {
        // 1. Get image record with design JSON
        const image = await db.query.adImages.findFirst({
            where: eq(schema.adImages.id, image_id),
            with: {
                adConcept: {
                    with: { project: { columns: { slug: true } } },
                },
            },
        });

        if (!image) {
            return { content: [{ type: 'text' as const, text: 'Error: Image not found' }] };
        }

        if (!image.designJson) {
            return { content: [{ type: 'text' as const, text: 'Error: Image must have design JSON. Call generate_ad_design first.' }] };
        }

        // 2. Build enhanced prompt from design JSON
        const design = image.designJson as any;
        const concept = image.adConcept;
        const aspectRatio = '9:16';

        const enhancedPrompt = `
Create a scroll-stopping ${aspectRatio} Meta/Instagram ad creative.

CONCEPT: ${concept.headline}
${concept.visualDirection}

DESIGN PALETTE:
${design.colors.primary} • ${design.colors.secondary} • ${design.colors.accent}
Style: ${design.visualStyle} | Mood: ${design.mood}
Composition: ${design.layout.composition}

TEXT & OVERLAYS TO INCLUDE:
${design.textOverlays.map((t: any, i: number) => `${i + 1}. "${t.text}" — ${t.position}, ${t.style}`).join('\n')}

KEY ELEMENTS: ${design.layout.elements.join(', ')}

━━━ MAKE IT STAND OUT ━━━

Think premium Meta ads you'd stop scrolling for:
• CTAs as pill buttons with depth (shadows, gradients, icons/arrows)
• Overlays & borders that match the theme and create visual interest
• Text with professional styling (bold fonts, glows, shadows for readability)
• Layers and depth (gradients, vignettes, color washes)
• Modern, polished details that feel intentional

Render everything as one cohesive, ready-to-publish creative. Be creative with how you apply the design system - surprise me with professional polish.
        `.trim();

        // 3. Generate image with Gemini
        const response = await ai.models.generateContent({
            model: GEMINI_MODELS.IMAGE,
            contents: enhancedPrompt,
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData
        );

        if (!imagePart?.inlineData?.data) {
            // Update as failed
            await db.update(schema.adImages)
                .set({ status: 'failed', prompt: enhancedPrompt })
                .where(eq(schema.adImages.id, image_id));
            return { content: [{ type: 'text' as const, text: 'Error: Gemini did not return an image.' }] };
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

        // 4. Upload to Vercel Blob
        const pathname = `ads/${concept.project.slug}/${image_id}-${Date.now()}.png`;
        const blob = await put(pathname, buffer, {
            access: 'public',
            contentType: 'image/png',
        });

        // 5. Update image record
        await db.update(schema.adImages)
            .set({
                prompt: enhancedPrompt,
                blobUrl: blob.url,
                blobPathname: blob.pathname,
                status: 'generated',
                generationParams: { aspectRatio: '9:16', model: GEMINI_MODELS.IMAGE },
            })
            .where(eq(schema.adImages.id, image_id));

        // 6. Update concept status
        await db.update(schema.adConcepts)
            .set({ status: 'generated' })
            .where(eq(schema.adConcepts.id, concept.id));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    image_id,
                    blob_url: blob.url,
                    pathname,
                    design: design,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: get_project ────────────────────────────────────────────────
server.tool(
    'get_project',
    'Get a project with all its ad concepts and images.',
    {
        project_id: z.string().uuid().optional().describe('Project UUID'),
        slug: z.string().optional().describe('Project slug'),
    },
    async ({ project_id, slug }) => {
        const where = project_id
            ? eq(schema.projects.id, project_id)
            : slug
                ? eq(schema.projects.slug, slug)
                : undefined;

        if (!where) {
            return { content: [{ type: 'text' as const, text: 'Error: Provide project_id or slug' }] };
        }

        const project = await db.query.projects.findFirst({
            where,
            with: {
                adConcepts: {
                    orderBy: [desc(schema.adConcepts.sortOrder)],
                    with: { images: true },
                },
                funnels: {
                    columns: { slug: true, name: true },
                },
            },
        });

        if (!project) {
            return { content: [{ type: 'text' as const, text: 'Error: Project not found' }] };
        }

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify(project, null, 2),
            }],
        };
    }
);

// ── Tool: list_projects ──────────────────────────────────────────────
server.tool(
    'list_projects',
    'List all projects with concept and image counts.',
    {},
    async () => {
        const allProjects = await db.query.projects.findMany({
            orderBy: [desc(schema.projects.createdAt)],
            with: {
                adConcepts: {
                    columns: { id: true, status: true },
                    with: { images: { columns: { id: true, status: true } } },
                },
            },
        });

        const summary = allProjects.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            created_at: p.createdAt,
            concept_count: p.adConcepts.length,
            image_count: p.adConcepts.reduce((sum, c) => sum + c.images.length, 0),
            generated_images: p.adConcepts.reduce(
                (sum, c) => sum + c.images.filter(i => i.status === 'generated').length, 0
            ),
        }))

            ;

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ total: summary.length, projects: summary }, null, 2),
            }],
        };
    }
);

// ── Tool: list_funnels ────────────────────────────────────────────────
server.tool(
    'list_funnels',
    'List all funnels grouped by version family. Shows base_slug, version_number, is_published, slug, and name so you can identify which version is live and what drafts exist.',
    {},
    async () => {
        const list = await db
            .select({
                slug: schema.funnels.slug,
                name: schema.funnels.name,
                baseSlug: schema.funnels.baseSlug,
                versionNumber: schema.funnels.versionNumber,
                isPublished: schema.funnels.isPublished,
            })
            .from(schema.funnels)
            .orderBy(schema.funnels.baseSlug, schema.funnels.versionNumber);

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ funnels: list }, null, 2),
            }],
        };
    }
);

// ── Tool: get_funnel_steps ────────────────────────────────────────────
server.tool(
    'get_funnel_steps',
    'Get all steps for a funnel including full config and showIf conditions. Use this before editing a step to read its current content (question text, options, etc.).',
    {
        funnel_slug: z.string().describe('Funnel slug (e.g. aurora-399-v1)'),
    },
    async ({ funnel_slug }) => {
        const funnel = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
        });

        if (!funnel) {
            return { content: [{ type: 'text' as const, text: `Error: Funnel not found: ${funnel_slug}` }] };
        }

        const steps = await db.query.funnelSteps.findMany({
            where: eq(schema.funnelSteps.funnelId, funnel.id),
            orderBy: [asc(schema.funnelSteps.sortOrder)],
            columns: { sortOrder: true, stepId: true, type: true, config: true, showIf: true },
        });

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ steps }, null, 2),
            }],
        };
    }
);

// ── Tool: insert_funnel_step ─────────────────────────────────────────
server.tool(
    'insert_funnel_step',
    'Insert a funnel step at beginning, after a specific step, or end. Reorders existing steps as needed.',
    {
        funnel_slug: z.string().describe('Funnel slug'),
        position: z.enum(['beginning', 'after_step', 'end']).describe('Where to insert'),
        after_step_id: z.string().optional().describe('Required when position is after_step'),
        step_id: z.string().describe('Unique step slug (e.g. budget-question)'),
        type: z.enum([
            'welcome', 'multiple-choice', 'checkboxes', 'email', 'text-input',
            'number-picker', 'info-card', 'checkout', 'result',
        ]).describe('Step type'),
        config: z.record(z.string(), z.unknown()).describe('Type-specific config (question, options, etc.)'),
    },
    async ({ funnel_slug, position, after_step_id, step_id, type, config }) => {
        const funnel = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
        });

        if (!funnel) {
            return { content: [{ type: 'text' as const, text: `Error: Funnel not found: ${funnel_slug}` }] };
        }

        if (position === 'after_step' && !after_step_id) {
            return { content: [{ type: 'text' as const, text: 'Error: after_step_id required when position is after_step' }] };
        }

        let newSortOrder: number;

        if (position === 'beginning') {
            await db.update(schema.funnelSteps)
                .set({ sortOrder: sqlFragment`${schema.funnelSteps.sortOrder} + 1` })
                .where(eq(schema.funnelSteps.funnelId, funnel.id));
            newSortOrder = 0;
        } else if (position === 'after_step' && after_step_id) {
            const afterStep = await db.query.funnelSteps.findFirst({
                where: and(
                    eq(schema.funnelSteps.funnelId, funnel.id),
                    eq(schema.funnelSteps.stepId, after_step_id)
                ),
            });

            if (!afterStep) {
                return { content: [{ type: 'text' as const, text: `Error: Step not found: ${after_step_id}` }] };
            }

            await db.update(schema.funnelSteps)
                .set({ sortOrder: sqlFragment`${schema.funnelSteps.sortOrder} + 1` })
                .where(and(
                    eq(schema.funnelSteps.funnelId, funnel.id),
                    gt(schema.funnelSteps.sortOrder, afterStep.sortOrder)
                ));
            newSortOrder = afterStep.sortOrder + 1;
        } else {
            const steps = await db.query.funnelSteps.findMany({
                where: eq(schema.funnelSteps.funnelId, funnel.id),
                columns: { sortOrder: true },
            });
            const maxOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.sortOrder)) : -1;
            newSortOrder = maxOrder + 1;
        }

        const [inserted] = await db.insert(schema.funnelSteps).values({
            funnelId: funnel.id,
            sortOrder: newSortOrder,
            stepId: step_id,
            type,
            config,
        }).returning({ id: schema.funnelSteps.id, stepId: schema.funnelSteps.stepId, sortOrder: schema.funnelSteps.sortOrder });

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    inserted: true,
                    step_id: inserted.stepId,
                    sort_order: inserted.sortOrder,
                    funnel_slug: funnel_slug,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: refine_ad_design ──────────────────────────────────────────
server.tool(
    'refine_ad_design',
    'Refine design JSON based on feedback (e.g., "make it warmer", "more professional")',
    {
        image_id: z.string().uuid().describe('Image ID to refine'),
        feedback: z.string().describe('Natural language feedback'),
    },
    async ({ image_id, feedback }) => {
        const image = await db.query.adImages.findFirst({
            where: eq(schema.adImages.id, image_id),
            with: { adConcept: { with: { project: true } } },
        });

        if (!image?.designJson) {
            return { content: [{ type: 'text' as const, text: 'Error: Image or design JSON not found' }] };
        }

        const currentDesign = image.designJson as any;
        const concept = image.adConcept;

        const refinementPrompt = `
Refine this Meta ad design based on user feedback.

CURRENT DESIGN:
${JSON.stringify(currentDesign, null, 2)}

CONCEPT: ${concept.headline}
${concept.visualDirection}

FEEDBACK: "${feedback}"

Adjust the design JSON to incorporate this feedback. Focus on colors, visual style, typography, and text overlays as relevant.
        `.trim();

        const designSchema = {
            type: 'object',
            properties: {
                platform: { type: 'string', enum: ['meta'] },
                aspectRatio: { type: 'string', enum: ['9:16'] },
                colors: {
                    type: 'object',
                    properties: {
                        primary: { type: 'string' },
                        secondary: { type: 'string' },
                        accent: { type: 'string' },
                        background: { type: 'string' },
                        text: { type: 'string' },
                    },
                    required: ['primary', 'secondary', 'accent', 'background', 'text'],
                },
                typography: {
                    type: 'object',
                    properties: {
                        headline: {
                            type: 'object',
                            properties: {
                                font: { type: 'string' },
                                size: { type: 'string' },
                                weight: { type: 'string' },
                            },
                            required: ['font', 'size', 'weight'],
                        },
                        subtext: {
                            type: 'object',
                            properties: {
                                font: { type: 'string' },
                                size: { type: 'string' },
                                weight: { type: 'string' },
                            },
                            required: ['font', 'size', 'weight'],
                        },
                    },
                    required: ['headline', 'subtext'],
                },
                layout: {
                    type: 'object',
                    properties: {
                        composition: { type: 'string' },
                        elements: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['composition', 'elements'],
                },
                textOverlays: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            text: { type: 'string' },
                            position: { type: 'string' },
                            style: { type: 'string' },
                        },
                        required: ['text', 'position', 'style'],
                    },
                },
                visualStyle: { type: 'string' },
                mood: { type: 'string' },
            },
            required: ['platform', 'aspectRatio', 'colors', 'typography', 'layout', 'textOverlays', 'visualStyle', 'mood'],
        };

        const response = await ai.models.generateContent({
            model: GEMINI_MODELS.TEXT,
            contents: refinementPrompt,
            config: {
                responseSchema: designSchema,
                responseMimeType: 'application/json',
            },
        });

        if (!response.text) {
            return { content: [{ type: 'text' as const, text: 'Error: Failed to generate refined design' }] };
        }

        const refinedDesign = JSON.parse(response.text);

        await db.update(schema.adImages)
            .set({ designJson: refinedDesign })
            .where(eq(schema.adImages.id, image_id));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    image_id,
                    refined_design: refinedDesign,
                    feedback_applied: feedback,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: regenerate_ad_image ────────────────────────────────────────
server.tool(
    'regenerate_ad_image',
    'Regenerate ad image using current (possibly refined) design JSON',
    {
        image_id: z.string().uuid().describe('Image ID to regenerate'),
    },
    async ({ image_id }) => {
        const image = await db.query.adImages.findFirst({
            where: eq(schema.adImages.id, image_id),
            with: { adConcept: { with: { project: { columns: { slug: true } } } } },
        });

        if (!image?.designJson) {
            return { content: [{ type: 'text' as const, text: 'Error: Image or design JSON not found' }] };
        }

        const design = image.designJson as any;
        const concept = image.adConcept;

        const enhancedPrompt = `
Create a scroll-stopping 9:16 Meta/Instagram ad creative.

CONCEPT: ${concept.headline}
${concept.visualDirection}

DESIGN PALETTE:
${design.colors.primary} • ${design.colors.secondary} • ${design.colors.accent}
Style: ${design.visualStyle} | Mood: ${design.mood}
Composition: ${design.layout.composition}

TEXT & OVERLAYS TO INCLUDE:
${design.textOverlays.map((t: any, i: number) => `${i + 1}. "${t.text}" — ${t.position}, ${t.style}`).join('\n')}

KEY ELEMENTS: ${design.layout.elements.join(', ')}

━━━ MAKE IT STAND OUT ━━━

Think premium Meta ads you'd stop scrolling for:
• CTAs as pill buttons with depth (shadows, gradients, icons/arrows)
• Overlays & borders that match the theme and create visual interest  
• Text with professional styling (bold fonts, glows, shadows for readability)
• Layers and depth (gradients, vignettes, color washes)
• Modern, polished details that feel intentional

Render everything as one cohesive, ready-to-publish creative. Be creative with how you apply the design system - surprise me with professional polish.
        `.trim();

        const response = await ai.models.generateContent({
            model: GEMINI_MODELS.IMAGE,
            contents: enhancedPrompt,
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData
        );

        if (!imagePart?.inlineData?.data) {
            await db.update(schema.adImages)
                .set({ status: 'failed', prompt: enhancedPrompt })
                .where(eq(schema.adImages.id, image_id));
            return { content: [{ type: 'text' as const, text: 'Error: Image generation failed' }] };
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const pathname = `ads/${concept.project.slug}/${image_id}-${Date.now()}.png`;

        const blob = await put(pathname, buffer, {
            access: 'public',
            contentType: 'image/png',
        });

        await db.update(schema.adImages)
            .set({
                prompt: enhancedPrompt,
                blobUrl: blob.url,
                blobPathname: blob.pathname,
                status: 'generated',
                generationParams: { aspectRatio: '9:16', model: GEMINI_MODELS.IMAGE },
            })
            .where(eq(schema.adImages.id, image_id));

        await db.update(schema.adConcepts)
            .set({ status: 'generated' })
            .where(eq(schema.adConcepts.id, concept.id));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    image_id,
                    blob_url: blob.url,
                    pathname,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: create_funnel_version ──────────────────────────────────────
server.tool(
    'create_funnel_version',
    'Create a new version of a funnel by copying all its steps. The new version is unpublished (draft) and can be previewed via ?funnel=<new_slug>. Call publish_funnel_version when ready to go live.',
    {
        funnel_slug: z.string().describe('Slug of the funnel version to copy from (e.g. aurora-399-v1)'),
    },
    async ({ funnel_slug }) => {
        // 1. Load the source funnel
        const source = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
            with: { steps: { orderBy: [asc(schema.funnelSteps.sortOrder)] } },
        });

        if (!source) {
            return { content: [{ type: 'text' as const, text: `Error: Funnel not found: ${funnel_slug}` }] };
        }

        // 2. Find the highest version number in this family
        const siblings = await db
            .select({ versionNumber: schema.funnels.versionNumber })
            .from(schema.funnels)
            .where(eq(schema.funnels.baseSlug, source.baseSlug));

        const maxVersion = Math.max(...siblings.map((s) => s.versionNumber));
        const newVersion = maxVersion + 1;
        const newSlug = `${source.baseSlug}-v${newVersion}`;

        // 3. Insert the new funnel row
        const [newFunnel] = await db.insert(schema.funnels).values({
            projectId: source.projectId,
            slug: newSlug,
            baseSlug: source.baseSlug,
            versionNumber: newVersion,
            isPublished: false,
            name: source.name,
            version: source.version,
            priceVariant: source.priceVariant,
            theme: source.theme,
            tracking: source.tracking,
            meta: source.meta,
        }).returning({ id: schema.funnels.id });

        // 4. Copy all steps to the new funnel
        if (source.steps.length > 0) {
            await db.insert(schema.funnelSteps).values(
                source.steps.map((step) => ({
                    funnelId: newFunnel.id,
                    sortOrder: step.sortOrder,
                    stepId: step.stepId,
                    type: step.type,
                    config: step.config,
                    showIf: step.showIf,
                }))
            );
        }

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    new_funnel_slug: newSlug,
                    version_number: newVersion,
                    copied_from: funnel_slug,
                    steps_copied: source.steps.length,
                    is_published: false,
                    preview_url: `?funnel=${newSlug}`,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: publish_funnel_version ─────────────────────────────────────
server.tool(
    'publish_funnel_version',
    'Promote a funnel version to live/published. Unpublishes all other versions in the same family. After publishing, the funnel is accessible via ?funnel=<base_slug>.',
    {
        funnel_slug: z.string().describe('Slug of the funnel version to publish (e.g. aurora-399-v2)'),
    },
    async ({ funnel_slug }) => {
        const target = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
            columns: { id: true, baseSlug: true, versionNumber: true },
        });

        if (!target) {
            return { content: [{ type: 'text' as const, text: `Error: Funnel not found: ${funnel_slug}` }] };
        }

        // Unpublish all versions in this family
        await db.update(schema.funnels)
            .set({ isPublished: false })
            .where(eq(schema.funnels.baseSlug, target.baseSlug));

        // Publish the target version
        await db.update(schema.funnels)
            .set({ isPublished: true })
            .where(eq(schema.funnels.id, target.id));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    published: funnel_slug,
                    version_number: target.versionNumber,
                    base_slug: target.baseSlug,
                    live_url: `?funnel=${target.baseSlug}`,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: edit_funnel_step ────────────────────────────────────────────
server.tool(
    'edit_funnel_step',
    'Edit the config of a specific step within a funnel version. The config is deep-merged with the existing step config. Call get_funnel_steps first to see the current step structure.',
    {
        funnel_slug: z.string().describe('Funnel slug to edit (should be an unpublished draft version)'),
        step_id: z.string().describe('Step ID to edit (e.g. pregnancy-status)'),
        config: z.record(z.string(), z.unknown()).describe('Config fields to update (deep-merged into existing config)'),
    },
    async ({ funnel_slug, step_id, config: newConfig }) => {
        const funnel = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
            columns: { id: true },
        });

        if (!funnel) {
            return { content: [{ type: 'text' as const, text: `Error: Funnel not found: ${funnel_slug}` }] };
        }

        const step = await db.query.funnelSteps.findFirst({
            where: and(
                eq(schema.funnelSteps.funnelId, funnel.id),
                eq(schema.funnelSteps.stepId, step_id)
            ),
        });

        if (!step) {
            return { content: [{ type: 'text' as const, text: `Error: Step not found: ${step_id} in funnel ${funnel_slug}` }] };
        }

        const mergedConfig = deepMerge(step.config as Record<string, unknown>, newConfig);

        const [updated] = await db.update(schema.funnelSteps)
            .set({ config: mergedConfig })
            .where(eq(schema.funnelSteps.id, step.id))
            .returning();

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    updated: true,
                    step_id,
                    funnel_slug,
                    config: updated.config,
                }, null, 2),
            }],
        };
    }
);

// ── Tool: remove_funnel_step ──────────────────────────────────────────
server.tool(
    'remove_funnel_step',
    'Remove a step from a funnel version and re-sequence sort_order for the remaining steps.',
    {
        funnel_slug: z.string().describe('Funnel slug to edit (should be an unpublished draft version)'),
        step_id: z.string().describe('Step ID to remove (e.g. budget-question)'),
    },
    async ({ funnel_slug, step_id }) => {
        const funnel = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
            columns: { id: true },
        });

        if (!funnel) {
            return { content: [{ type: 'text' as const, text: `Error: Funnel not found: ${funnel_slug}` }] };
        }

        const step = await db.query.funnelSteps.findFirst({
            where: and(
                eq(schema.funnelSteps.funnelId, funnel.id),
                eq(schema.funnelSteps.stepId, step_id)
            ),
            columns: { id: true, sortOrder: true },
        });

        if (!step) {
            return { content: [{ type: 'text' as const, text: `Error: Step not found: ${step_id} in funnel ${funnel_slug}` }] };
        }

        // Delete the step
        await db.delete(schema.funnelSteps).where(eq(schema.funnelSteps.id, step.id));

        // Re-sequence remaining steps to close the gap
        const remaining = await db.query.funnelSteps.findMany({
            where: eq(schema.funnelSteps.funnelId, funnel.id),
            orderBy: [asc(schema.funnelSteps.sortOrder)],
            columns: { id: true },
        });

        for (let i = 0; i < remaining.length; i++) {
            await db.update(schema.funnelSteps)
                .set({ sortOrder: i })
                .where(eq(schema.funnelSteps.id, remaining[i].id));
        }

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    removed: step_id,
                    funnel_slug,
                    remaining_steps: remaining.length,
                }, null, 2),
            }],
        };
    }
);

// ── Start Server ─────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);
