/**
 * Test script for ad creative generation with design JSON
 * 
 * Usage: npx tsx mcp-server/test-ad-generation.ts
 */

import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: '.env.local' });

// Vertex AI only — never fall back to Gemini API key
delete process.env.GOOGLE_API_KEY;
delete process.env.GEMINI_API_KEY;

import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
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

async function main() {
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
        model: GEMINI_MODELS.TEXT,
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
${designJson.textOverlays.map((t: any) => `- "${t.text}" (${t.position}, ${t.style})`).join('\n')}

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
        model: GEMINI_MODELS.IMAGE,
        contents: enhancedPrompt,
    });

    const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
        console.error('   ✗ Image generation failed');
        await db.update(schema.adImages)
            .set({ status: 'failed', prompt: enhancedPrompt })
            .where(eq(schema.adImages.id, image.id));
        process.exit(1);
    }

    console.log('   ✓ Image generated');

    // Upload to Vercel Blob
    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
    const pathname = `ads/test/${image.id}-${Date.now()}.png`;

    console.log('   Uploading to Vercel Blob...');
    const blob = await put(pathname, buffer, {
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
            generationParams: { aspectRatio: '9:16', model: GEMINI_MODELS.IMAGE },
        })
        .where(eq(schema.adImages.id, image.id));

    await db.update(schema.adConcepts)
        .set({ status: 'generated' })
        .where(eq(schema.adConcepts.id, concept.id));

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
