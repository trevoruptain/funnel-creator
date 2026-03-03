import { db } from '@/db';
import { funnelSteps, responses, sessions, stepViews } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveFunnel } from '@/lib/resolve-funnel';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const funnelParam = searchParams.get('funnel');
    const versionParam = searchParams.get('version');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!funnelParam) {
      return NextResponse.json(
        { error: 'The "funnel" query parameter is required' },
        { status: 400 }
      );
    }

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Both "from" and "to" date parameters are required' },
        { status: 400 }
      );
    }

    const resolution = await resolveFunnel(funnelParam, versionParam);
    if (!resolution) {
      return NextResponse.json({ error: `Funnel not found: ${funnelParam}` }, { status: 404 });
    }

    const { funnelIds, stepFunnel, targetFunnels, isAggregated } = resolution;

    const sessionConditions = [
      funnelIds.length === 1
        ? eq(sessions.funnelId, funnelIds[0])
        : inArray(sessions.funnelId, funnelIds),
      gte(sessions.startedAt, new Date(from)),
      lte(sessions.startedAt, new Date(to)),
    ];
    const sessionWhere = and(...sessionConditions);

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

    const [responseOverview] = await db
      .select({
        total_responses: sql<number>`count(*)`,
      })
      .from(responses)
      .innerJoin(sessions, eq(responses.sessionId, sessions.id))
      .where(sessionWhere);

    const totalSessions = Number(overview.total_sessions);
    const completedSessions = Number(overview.completed_sessions);
    const totalResponses = Number(responseOverview.total_responses);

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

    // Use the step funnel (published or latest version) for step ordering
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
        // Single-version fields (null when aggregating)
        slug: isAggregated ? null : stepFunnel.slug,
        version_number: isAggregated ? null : stepFunnel.versionNumber,
        is_published: isAggregated ? null : stepFunnel.isPublished,
      },
      date_range: {
        from: overview.first_session ?? from,
        to: overview.last_session ?? to,
      },
      overview: {
        total_sessions: totalSessions,
        total_responses: totalResponses,
        completed_sessions: completedSessions,
        completion_rate: totalSessions > 0 ? completedSessions / totalSessions : 0,
        unique_emails: Number(overview.unique_emails),
      },
      step_drop_off: stepDropOff,
      answer_distributions: distributions,
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
