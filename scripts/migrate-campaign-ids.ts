/**
 * One-time migration: add Meta campaign ID columns to projects and ad_concepts.
 * Run with: npx tsx scripts/migrate-campaign-ids.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const connection = neon(process.env.DATABASE_URL!);
const db = drizzle(connection);

async function main() {
    console.log('Adding Meta campaign ID columns to projects...');
    await db.execute(sql.raw(`
        ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS meta_campaign_id text,
            ADD COLUMN IF NOT EXISTS meta_ad_set_id text
    `));

    console.log('Adding Meta ad ID columns to ad_concepts...');
    await db.execute(sql.raw(`
        ALTER TABLE ad_concepts
            ADD COLUMN IF NOT EXISTS meta_ad_id text,
            ADD COLUMN IF NOT EXISTS meta_creative_id text
    `));

    console.log('Done! Verifying...');
    const projectCols = await db.execute(sql.raw(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name IN ('meta_campaign_id', 'meta_ad_set_id')
    `));
    const conceptCols = await db.execute(sql.raw(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'ad_concepts' AND column_name IN ('meta_ad_id', 'meta_creative_id')
    `));
    console.log('projects columns:', projectCols.rows);
    console.log('ad_concepts columns:', conceptCols.rows);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
