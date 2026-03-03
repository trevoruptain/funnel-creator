/**
 * One-time migration: add versioning columns to funnels and backfill.
 * Run with: npx tsx scripts/migrate-versioning.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const connection = neon(process.env.DATABASE_URL!);
const db = drizzle(connection);

async function main() {
    console.log('Adding versioning columns...');

    // Add columns as nullable first so backfill can run before NOT NULL
    await db.execute(sql.raw(`
        ALTER TABLE funnels
            ADD COLUMN IF NOT EXISTS base_slug text,
            ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false
    `));

    console.log('Backfilling base_slug (strip -vN suffix)...');
    await db.execute(sql.raw(`
        UPDATE funnels
        SET base_slug = regexp_replace(slug, '-v\\d+$', '')
        WHERE base_slug IS NULL
    `));

    console.log('Backfilling version_number (parse N from -vN suffix)...');
    await db.execute(sql.raw(`
        UPDATE funnels
        SET version_number = COALESCE(
            NULLIF(substring(slug from '-v(\\d+)$'), '')::integer,
            1
        )
    `));

    console.log('Marking all existing funnels as published...');
    await db.execute(sql.raw(`UPDATE funnels SET is_published = true`));

    console.log('Setting base_slug NOT NULL...');
    await db.execute(sql.raw(`ALTER TABLE funnels ALTER COLUMN base_slug SET NOT NULL`));

    console.log('Done! Verifying...');
    const rows = await db.execute(sql.raw(
        `SELECT slug, base_slug, version_number, is_published FROM funnels ORDER BY base_slug, version_number`
    ));
    console.table(rows.rows);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
