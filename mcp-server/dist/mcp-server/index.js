"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.local' });
// Ensure Vertex AI only — never fall back to Gemini API key
delete process.env.GOOGLE_API_KEY;
delete process.env.GEMINI_API_KEY;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const serverless_1 = require("@neondatabase/serverless");
const blob_1 = require("@vercel/blob");
const drizzle_orm_1 = require("drizzle-orm");
const neon_http_1 = require("drizzle-orm/neon-http");
const zod_1 = require("zod");
const schema = __importStar(require("../src/db/schema.js"));
const constants_js_1 = require("./constants.js");
// ── Setup ────────────────────────────────────────────────────────────
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
const db = (0, neon_http_1.drizzle)(sql, { schema });
const ai = new genai_1.GoogleGenAI({
    vertexai: true,
    project: (_a = process.env.GOOGLE_CLOUD_PROJECT) !== null && _a !== void 0 ? _a : 'armen-pbu',
    location: (_b = process.env.GOOGLE_CLOUD_LOCATION) !== null && _b !== void 0 ? _b : 'global',
});
const server = new mcp_js_1.McpServer({
    name: 'funnel-creator',
    version: '1.0.0',
});
// ── Helpers ──────────────────────────────────────────────────────────
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}
// ── Tool: create_project ─────────────────────────────────────────────
server.tool('create_project', 'Create a new ad project from intake data. Returns the project ID and slug.', {
    name: zod_1.z.string().describe('Project name (e.g. "Aurora Smart Mirror")'),
    product_description: zod_1.z.string().describe('What the product is (from Q1)'),
    target_audience: zod_1.z.string().describe('Who it is for (from Q2)'),
    intake: zod_1.z.object({
        product: zod_1.z.string(),
        audience: zod_1.z.string(),
        objective: zod_1.z.string(),
        link: zod_1.z.string(),
        has_logo: zod_1.z.string(),
        brand_colors: zod_1.z.string(),
        references: zod_1.z.string(),
        budget: zod_1.z.string(),
        placements: zod_1.z.string(),
        geography: zod_1.z.string(),
    }).describe('All 10 intake answers'),
    inferred: zod_1.z.object({
        audience_profile: zod_1.z.any(),
        targeting_strategy: zod_1.z.any(),
        brand_tone: zod_1.z.any(),
    }).describe('Inferred audience analysis from Step 2'),
}, async ({ name, product_description, target_audience, intake, inferred }) => {
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
                type: 'text',
                text: JSON.stringify({ project_id: project.id, slug: project.slug }, null, 2),
            }],
    };
});
// ── Tool: add_ad_concepts ────────────────────────────────────────────
server.tool('add_ad_concepts', 'Add ad concepts to a project. Returns the created concept IDs.', {
    project_id: zod_1.z.string().uuid().describe('Project UUID'),
    concepts: zod_1.z.array(zod_1.z.object({
        angle_name: zod_1.z.string(),
        angle: zod_1.z.string(),
        headline: zod_1.z.string(),
        body_copy: zod_1.z.string(),
        cta: zod_1.z.string(),
        visual_direction: zod_1.z.string(),
        image_prompt: zod_1.z.string().describe('Detailed image generation prompt for Gemini'),
        why_this_works: zod_1.z.string().optional(),
    })).describe('Array of ad concepts to add'),
}, async ({ project_id, concepts }) => {
    const rows = concepts.map((c, i) => {
        var _a;
        return ({
            projectId: project_id,
            sortOrder: i,
            angleName: c.angle_name,
            angle: c.angle,
            headline: c.headline,
            bodyCopy: c.body_copy,
            cta: c.cta,
            visualDirection: c.visual_direction,
            imagePrompt: c.image_prompt,
            whyThisWorks: (_a = c.why_this_works) !== null && _a !== void 0 ? _a : null,
            status: 'draft',
        });
    });
    const inserted = await db.insert(schema.adConcepts).values(rows)
        .returning({ id: schema.adConcepts.id, angleName: schema.adConcepts.angleName });
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    created: inserted.length,
                    concepts: inserted,
                }, null, 2),
            }],
    };
});
// ── Tool: generate_ad_design ───────────────────────────────────────────
server.tool('generate_ad_design', 'Generate structured design JSON for an ad creative using Gemini. All images are 9:16 aspect ratio.', {
    ad_concept_id: zod_1.z.string().uuid().describe('Ad concept UUID to generate design for'),
}, async ({ ad_concept_id }) => {
    // 1. Get concept + project for context
    const concept = await db.query.adConcepts.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.adConcepts.id, ad_concept_id),
        with: { project: true },
    });
    if (!concept) {
        return { content: [{ type: 'text', text: 'Error: Concept not found' }] };
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
        model: constants_js_1.GEMINI_MODELS.TEXT,
        contents: designPrompt,
        config: {
            responseSchema: designSchema,
            responseMimeType: 'application/json',
        },
    });
    if (!response.text) {
        return { content: [{ type: 'text', text: 'Error: Gemini did not return design JSON.' }] };
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
                type: 'text',
                text: JSON.stringify({ image_id: image.id, design: designJson }, null, 2),
            }],
    };
});
// ── Tool: generate_ad_image ──────────────────────────────────────────
server.tool('generate_ad_image', 'Generate ad image from design JSON using Gemini 3 Pro. Must call generate_ad_design first. Always generates 9:16 aspect ratio.', {
    image_id: zod_1.z.string().uuid().describe('Image ID from generate_ad_design'),
}, async ({ image_id }) => {
    var _a, _b, _c, _d, _e;
    // 1. Get image record with design JSON
    const image = await db.query.adImages.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.adImages.id, image_id),
        with: {
            adConcept: {
                with: { project: { columns: { slug: true } } },
            },
        },
    });
    if (!image) {
        return { content: [{ type: 'text', text: 'Error: Image not found' }] };
    }
    if (!image.designJson) {
        return { content: [{ type: 'text', text: 'Error: Image must have design JSON. Call generate_ad_design first.' }] };
    }
    // 2. Build enhanced prompt from design JSON
    const design = image.designJson;
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
${design.textOverlays.map((t, i) => `${i + 1}. "${t.text}" — ${t.position}, ${t.style}`).join('\n')}

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
        model: constants_js_1.GEMINI_MODELS.IMAGE,
        contents: enhancedPrompt,
    });
    const imagePart = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.find((p) => p.inlineData);
    if (!((_e = imagePart === null || imagePart === void 0 ? void 0 : imagePart.inlineData) === null || _e === void 0 ? void 0 : _e.data)) {
        // Update as failed
        await db.update(schema.adImages)
            .set({ status: 'failed', prompt: enhancedPrompt })
            .where((0, drizzle_orm_1.eq)(schema.adImages.id, image_id));
        return { content: [{ type: 'text', text: 'Error: Gemini did not return an image.' }] };
    }
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    // 4. Upload to Vercel Blob
    const pathname = `ads/${concept.project.slug}/${image_id}-${Date.now()}.png`;
    const blob = await (0, blob_1.put)(pathname, buffer, {
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
        generationParams: { aspectRatio: '9:16', model: constants_js_1.GEMINI_MODELS.IMAGE },
    })
        .where((0, drizzle_orm_1.eq)(schema.adImages.id, image_id));
    // 6. Update concept status
    await db.update(schema.adConcepts)
        .set({ status: 'generated' })
        .where((0, drizzle_orm_1.eq)(schema.adConcepts.id, concept.id));
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    image_id,
                    blob_url: blob.url,
                    pathname,
                    design: design,
                }, null, 2),
            }],
    };
});
// ── Tool: get_project ────────────────────────────────────────────────
server.tool('get_project', 'Get a project with all its ad concepts and images.', {
    project_id: zod_1.z.string().uuid().optional().describe('Project UUID'),
    slug: zod_1.z.string().optional().describe('Project slug'),
}, async ({ project_id, slug }) => {
    const where = project_id
        ? (0, drizzle_orm_1.eq)(schema.projects.id, project_id)
        : slug
            ? (0, drizzle_orm_1.eq)(schema.projects.slug, slug)
            : undefined;
    if (!where) {
        return { content: [{ type: 'text', text: 'Error: Provide project_id or slug' }] };
    }
    const project = await db.query.projects.findFirst({
        where,
        with: {
            adConcepts: {
                orderBy: [(0, drizzle_orm_1.desc)(schema.adConcepts.sortOrder)],
                with: { images: true },
            },
            funnels: {
                columns: { slug: true, name: true },
            },
        },
    });
    if (!project) {
        return { content: [{ type: 'text', text: 'Error: Project not found' }] };
    }
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(project, null, 2),
            }],
    };
});
// ── Tool: list_projects ──────────────────────────────────────────────
server.tool('list_projects', 'List all projects with concept and image counts.', {}, async () => {
    const allProjects = await db.query.projects.findMany({
        orderBy: [(0, drizzle_orm_1.desc)(schema.projects.createdAt)],
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
        generated_images: p.adConcepts.reduce((sum, c) => sum + c.images.filter(i => i.status === 'generated').length, 0),
    }));
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({ total: summary.length, projects: summary }, null, 2),
            }],
    };
});
// ── Tool: refine_ad_design ──────────────────────────────────────────
server.tool('refine_ad_design', 'Refine design JSON based on feedback (e.g., "make it warmer", "more professional")', {
    image_id: zod_1.z.string().uuid().describe('Image ID to refine'),
    feedback: zod_1.z.string().describe('Natural language feedback'),
}, async ({ image_id, feedback }) => {
    const image = await db.query.adImages.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.adImages.id, image_id),
        with: { adConcept: { with: { project: true } } },
    });
    if (!(image === null || image === void 0 ? void 0 : image.designJson)) {
        return { content: [{ type: 'text', text: 'Error: Image or design JSON not found' }] };
    }
    const currentDesign = image.designJson;
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
        model: constants_js_1.GEMINI_MODELS.TEXT,
        contents: refinementPrompt,
        config: {
            responseSchema: designSchema,
            responseMimeType: 'application/json',
        },
    });
    if (!response.text) {
        return { content: [{ type: 'text', text: 'Error: Failed to generate refined design' }] };
    }
    const refinedDesign = JSON.parse(response.text);
    await db.update(schema.adImages)
        .set({ designJson: refinedDesign })
        .where((0, drizzle_orm_1.eq)(schema.adImages.id, image_id));
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    image_id,
                    refined_design: refinedDesign,
                    feedback_applied: feedback,
                }, null, 2),
            }],
    };
});
// ── Tool: regenerate_ad_image ────────────────────────────────────────
server.tool('regenerate_ad_image', 'Regenerate ad image using current (possibly refined) design JSON', {
    image_id: zod_1.z.string().uuid().describe('Image ID to regenerate'),
}, async ({ image_id }) => {
    var _a, _b, _c, _d, _e;
    const image = await db.query.adImages.findFirst({
        where: (0, drizzle_orm_1.eq)(schema.adImages.id, image_id),
        with: { adConcept: { with: { project: { columns: { slug: true } } } } },
    });
    if (!(image === null || image === void 0 ? void 0 : image.designJson)) {
        return { content: [{ type: 'text', text: 'Error: Image or design JSON not found' }] };
    }
    const design = image.designJson;
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
${design.textOverlays.map((t, i) => `${i + 1}. "${t.text}" — ${t.position}, ${t.style}`).join('\n')}

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
        model: constants_js_1.GEMINI_MODELS.IMAGE,
        contents: enhancedPrompt,
    });
    const imagePart = (_d = (_c = (_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.find((p) => p.inlineData);
    if (!((_e = imagePart === null || imagePart === void 0 ? void 0 : imagePart.inlineData) === null || _e === void 0 ? void 0 : _e.data)) {
        await db.update(schema.adImages)
            .set({ status: 'failed', prompt: enhancedPrompt })
            .where((0, drizzle_orm_1.eq)(schema.adImages.id, image_id));
        return { content: [{ type: 'text', text: 'Error: Image generation failed' }] };
    }
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const pathname = `ads/${concept.project.slug}/${image_id}-${Date.now()}.png`;
    const blob = await (0, blob_1.put)(pathname, buffer, {
        access: 'public',
        contentType: 'image/png',
    });
    await db.update(schema.adImages)
        .set({
        prompt: enhancedPrompt,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        status: 'generated',
        generationParams: { aspectRatio: '9:16', model: constants_js_1.GEMINI_MODELS.IMAGE },
    })
        .where((0, drizzle_orm_1.eq)(schema.adImages.id, image_id));
    await db.update(schema.adConcepts)
        .set({ status: 'generated' })
        .where((0, drizzle_orm_1.eq)(schema.adConcepts.id, concept.id));
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    image_id,
                    blob_url: blob.url,
                    pathname,
                }, null, 2),
            }],
    };
});
// ── Start Server ─────────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch(console.error);
