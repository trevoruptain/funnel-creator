import { db } from '@/db';
import { funnelSteps, funnels } from '@/db/schema';
import type { FunnelConfig } from '@/types/funnel';
import { asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        // Query funnel with all its steps
        const funnel = await db.query.funnels.findFirst({
            where: eq(funnels.slug, slug),
            with: {
                steps: {
                    orderBy: [asc(funnelSteps.sortOrder)],
                },
            },
        });

        if (!funnel) {
            return NextResponse.json(
                { error: `Funnel not found: ${slug}` },
                { status: 404 }
            );
        }

        // Transform database records into FunnelConfig format
        const config: FunnelConfig = {
            id: funnel.slug,
            name: funnel.name,
            version: funnel.version ?? undefined,
            priceVariant: funnel.priceVariant ?? undefined,
            theme: funnel.theme as FunnelConfig['theme'],
            steps: funnel.steps.map((step) => {
                const config = step.config as Record<string, unknown>;
                return {
                    id: step.stepId,
                    type: step.type,
                    showIf: step.showIf ?? undefined,
                    ...config,
                };
            }) as FunnelConfig['steps'],
            meta: funnel.meta as FunnelConfig['meta'],
            tracking: funnel.tracking as FunnelConfig['tracking'],
        };

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error loading funnel:', error);
        return NextResponse.json(
            { error: 'Failed to load funnel' },
            { status: 500 }
        );
    }
}
