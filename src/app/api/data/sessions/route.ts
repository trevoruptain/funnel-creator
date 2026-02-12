import { db } from '@/db';
import { funnels, sessions } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';
import { and, desc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/data/sessions
 *
 * Returns session-level data for the data team.
 *
 * Query params:
 *   funnel    — filter by funnel slug (e.g. "maternal-fetal-399-v1")
 *   status    — "completed" | "incomplete" | "all" (default: "all")
 *   from      — ISO date string, sessions started on or after
 *   to        — ISO date string, sessions started on or before
 *   limit     — max rows (default: 200, max: 1000)
 *   offset    — pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const funnelSlug = searchParams.get('funnel');
        const status = searchParams.get('status') || 'all';
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build where conditions
        const conditions = [];

        if (funnelSlug) {
            const funnel = await db.query.funnels.findFirst({
                where: eq(funnels.slug, funnelSlug),
            });
            if (funnel) {
                conditions.push(eq(sessions.funnelId, funnel.id));
            } else {
                return NextResponse.json({ error: `Funnel not found: ${funnelSlug}` }, { status: 404 });
            }
        }

        if (status === 'completed') {
            conditions.push(isNotNull(sessions.completedAt));
        } else if (status === 'incomplete') {
            conditions.push(sql`${sessions.completedAt} IS NULL`);
        }

        if (from) {
            conditions.push(gte(sessions.startedAt, new Date(from)));
        }
        if (to) {
            conditions.push(lte(sessions.startedAt, new Date(to)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [{ count: totalCount }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sessions)
            .where(whereClause);

        // Get sessions
        const results = await db.query.sessions.findMany({
            where: whereClause,
            orderBy: [desc(sessions.startedAt)],
            limit,
            offset,
            with: {
                funnel: {
                    columns: { slug: true, name: true, priceVariant: true },
                },
            },
        });

        const data = results.map((s) => ({
            session_id: s.sessionToken,
            funnel_slug: s.funnel.slug,
            funnel_name: s.funnel.name,
            price_variant: s.funnel.priceVariant,
            email: s.email,
            ip: s.ip,
            user_agent: s.userAgent,
            utm_params: s.utmParams,
            started_at: s.startedAt,
            completed_at: s.completedAt,
            is_completed: !!s.completedAt,
        }));

        return NextResponse.json({
            total: Number(totalCount),
            limit,
            offset,
            count: data.length,
            sessions: data,
        });
    } catch (error) {
        console.error('Data API - sessions error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
