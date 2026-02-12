import { config } from 'dotenv';
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Load .env.local (Next.js convention, not auto-loaded by drizzle-kit)
config({ path: '.env.local' });

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
