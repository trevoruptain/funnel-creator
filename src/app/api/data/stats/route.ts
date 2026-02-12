import { db } from '@/db';
import { funnels, responses, sessions, stepViews } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/data/stats
 *
 * Aggregated funnel metrics for dashboards and visualizations.
 *
 * Query params:
 *   funnel    — filter by funnel slug (required)
 *   from      — ISO date, sessions started on or after
 *   to        — ISO date, sessions started on or before
 *
 * Returns:
 *   - overview: total sessions, completions, completion rate, unique emails
 *   - step_drop_off: how many people viewed / answered each step
 *   - answer_distributions: for each question step, count of each answer value
 */
export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const funnelSlug = searchParams.get('funnel');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!funnelSlug) {
            return NextResponse.json(
                { error: 'The "funnel" query parameter is required (e.g. ?funnel=maternal-fetal-399-v1)' },
                { status: 400 }
            );
        }

        const funnel = await db.query.funnels.findFirst({
            where: eq(funnels.slug, funnelSlug),
        });

        if (!funnel) {
            return NextResponse.json({ error: `Funnel not found: ${funnelSlug}` }, { status: 404 });
        }

        // Date conditions on sessions
        const sessionConditions = [eq(sessions.funnelId, funnel.id)];
        if (from) sessionConditions.push(gte(sessions.startedAt, new Date(from)));
        if (to) sessionConditions.push(lte(sessions.startedAt, new Date(to)));
        const sessionWhere = and(...sessionConditions);

        // ── 1. Overview ──────────────────────────────────────────────
        const [overview] = await db
            .select({
                total_sessions: sql<number>`count(*)`,
                completed_sessions: sql<number>`count(${sessions.completedAt})`,
                unique_emails: sql<number>`count(distinct ${sessions.email})`,
                first_session: sql<string>`min(${sessions.startedAt})`,
                last_session: sql<string>`max(${sessions.startedAt})`,
            })
            .from(sessions)
            .where(sessionWhere);

        const totalSessions = Number(overview.total_sessions);
        const completedSessions = Number(overview.completed_sessions);

        // ── 2. Step drop-off ─────────────────────────────────────────
        // For each step: how many unique sessions viewed it, how many answered it
        const viewCounts = await db
            .select({
                step_id: stepViews.stepId,
                step_type: stepViews.stepType,
                views: sql<number>`count(distinct ${stepViews.sessionId})`,
            })
            .from(stepViews)
            .innerJoin(sessions, eq(stepViews.sessionId, sessions.id))
            .where(sessionWhere)
            .groupBy(stepViews.stepId, stepViews.stepType);

        const responseCounts = await db
            .select({
                step_id: responses.stepId,
                answers: sql<number>`count(distinct ${responses.sessionId})`,
            })
            .from(responses)
            .innerJoin(sessions, eq(responses.sessionId, sessions.id))
            .where(sessionWhere)
            .groupBy(responses.stepId);

        const responseCountMap = Object.fromEntries(
            responseCounts.map((r) => [r.step_id, Number(r.answers)])
        );

        // Get step ordering from funnel_steps
        const funnelStepsList = await db.query.funnelSteps.findMany({
            where: eq(sessions.funnelId, funnel.id),
            orderBy: (funnelSteps, { asc }) => [asc(funnelSteps.sortOrder)],
            columns: { stepId: true, type: true, sortOrder: true },
        });

        const viewCountMap = Object.fromEntries(
            viewCounts.map((v) => [v.step_id, { views: Number(v.views), type: v.step_type }])
        );

        const stepDropOff = funnelStepsList.map((step) => ({
            step_id: step.stepId,
            step_type: step.type,
            sort_order: step.sortOrder,
            views: viewCountMap[step.stepId]?.views ?? 0,
            answers: responseCountMap[step.stepId] ?? 0,
            drop_off_rate: viewCountMap[step.stepId]?.views
                ? 1 - ((responseCountMap[step.stepId] ?? 0) / viewCountMap[step.stepId].views)
                : null,
        }));

        // ── 3. Answer distributions ──────────────────────────────────
        const answerDist = await db
            .select({
                step_id: responses.stepId,
                value: responses.value,
                count: sql<number>`count(*)`,
            })
            .from(responses)
            .innerJoin(sessions, eq(responses.sessionId, sessions.id))
            .where(sessionWhere)
            .groupBy(responses.stepId, responses.value);

        // Group by step_id
        const distributions: Record<string, { value: unknown; count: number }[]> = {};
        for (const row of answerDist) {
            if (!distributions[row.step_id]) {
                distributions[row.step_id] = [];
            }
            distributions[row.step_id].push({
                value: row.value,
                count: Number(row.count),
            });
        }

        // Sort each step's answers by count descending
        for (const stepId of Object.keys(distributions)) {
            distributions[stepId].sort((a, b) => b.count - a.count);
        }

        return NextResponse.json({
            funnel: {
                slug: funnel.slug,
                name: funnel.name,
                price_variant: funnel.priceVariant,
            },
            date_range: {
                from: from ?? overview.first_session,
                to: to ?? overview.last_session,
            },
            overview: {
                total_sessions: totalSessions,
                completed_sessions: completedSessions,
                completion_rate: totalSessions > 0 ? completedSessions / totalSessions : 0,
                unique_emails: Number(overview.unique_emails),
            },
            step_drop_off: stepDropOff,
            answer_distributions: distributions,
        });
    } catch (error) {
        console.error('Data API - stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
