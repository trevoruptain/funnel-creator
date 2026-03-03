import { db } from '@/db';
import { funnelSteps, responses, sessions, stepViews } from '@/db/schema';
import { validateApiKey } from '@/lib/auth';
import { resolveFunnel } from '@/lib/resolve-funnel';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/data/stats
 *
 * Aggregated funnel metrics for dashboards and visualizations.
 *
 * Query params:
 *   funnel    — funnel base slug or versioned slug (required)
 *               e.g. "aurora-399" (all versions) or "aurora-399-v2" (specific version)
 *   version   — optional version number to filter to a specific version
 *               e.g. version=1 with funnel=aurora-399 returns only v1 data
 *               ignored when funnel is already a versioned slug (aurora-399-v2)
 *   from      — ISO date, sessions started on or after (optional)
 *   to        — ISO date, sessions started on or before (optional)
 *
 * Version resolution rules:
 *   funnel=aurora-399             → aggregate across ALL versions
 *   funnel=aurora-399&version=1   → only v1
 *   funnel=aurora-399-v2          → only v2 (exact slug, version param ignored)
 *
 * Returns:
 *   - funnel: metadata including base_slug, versions_included, is_aggregated
 *   - overview: total sessions, completions, completion rate, unique emails
 *   - step_drop_off: how many people viewed / answered each step
 *   - answer_distributions: for each question step, count of each answer value
 */
export async function GET(request: NextRequest) {
    const authError = validateApiKey(request);
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const funnelParam = searchParams.get('funnel');
        const versionParam = searchParams.get('version');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!funnelParam) {
            return NextResponse.json(
                {
                    error: 'The "funnel" query parameter is required',
                    examples: [
                        '?funnel=aurora-399              (all versions, aggregated)',
                        '?funnel=aurora-399&version=1    (v1 only)',
                        '?funnel=aurora-399-v2           (v2 only, exact slug)',
                    ],
                },
                { status: 400 }
            );
        }

        const resolution = await resolveFunnel(funnelParam, versionParam);
        if (!resolution) {
            return NextResponse.json({ error: `Funnel not found: ${funnelParam}` }, { status: 404 });
        }

        const { funnelIds, stepFunnel, targetFunnels, isAggregated } = resolution;

        // Date conditions on sessions
        const sessionConditions = [
            funnelIds.length === 1
                ? eq(sessions.funnelId, funnelIds[0])
                : inArray(sessions.funnelId, funnelIds),
        ];
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

        // Use published/latest version's step list for step ordering
        const funnelStepsList = await db.query.funnelSteps.findMany({
            where: eq(funnelSteps.funnelId, stepFunnel.id),
            orderBy: (fs, { asc }) => [asc(fs.sortOrder)],
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

        const distributions: Record<string, { value: unknown; count: number }[]> = {};
        for (const row of answerDist) {
            if (!distributions[row.step_id]) {
                distributions[row.step_id] = [];
            }
            distributions[row.step_id].push({ value: row.value, count: Number(row.count) });
        }
        for (const stepId of Object.keys(distributions)) {
            distributions[stepId].sort((a, b) => b.count - a.count);
        }

        return NextResponse.json({
            funnel: {
                base_slug: stepFunnel.baseSlug,
                name: stepFunnel.name,
                price_variant: stepFunnel.priceVariant,
                is_aggregated: isAggregated,
                versions_included: targetFunnels.map((f) => f.versionNumber),
                // Single-version fields (null when aggregating across versions)
                slug: isAggregated ? null : stepFunnel.slug,
                version_number: isAggregated ? null : stepFunnel.versionNumber,
                is_published: isAggregated ? null : stepFunnel.isPublished,
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
