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
import { readFileSync } from 'fs';
import { resolve } from 'path';
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

// ── Tool: read_skill ──────────────────────────────────────────────────
// Call once per session at the start, before the first funnel tool.
// Returns full SKILL.md workflow(s) so Claude has complete context.
server.tool(
    'read_skill',
    'Call once at the start of a session, before the first funnel-related tool (create_project, add_ad_concepts, generate_ad_image, insert_funnel_step, etc.). Returns the full SKILL.md workflow. Use skill_name "both" to load both funnel-creator and funnel-editor for complete context. Only call once per session, not before every tool.',
    {
        skill_name: z.enum(['funnel-creator', 'funnel-editor', 'both']).describe('Which skill(s) to read. Use "both" at session start to load full context for all funnel tools.'),
    },
    async ({ skill_name }) => {
        const skills = skill_name === 'both' ? ['funnel-creator', 'funnel-editor'] : [skill_name];
        const parts: string[] = [];
        for (const name of skills) {
            const path = resolve(process.cwd(), `skills/${name}/SKILL.md`);
            const text = readFileSync(path, 'utf-8');
            parts.push(`---\n# ${name}\n---\n\n${text}`);
        }
        const text = parts.join('\n\n');
        return {
            content: [{ type: 'text' as const, text }],
        };
    }
);

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

