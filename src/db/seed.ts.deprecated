/**
 * Seed script — inserts funnel configs into the database.
 *
 * Usage:  npx tsx src/db/seed.ts
 * Requires: DATABASE_URL in .env.local
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { maternalFetalFunnel } from '../funnels/maternal-fetal';
import { maternalFetalFunnel399 } from '../funnels/maternal-fetal-399';
import type { FunnelConfig, FunnelStep } from '../types/funnel';
import { funnels, funnelSteps } from './schema';

// Load .env.local (Next.js convention)
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/**
 * Extract the type-specific config from a step (everything except base fields).
 */
function extractStepConfig(step: FunnelStep): Record<string, unknown> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, type, showIf, background, animation, ...config } = step;
    // Include background and animation in config if present
    return {
        ...config,
        ...(background ? { background } : {}),
        ...(animation ? { animation } : {}),
    };
}

async function seedFunnel(funnel: FunnelConfig) {
    console.log(`Seeding funnel: ${funnel.name} (${funnel.id})...`);

    // Insert funnel
    const [insertedFunnel] = await db
        .insert(funnels)
        .values({
            slug: funnel.id,
            name: funnel.name,
            version: funnel.version ?? null,
            priceVariant: funnel.priceVariant ?? null,
            theme: funnel.theme,
            tracking: funnel.tracking ?? null,
            meta: funnel.meta ?? null,
        })
        .onConflictDoUpdate({
            target: funnels.slug,
            set: {
                name: funnel.name,
                version: funnel.version ?? null,
                priceVariant: funnel.priceVariant ?? null,
                theme: funnel.theme,
                tracking: funnel.tracking ?? null,
                meta: funnel.meta ?? null,
            },
        })
        .returning();

    // Insert steps
    for (let i = 0; i < funnel.steps.length; i++) {
        const step = funnel.steps[i];
        await db
            .insert(funnelSteps)
            .values({
                funnelId: insertedFunnel.id,
                sortOrder: i,
                stepId: step.id,
                type: step.type,
                config: extractStepConfig(step),
                showIf: step.showIf ?? null,
            })
            .onConflictDoNothing(); // Skip if already exists
    }

    console.log(`  ✓ Inserted ${funnel.steps.length} steps`);
}

async function main() {
    console.log('🌱 Seeding database...\n');

    await seedFunnel(maternalFetalFunnel399);
    await seedFunnel(maternalFetalFunnel);

    console.log('\n✅ Done!');
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
