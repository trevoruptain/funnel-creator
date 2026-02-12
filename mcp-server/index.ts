import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { z } from 'zod';
import * as schema from '../src/db/schema.js';

// ── Setup ────────────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

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

// ── Tool: generate_ad_image ──────────────────────────────────────────
server.tool(
    'generate_ad_image',
    'Generate an ad image using Gemini 3 Pro, upload to Vercel Blob, and save to DB. Returns the blob URL.',
    {
        ad_concept_id: z.string().uuid().describe('Ad concept UUID to generate image for'),
        prompt: z.string().describe('Image generation prompt (use the image_prompt from the concept)'),
        aspect_ratio: z.enum(['1:1', '9:16', '4:5', '16:9']).default('1:1')
            .describe('Aspect ratio - 1:1 for feed, 9:16 for stories/reels, 4:5 for portrait feed'),
    },
    async ({ ad_concept_id, prompt, aspect_ratio }) => {
        // 1. Get concept + project for naming
        const concept = await db.query.adConcepts.findFirst({
            where: eq(schema.adConcepts.id, ad_concept_id),
            with: { project: { columns: { slug: true } } },
        });

        if (!concept) {
            return { content: [{ type: 'text' as const, text: 'Error: Concept not found' }] };
        }

        // 2. Generate image with Gemini
        const fullPrompt = `${prompt}\n\nAspect ratio: ${aspect_ratio}. High quality, professional ad creative.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: fullPrompt,
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData
        );

        if (!imagePart?.inlineData?.data) {
            // Save as failed
            await db.insert(schema.adImages).values({
                adConceptId: ad_concept_id,
                prompt: fullPrompt,
                status: 'failed',
                generationParams: { aspect_ratio, model: 'gemini-3-pro-image-preview' },
            });
            return { content: [{ type: 'text' as const, text: 'Error: Gemini did not return an image.' }] };
        }

        const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

        // 3. Upload to Vercel Blob
        const pathname = `ads/${concept.project.slug}/${ad_concept_id}-${Date.now()}.png`;
        const blob = await put(pathname, buffer, {
            access: 'public',
            contentType: 'image/png',
        });

        // 4. Save to DB
        const [image] = await db.insert(schema.adImages).values({
            adConceptId: ad_concept_id,
            prompt: fullPrompt,
            blobUrl: blob.url,
            blobPathname: blob.pathname,
            status: 'generated',
            generationParams: { aspect_ratio, model: 'gemini-3-pro-image-preview' },
        }).returning({ id: schema.adImages.id, blobUrl: schema.adImages.blobUrl });

        // 5. Update concept status
        await db.update(schema.adConcepts)
            .set({ status: 'generated' })
            .where(eq(schema.adConcepts.id, ad_concept_id));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({
                    image_id: image.id,
                    blob_url: image.blobUrl,
                    pathname,
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
        }));

        return {
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ total: summary.length, projects: summary }, null, 2),
            }],
        };
    }
);

// ── Start ────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);
