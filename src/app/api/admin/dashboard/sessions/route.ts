import { db } from '@/db';
import { sessions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveFunnel } from '@/lib/resolve-funnel';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

    if (!funnelParam || !from || !to) {
      return NextResponse.json(
        { error: 'funnel, from, and to parameters are required' },
        { status: 400 }
      );
    }

    const resolution = await resolveFunnel(funnelParam, versionParam);
    if (!resolution) {
      return NextResponse.json({ error: `Funnel not found: ${funnelParam}` }, { status: 404 });
    }

    const { funnelIds } = resolution;

    const conditions = [
      funnelIds.length === 1
        ? eq(sessions.funnelId, funnelIds[0])
        : inArray(sessions.funnelId, funnelIds),
      gte(sessions.startedAt, new Date(from)),
      lte(sessions.startedAt, new Date(to)),
    ];
    const whereClause = and(...conditions);

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(whereClause);

    const results = await db.query.sessions.findMany({
      where: whereClause,
      orderBy: [desc(sessions.startedAt)],
      limit,
      with: {
        funnel: {
          columns: { slug: true, name: true, priceVariant: true, versionNumber: true, isPublished: true },
        },
      },
    });

    const data = results.map((s) => ({
      session_id: s.sessionToken,
      funnel_slug: s.funnel.slug,
      funnel_name: s.funnel.name,
      funnel_version: s.funnel.versionNumber,
      is_published_version: s.funnel.isPublished,
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
      count: data.length,
      sessions: data,
    });
  } catch (error) {
    console.error('Admin dashboard sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
