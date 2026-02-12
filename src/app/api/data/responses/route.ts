import { db } from '@/db';
import { funnels, responses, sessions } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/data/responses
 *
 * Returns a flat table of every response — one row per (session, step) pair.
 * Perfect for importing into a spreadsheet or BI tool.
 *
 * Query params:
 *   funnel    — filter by funnel slug
 *   step      — filter by step_id (e.g. "pregnancy-status")
 *   from      — ISO date, responses created on or after
 *   to        — ISO date, responses created on or before
 *   limit     — max rows (default: 500, max: 5000)
 *   offset    — pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const funnelSlug = searchParams.get('funnel');
        const stepFilter = searchParams.get('step');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 5000);
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build conditions
        const conditions = [];

        if (funnelSlug) {
            const funnel = await db.query.funnels.findFirst({
                where: eq(funnels.slug, funnelSlug),
            });
            if (!funnel) {
                return NextResponse.json({ error: `Funnel not found: ${funnelSlug}` }, { status: 404 });
            }
            conditions.push(eq(sessions.funnelId, funnel.id));
        }

        if (stepFilter) {
            conditions.push(eq(responses.stepId, stepFilter));
        }

        if (from) {
            conditions.push(gte(responses.createdAt, new Date(from)));
        }
        if (to) {
            conditions.push(lte(responses.createdAt, new Date(to)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [{ count: totalCount }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(responses)
            .innerJoin(sessions, eq(responses.sessionId, sessions.id))
            .where(whereClause);

        // Get flat response rows with session info
        const rows = await db
            .select({
                session_token: sessions.sessionToken,
                email: sessions.email,
                step_id: responses.stepId,
                value: responses.value,
                responded_at: responses.createdAt,
                session_started_at: sessions.startedAt,
                session_completed_at: sessions.completedAt,
                ip: sessions.ip,
                utm_params: sessions.utmParams,
            })
            .from(responses)
            .innerJoin(sessions, eq(responses.sessionId, sessions.id))
            .where(whereClause)
            .orderBy(desc(responses.createdAt))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            total: Number(totalCount),
            limit,
            offset,
            count: rows.length,
            responses: rows,
        });
    } catch (error) {
        console.error('Data API - responses error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