const VERSIONED_SLUG_RE = /^([a-z0-9]+(?:-[a-z0-9]+)*)-v(\d+)$/;

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
            persona: z.string().optional().describe('Optional micropersona label for this concept'),
            awareness_level: z.enum([
                'problem-unaware',
                'problem-aware',
                'solution-aware',
                'product-aware',
                'most-aware',
            ]).optional().describe('Optional awareness stage for messaging calibration'),
            format_type: z.enum([
                'lifestyle-hero',
                'product-demo',
                'word-wall',
                'ugc-testimonial',
                'comparison',
                'problem-agitation',
                'aspirational-after-state',
                'data-stat',
            ]).optional().describe('Optional visual format hint for design generation'),
            why_this_works: z.string().optional(),
        })).describe('Array of ad concepts to add'),
    },
    async ({ project_id, concepts }) => {
        const rows = concepts.map((c, i) => {
            const strategyTags = [
                c.persona ? `Persona: ${c.persona}` : null,
                c.awareness_level ? `Awareness: ${c.awareness_level}` : null,
                c.format_type ? `Format: ${c.format_type}` : null,
            ].filter(Boolean);

            const strategyBlock = strategyTags.length
                ? `\n\n[Strategy Context]\n${strategyTags.join('\n')}`
                : '';

            return {
            projectId: project_id,
            sortOrder: i,
            angleName: c.angle_name,
            angle: c.angle,
            headline: c.headline,
            bodyCopy: c.body_copy,
            cta: c.cta,
            visualDirection: `${c.visual_direction}${strategyBlock}`,
            imagePrompt: `${c.image_prompt}${strategyBlock}`,
            whyThisWorks: c.why_this_works ?? null,
            status: 'draft' as const,
            };
        });

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
- Source Image Prompt: ${concept.imagePrompt ?? 'none'}

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

7. **Use strategy context when present**:
   - If Persona is provided, align styling and emotional tone to that persona.
   - If Awareness is provided, calibrate text intensity and specificity to that stage.
   - If Format is provided, match composition and visual DNA to that format.

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
            'number-picker', 'info-card', 'embedded-calendly', 'checkout', 'result',
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
    'create_funnel',
    'Create a brand-new funnel from scratch (new funnel family/version) with an initial ordered step list. This creates a draft v1 and does not publish it.',
    {
        funnel_slug: z.string().describe('Versioned slug for the new funnel (must be <base-slug>-v1, e.g. aurora-399-v1)'),
        name: z.string().describe('Human-readable funnel name'),
        base_slug: z.string().optional().describe('Optional explicit base slug. If provided, it must match funnel_slug without the -vN suffix.'),
        version_label: z.string().optional().describe('Optional display version label (e.g. "v1", "March 2026")'),
        price_variant: z.string().optional().describe('Optional price variant label (e.g. "399")'),
        project_id: z.string().uuid().optional().describe('Optional project UUID to link this funnel to an ad project'),
        theme: z.record(z.string(), z.unknown()).describe('Funnel theme object'),
        tracking: z.record(z.string(), z.unknown()).optional().describe('Optional tracking configuration object'),
        meta: z.record(z.string(), z.unknown()).optional().describe('Optional funnel metadata object'),
        steps: z.array(z.object({
            step_id: z.string().describe('Unique step ID (slug)'),
            type: z.enum([
                'welcome', 'multiple-choice', 'checkboxes', 'ranking', 'email', 'text-input',
                'number-picker', 'info-card', 'embedded-calendly', 'checkout', 'result',
            ]).describe('Step type'),
            config: z.record(z.string(), z.unknown()).describe('Type-specific step config'),
            show_if: z.object({
                stepId: z.string(),
                operator: z.enum(['equals', 'not_equals', 'in', 'not_in']),
                value: z.union([z.string(), z.array(z.string())]),
            }).optional().describe('Optional conditional display rule'),
        })).min(1).describe('Initial step list in order'),
    },
    async ({ funnel_slug, name, base_slug, version_label, price_variant, project_id, theme, tracking, meta, steps }) => {
        const parsed = VERSIONED_SLUG_RE.exec(funnel_slug);
        if (!parsed) {
            return { content: [{ type: 'text' as const, text: 'Error: funnel_slug must match <base-slug>-v<number> (e.g. aurora-399-v1)' }] };
        }

        const parsedBaseSlug = parsed[1];
        const parsedVersion = Number(parsed[2]);
        if (!Number.isInteger(parsedVersion) || parsedVersion !== 1) {
            return { content: [{ type: 'text' as const, text: 'Error: create_funnel only supports new v1 funnels. Use a slug ending in -v1.' }] };
        }

        if (base_slug && base_slug !== parsedBaseSlug) {
            return { content: [{ type: 'text' as const, text: `Error: base_slug (${base_slug}) must match funnel_slug base (${parsedBaseSlug})` }] };
        }

        const existingSlug = await db.query.funnels.findFirst({
            where: eq(schema.funnels.slug, funnel_slug),
            columns: { id: true },
        });
        if (existingSlug) {
            return { content: [{ type: 'text' as const, text: `Error: funnel_slug already exists: ${funnel_slug}` }] };
        }

        const existingFamily = await db.query.funnels.findFirst({
            where: eq(schema.funnels.baseSlug, parsedBaseSlug),
            columns: { id: true },
        });
        if (existingFamily) {
            return { content: [{ type: 'text' as const, text: `Error: base_slug already exists: ${parsedBaseSlug}. Use create_funnel_version to add another version.` }] };
        }

        const ids = steps.map((s) => s.step_id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            return { content: [{ type: 'text' as const, text: 'Error: steps must have unique step_id values' }] };
        }

        const [newFunnel] = await db.insert(schema.funnels).values({
            projectId: project_id ?? null,
            slug: funnel_slug,
            baseSlug: parsedBaseSlug,
            versionNumber: 1,
            isPublished: false,
            name,
            version: version_label ?? null,
            priceVariant: price_variant ?? null,
            theme,
            tracking: tracking ?? null,
            meta: meta ?? null,
        }).returning({ id: schema.funnels.id, baseSlug: schema.funnels.baseSlug, slug: schema.funnels.slug, versionNumber: schema.funnels.versionNumber });

        await db.insert(schema.funnelSteps).values(
            steps.map((step, idx) => ({
                funnelId: newFunnel.id,
                sortOrder: idx,
                stepId: step.step_id,
                type: step.type,
                config: step.config,
                showIf: step.show_if ?? null,
            }))
        );

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    funnel_slug: newFunnel.slug,
                    base_slug: newFunnel.baseSlug,
                    version_number: newFunnel.versionNumber,
                    steps_created: steps.length,
                    is_published: false,
                    preview_url: `?funnel=${newFunnel.slug}`,
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

// ── Tool: publish_campaign ────────────────────────────────────────────
server.tool(
    'publish_campaign',
    'Publish a Meta ad campaign from an approved project. Creates Campaign → Ad Set → one Ad per concept that has a generated image. All objects are created PAUSED so you can review before going live. Call activate_campaign when ready to start spending.',
    {
        project_id: z.string().uuid().describe('Project UUID to publish'),
        daily_budget_usd: z.number().positive().optional().describe('Daily budget in USD (overrides intake Q8). e.g. 50 for $50/day'),
        start_date: z.string().optional().describe('Campaign start date in YYYY-MM-DD format (defaults to today)'),
    },
    async ({ project_id, daily_budget_usd, start_date }) => {
        const accessToken = process.env.META_ACCESS_TOKEN;
        const adAccountId = process.env.META_AD_ACCOUNT_ID;
        const pageId = process.env.META_PAGE_ID;
        const metaApiVersion = 'v22.0';

        if (!accessToken || !adAccountId || !pageId) {
            return { content: [{ type: 'text' as const, text: 'Error: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, and META_PAGE_ID env vars are required' }] };
        }

        // 1. Fetch project + all concepts + their images
        const project = await db.query.projects.findFirst({
            where: eq(schema.projects.id, project_id),
            with: {
                adConcepts: {
                    orderBy: [asc(schema.adConcepts.sortOrder)],
                    with: { images: true },
                },
            },
        });

        if (!project) {
            return { content: [{ type: 'text' as const, text: `Error: Project not found: ${project_id}` }] };
        }

        const intake = project.intake as Record<string, string> | null;
        const inferred = project.inferred as Record<string, unknown> | null;

        // 2. Determine daily budget (parameter overrides intake Q8)
        const budgetUsd = daily_budget_usd ?? parseFloat(intake?.budget ?? '0');
        if (!budgetUsd || isNaN(budgetUsd) || budgetUsd <= 0) {
            return { content: [{ type: 'text' as const, text: 'Error: Provide a valid daily_budget_usd (e.g. 50 for $50/day) or ensure intake Q8 contains a dollar amount' }] };
        }
        const dailyBudgetCents = Math.round(budgetUsd * 100);

        // 3. Map intake.objective → Meta campaign objective
        const objectiveMap: Record<string, string> = {
            signup: 'OUTCOME_LEADS',
            download: 'OUTCOME_LEADS',
            visit: 'OUTCOME_TRAFFIC',
            buy: 'OUTCOME_SALES',
        };
        const objective = objectiveMap[intake?.objective ?? ''] ?? 'OUTCOME_TRAFFIC';

        // 4. Map intake.placements → publisher_platforms + positions
        const placement = intake?.placements ?? 'both';
        const publisherPlatforms: string[] = [];
        const facebookPositions: string[] = [];
        const instagramPositions: string[] = [];
        if (placement === 'facebook' || placement === 'both') {
            publisherPlatforms.push('facebook');
            facebookPositions.push('feed', 'story');
        }
        if (placement === 'instagram' || placement === 'both') {
            publisherPlatforms.push('instagram');
            instagramPositions.push('stream', 'story', 'reels');
        }
        if (publisherPlatforms.length === 0) {
            publisherPlatforms.push('facebook', 'instagram');
            facebookPositions.push('feed', 'story');
            instagramPositions.push('stream', 'story', 'reels');
        }

        // 5. Map intake.geography → geo_locations
        const geo = intake?.geography ?? 'us-only';
        const geoLocations = geo === 'us-only'
            ? { countries: ['US'] }
            : { countries: ['US', 'GB', 'CA', 'AU'] };

        // 6. Translate inferred interest names → Meta interest IDs via Targeting Search API
        const interestIds: Array<{ id: string; name: string }> = [];
        const targetingStrategy = inferred?.targeting_strategy as Record<string, unknown> | null;
        const rawInterests = (
            targetingStrategy?.interests ??
            targetingStrategy?.interest_categories ??
            targetingStrategy?.meta_interest_categories ??
            targetingStrategy?.meta_interests ??
            []
        );
        const interestNames: string[] = Array.isArray(rawInterests)
            ? rawInterests.filter((i): i is string => typeof i === 'string').slice(0, 5)
            : [];

        for (const interestName of interestNames) {
            try {
                const searchUrl = new URL(`https://graph.facebook.com/${metaApiVersion}/search`);
                searchUrl.searchParams.set('type', 'adTargetingCategory');
                searchUrl.searchParams.set('class', 'interests');
                searchUrl.searchParams.set('q', interestName);
                searchUrl.searchParams.set('access_token', accessToken);
                const searchRes = await fetch(searchUrl.toString());
                if (searchRes.ok) {
                    const searchData = await searchRes.json() as { data?: Array<{ id: string; name: string }> };
                    if (searchData.data?.[0]) {
                        interestIds.push({ id: searchData.data[0].id, name: searchData.data[0].name });
                    }
                }
            } catch {
                // Skip interests that fail to look up — non-blocking
            }
        }

        // 7. Pre-flight: ensure at least one concept has a generated image before touching Meta
        const conceptsWithImages = project.adConcepts.filter(
            c => c.images.some(img => img.status === 'generated' && img.blobUrl)
        );
        if (conceptsWithImages.length === 0) {
            return { content: [{ type: 'text' as const, text: 'Error: No concepts with generated images found. Run generate_ad_image first before publishing.' }] };
        }

        // Helper: POST to Meta Graph API
        const metaPost = async (endpoint: string, body: Record<string, unknown>) => {
            const url = `https://graph.facebook.com/${metaApiVersion}/${endpoint}`;
            const params = new URLSearchParams();
            for (const [key, val] of Object.entries(body)) {
                params.set(key, typeof val === 'string' ? val : JSON.stringify(val));
            }
            params.set('access_token', accessToken);
            const res = await fetch(url, { method: 'POST', body: params });
            const data = await res.json() as { id?: string; error?: { message: string; code?: number } };
            if (data.error) throw new Error(`Meta API [${endpoint}]: ${data.error.message}`);
            if (!data.id) throw new Error(`Meta API [${endpoint}]: no ID returned`);
            return data as { id: string };
        };

        // 8. Create Campaign (PAUSED)
        const startDateStr = start_date ?? new Date().toISOString().slice(0, 10);
        const campaignName = `${project.name}_${objective.replace('OUTCOME_', '')}_${startDateStr}`;
        const campaign = await metaPost(`act_${adAccountId}/campaigns`, {
            name: campaignName,
            objective,
            status: 'PAUSED',
            special_ad_categories: [],
        });
        const campaignId = campaign.id;

        // 9. Create Ad Set (PAUSED)
        const targeting: Record<string, unknown> = {
            geo_locations: geoLocations,
            publisher_platforms: publisherPlatforms,
            ...(facebookPositions.length > 0 && { facebook_positions: facebookPositions }),
            ...(instagramPositions.length > 0 && { instagram_positions: instagramPositions }),
            ...(interestIds.length > 0 && { interests: interestIds }),
        };

        const adSet = await metaPost(`act_${adAccountId}/adsets`, {
            name: `${project.name}_AdSet_${startDateStr}`,
            campaign_id: campaignId,
            daily_budget: dailyBudgetCents,
            optimization_goal: 'LINK_CLICKS',
            billing_event: 'IMPRESSIONS',
            targeting,
            start_time: startDateStr,
            status: 'PAUSED',
        });
        const adSetId = adSet.id;

        // Store campaign + ad set IDs on project
        await db.update(schema.projects)
            .set({ metaCampaignId: campaignId, metaAdSetId: adSetId })
            .where(eq(schema.projects.id, project_id));

        // 10. CTA text → Meta CTA type mapping
        const ctaTypeMap: Record<string, string> = {
            'sign up': 'SIGN_UP',
            'join waitlist': 'SIGN_UP',
            'join the waitlist': 'SIGN_UP',
            'get started': 'SIGN_UP',
            'learn more': 'LEARN_MORE',
            'shop now': 'SHOP_NOW',
            'buy now': 'BUY_NOW',
            'order now': 'ORDER_NOW',
            'download': 'DOWNLOAD',
            'install now': 'INSTALL_MOBILE_APP',
            'subscribe': 'SUBSCRIBE',
            'contact us': 'CONTACT_US',
            'apply now': 'APPLY_NOW',
            'book now': 'BOOK_TRAVEL',
        };

        const destinationUrl = intake?.link && !/^none/i.test(intake.link.trim())
            ? intake.link.trim()
            : 'https://example.com';

        // 10. For each concept that has a generated image: upload → creative → ad
        const adResults: Array<{
            concept_id: string;
            angle_name: string;
            ad_id: string;
            creative_id: string;
            error?: string;
        }> = [];

        for (const concept of conceptsWithImages) {
            const image = concept.images
                .filter(img => img.status === 'generated' && img.blobUrl)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

            try {
                // a. Fetch image bytes from Vercel Blob
                const imgRes = await fetch(image.blobUrl!);
                if (!imgRes.ok) throw new Error(`Failed to fetch image from Blob: ${image.blobUrl}`);
                const imgBuffer = await imgRes.arrayBuffer();
                const imgBase64 = Buffer.from(imgBuffer).toString('base64');

                // b. Upload image to Meta adimages
                const uploadUrl = `https://graph.facebook.com/${metaApiVersion}/act_${adAccountId}/adimages`;
                const uploadParams = new URLSearchParams();
                uploadParams.set('bytes', imgBase64);
                uploadParams.set('access_token', accessToken);
                const uploadRes = await fetch(uploadUrl, { method: 'POST', body: uploadParams });
                const uploadData = await uploadRes.json() as {
                    images?: Record<string, { hash: string; url: string }>;
                    error?: { message: string };
                };
                if (uploadData.error) throw new Error(`Image upload: ${uploadData.error.message}`);
                const imageHash = Object.values(uploadData.images ?? {})[0]?.hash;
                if (!imageHash) throw new Error('No image hash returned from Meta adimages upload');

                // c. Create Ad Creative
                const ctaKey = concept.cta.toLowerCase().trim();
                const ctaType = ctaTypeMap[ctaKey] ?? 'LEARN_MORE';

                const creative = await metaPost(`act_${adAccountId}/adcreatives`, {
                    name: `${concept.angleName}_Creative`,
                    object_story_spec: {
                        page_id: pageId,
                        link_data: {
                            message: concept.bodyCopy,
                            link: destinationUrl,
                            name: concept.headline,
                            image_hash: imageHash,
                            call_to_action: {
                                type: ctaType,
                                value: { link: destinationUrl },
                            },
                        },
                    },
                });
                const creativeId = creative.id;

                // d. Create Ad (PAUSED)
                const ad = await metaPost(`act_${adAccountId}/ads`, {
                    name: `${concept.angleName}_Ad`,
                    adset_id: adSetId,
                    creative: { creative_id: creativeId },
                    status: 'PAUSED',
                });
                const adId = ad.id;

                // e. Store Meta IDs on the concept row
                await db.update(schema.adConcepts)
                    .set({ metaAdId: adId, metaCreativeId: creativeId })
                    .where(eq(schema.adConcepts.id, concept.id));

                adResults.push({ concept_id: concept.id, angle_name: concept.angleName, ad_id: adId, creative_id: creativeId });
            } catch (err) {
                adResults.push({
                    concept_id: concept.id,
                    angle_name: concept.angleName,
                    ad_id: '',
                    creative_id: '',
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        const successCount = adResults.filter(a => !a.error).length;
        const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${campaignId}`;

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    success: true,
                    status: 'PAUSED',
                    campaign_id: campaignId,
                    campaign_name: campaignName,
                    ad_set_id: adSetId,
                    daily_budget_usd: budgetUsd,
                    ads_created: successCount,
                    ads_failed: adResults.length - successCount,
                    ads: adResults,
                    interests_mapped: interestIds,
                    ads_manager_url: adsManagerUrl,
                    next_step: 'All ads are PAUSED. Review in Ads Manager, then call activate_campaign to go live.',
                }, null, 2),
            }],
        };
    }
);

// ── Tool: activate_campaign ────────────────────────────────────────────
server.tool(
    'activate_campaign',
    'Activate a previously published (PAUSED) Meta campaign. Sets the campaign, ad set, and all ads to ACTIVE so they start delivering.',
    {
        project_id: z.string().uuid().describe('Project UUID whose campaign to activate'),
    },
    async ({ project_id }) => {
        const accessToken = process.env.META_ACCESS_TOKEN;
        const adAccountId = process.env.META_AD_ACCOUNT_ID;
        const metaApiVersion = 'v22.0';

        if (!accessToken || !adAccountId) {
            return { content: [{ type: 'text' as const, text: 'Error: META_ACCESS_TOKEN and META_AD_ACCOUNT_ID env vars are required' }] };
        }

        const project = await db.query.projects.findFirst({
            where: eq(schema.projects.id, project_id),
            with: {
                adConcepts: {
                    columns: { id: true, angleName: true, metaAdId: true },
                },
            },
        });

        if (!project) {
            return { content: [{ type: 'text' as const, text: `Error: Project not found: ${project_id}` }] };
        }

        if (!project.metaCampaignId || !project.metaAdSetId) {
            return { content: [{ type: 'text' as const, text: 'Error: No Meta campaign found for this project. Run publish_campaign first.' }] };
        }

        // Helper: set status on a Meta object
        const setStatus = async (id: string, status: string): Promise<void> => {
            const url = `https://graph.facebook.com/${metaApiVersion}/${id}`;
            const params = new URLSearchParams({ status, access_token: accessToken });
            const res = await fetch(url, { method: 'POST', body: params });
            const data = await res.json() as { success?: boolean; error?: { message: string } };
            if (data.error) throw new Error(`Failed to activate ${id}: ${data.error.message}`);
        };

        await setStatus(project.metaCampaignId, 'ACTIVE');
        await setStatus(project.metaAdSetId, 'ACTIVE');

        const activatedAds: string[] = [];
        for (const concept of project.adConcepts) {
            if (concept.metaAdId) {
                await setStatus(concept.metaAdId, 'ACTIVE');
                activatedAds.push(concept.metaAdId);
            }
        }

        const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${adAccountId}&selected_campaign_ids=${project.metaCampaignId}`;

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    activated: true,
                    campaign_id: project.metaCampaignId,
                    ad_set_id: project.metaAdSetId,
                    ads_activated: activatedAds.length,
                    ads_manager_url: adsManagerUrl,
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
