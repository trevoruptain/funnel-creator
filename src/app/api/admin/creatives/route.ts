import { db } from '@/db';
import { adImages, projects } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const projectFilter = searchParams.get('project') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 12;
    const offset = (page - 1) * pageSize;

    // Get all projects for filter
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

    // Get images with concept and project data
    const allImagesForCount = await db.query.adImages.findMany({
        with: {
            adConcept: {
                with: { project: true },
            },
        },
        orderBy: [desc(adImages.createdAt)],
    });

    // Apply project filter if specified
    const filteredImages = projectFilter
        ? allImagesForCount.filter(img => img.adConcept.project.id === projectFilter)
        : allImagesForCount;

    // Paginate
    const paginatedImages = filteredImages.slice(offset, offset + pageSize);

    const totalPages = Math.ceil(filteredImages.length / pageSize);

    return NextResponse.json({
        projects: allProjects.map(p => ({ id: p.id, name: p.name })),
        images: paginatedImages,
        totalPages,
    });
}
