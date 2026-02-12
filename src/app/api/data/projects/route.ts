import { db } from '@/db';
import { adConcepts, projects } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';
import { desc, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/data/projects
 *
 * Returns projects with ad concept and image counts.
 *
 * Query params:
 *   slug    — filter by project slug
 *   limit   — max rows (default: 50, max: 200)
 *   offset  — pagination offset
 */
export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const slug = searchParams.get('slug');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
        const offset = parseInt(searchParams.get('offset') || '0');

        if (slug) {
            // Single project with full details
            const project = await db.query.projects.findFirst({
                where: eq(projects.slug, slug),
                with: {
                    adConcepts: {
                        orderBy: [desc(adConcepts.sortOrder)],
                        with: { images: true },
                    },
                    funnels: {
                        columns: { slug: true, name: true },
                    },
                },
            });

            if (!project) {
                return NextResponse.json({ error: `Project not found: ${slug}` }, { status: 404 });
            }

            return NextResponse.json({ project });
        }

        // List all projects with summary counts
        const allProjects = await db.query.projects.findMany({
            orderBy: [desc(projects.createdAt)],
            limit,
            offset,
            with: {
                adConcepts: {
                    columns: { id: true, status: true },
                    with: { images: { columns: { id: true, status: true } } },
                },
            },
        });

        const [{ count: totalCount }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(projects);

        const data = allProjects.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            product_description: p.productDescription,
            created_at: p.createdAt,
            concept_count: p.adConcepts.length,
            image_count: p.adConcepts.reduce((sum, c) => sum + c.images.length, 0),
            generated_images: p.adConcepts.reduce(
                (sum, c) => sum + c.images.filter(i => i.status === 'generated').length, 0
            ),
        }));

        return NextResponse.json({
            total: Number(totalCount),
            limit,
            offset,
            count: data.length,
            projects: data,
        });
    } catch (error) {
        console.error('Data API - projects error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
