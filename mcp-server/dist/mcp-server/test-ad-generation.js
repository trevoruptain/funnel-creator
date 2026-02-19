"use strict";
/**
 * Test script for ad creative generation with design JSON
 *
 * Usage: npx tsx mcp-server/test-ad-generation.ts
 */
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
// Vertex AI only — never fall back to Gemini API key
delete process.env.GOOGLE_API_KEY;
delete process.env.GEMINI_API_KEY;
const serverless_1 = require("@neondatabase/serverless");
const blob_1 = require("@vercel/blob");
const drizzle_orm_1 = require("drizzle-orm");
const neon_http_1 = require("drizzle-orm/neon-http");
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
async function main() {
    var _a, _b, _c, _d, _e;
    console.log('🧪 Testing Ad Creative Generation\n');
    // ── Step 1: Create test project ──────────────────────────────────
    console.log('1️⃣  Creating test project...');
    const [project] = await db.insert(schema.projects).values({
        name: 'Test Product',
        slug: `test-product-${Date.now()}`,
        productDescription: 'A smart mirror for pregnancy monitoring',
        targetAudience: 'First-time mothers',
        intake: {
            product: 'Smart pregnancy mirror',
            audience: 'Pregnant women',
            objective: 'signup',
            link: 'https://example.com',
            has_logo: 'no',
            brand_colors: 'purple and pink',
            references: 'modern, minimalist',
            budget: '$2000-10000',
            placements: 'both',
            geography: 'US only',
        },
        inferred: {
            audience_profile: { age: '25-35', lifestage: 'expecting first child' },
            targeting_strategy: { interests: ['pregnancy', 'health'] },
            brand_tone: { voice: 'empowering, trustworthy' },
        },
    }).returning();
    console.log(`   ✓ Project created: ${project.id}`);
    // ── Step 2: Create test ad concept ──────────────────────────────
    console.log('\n2️⃣  Creating test ad concept...');
    const [concept] = await db.insert(schema.adConcepts).values({
        projectId: project.id,
        sortOrder: 0,
        angleName: 'Peace of Mind',
        angle: 'Problem-focused — addresses anxiety between doctor visits',
        headline: "Know Your Baby's Okay. Every Single Day.",
        bodyCopy: 'Between appointments, worry fills the gaps. Aurora gives you real-time health insights.',
        cta: 'Join the Waitlist',
        visualDirection: 'Pregnant woman looking at mirror with calm health metrics displayed',
        imagePrompt: 'A pregnant woman in modern bathroom, soft lighting, elegant health metrics on mirror',
        whyThisWorks: 'Speaks to emotional pain point and positions product as solution',
        status: 'draft',
    }).returning();
    console.log(`   ✓ Concept created: ${concept.id}`);
    // ── Step 3: Generate design JSON ─────────────────────────────────
    console.log('\n3️⃣  Generating design JSON with Gemini...');
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
    const designPrompt = `
You are an expert Meta ad designer. Create a detailed design specification for this ad concept:

PROJECT: ${project.name}
TARGET AUDIENCE: ${project.targetAudience}

CONCEPT:
- Angle: ${concept.angle}
- Headline: ${concept.headline}
- Body Copy: ${concept.bodyCopy}
- CTA: ${concept.cta}
- Visual Direction: ${concept.visualDirection}

Generate a complete design specification including:
- Color palette (purple and pink brand colors)
- Typography choices (modern, readable fonts)
- Layout composition
- Text overlay placements (headline, CTA, etc.)
- Visual style and mood

The design should be optimized for 9:16 aspect ratio (Stories/Reels) and feel premium and engaging.
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
        console.error('   ✗ Gemini did not return design JSON');
        process.exit(1);
    }
    const designJson = JSON.parse(response.text);
    console.log('   ✓ Design JSON generated:');
    console.log('     Colors:', designJson.colors);
    console.log('     Visual Style:', designJson.visualStyle);
    console.log('     Mood:', designJson.mood);
    console.log('     Text Overlays:', designJson.textOverlays.length, 'overlays');
    // Save design JSON to DB
    const [image] = await db.insert(schema.adImages).values({
        adConceptId: concept.id,
        designJson,
        prompt: '',
        status: 'pending',
        generationParams: { aspectRatio: '9:16' },
    }).returning();
    console.log(`   ✓ Design saved to DB: ${image.id}`);
    // ── Step 4: Generate image ───────────────────────────────────────
    console.log('\n4️⃣  Generating 9:16 image with design spec...');
    const enhancedPrompt = `
Create a 9:16 Meta ad creative with the following specifications:

CONCEPT: ${concept.headline}
${concept.visualDirection}

DESIGN SYSTEM:
- Colors: Primary ${designJson.colors.primary}, Secondary ${designJson.colors.secondary}, Accent ${designJson.colors.accent}
- Background: ${designJson.colors.background}
- Visual Style: ${designJson.visualStyle}
- Mood: ${designJson.mood}
- Composition: ${designJson.layout.composition}

TEXT OVERLAYS:
${designJson.textOverlays.map((t) => `- "${t.text}" (${t.position}, ${t.style})`).join('\n')}

REQUIREMENTS:
- Aspect ratio: 9:16
- High quality, professional ad creative
- Include all text overlays as specified
- Match the color palette exactly
- ${designJson.layout.elements.join(', ')}

Style: Photorealistic, premium advertising photography
    `.trim();
    console.log('   Calling Gemini Image Generation...');
    const imageResponse = await ai.models.generateContent({
        model: constants_js_1.GEMINI_MODELS.IMAGE,
        contents: enhancedPrompt,
    });
    const imagePart = (_d = (_c = (_b = (_a = imageResponse.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d.find((p) => p.inlineData);
    if (!((_e = imagePart === null || imagePart === void 0 ? void 0 : imagePart.inlineData) === null || _e === void 0 ? void 0 : _e.data)) {
        console.error('   ✗ Image generation failed');
        await db.update(schema.adImages)
            .set({ status: 'failed', prompt: enhancedPrompt })
            .where((0, drizzle_orm_1.eq)(schema.adImages.id, image.id));
        process.exit(1);
    }
    console.log('   ✓ Image generated');
    // Upload to Vercel Blob
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const pathname = `ads/test/${image.id}-${Date.now()}.png`;
    console.log('   Uploading to Vercel Blob...');
    const blob = await (0, blob_1.put)(pathname, buffer, {
        access: 'public',
        contentType: 'image/png',
    });
    console.log(`   ✓ Uploaded to Blob`);
    // Update DB
    await db.update(schema.adImages)
        .set({
        prompt: enhancedPrompt,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        status: 'generated',
        generationParams: { aspectRatio: '9:16', model: constants_js_1.GEMINI_MODELS.IMAGE },
    })
        .where((0, drizzle_orm_1.eq)(schema.adImages.id, image.id));
    await db.update(schema.adConcepts)
        .set({ status: 'generated' })
        .where((0, drizzle_orm_1.eq)(schema.adConcepts.id, concept.id));
    console.log('   ✓ Database updated');
    // ── Summary ──────────────────────────────────────────────────────
    console.log('\n✅ Test Complete!\n');
    console.log('📋 Results:');
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Concept ID: ${concept.id}`);
    console.log(`   Image ID: ${image.id}`);
    console.log(`   Blob URL: ${blob.url}`);
    console.log('\n🖼️  View your generated ad creative:');
    console.log(`   ${blob.url}\n`);
}
main().catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
