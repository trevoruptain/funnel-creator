import { db } from '@/db';
import { funnels, sessions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const funnelSlug = searchParams.get('funnel');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);

    if (!funnelSlug || !from || !to) {
      return NextResponse.json(
        { error: 'funnel, from, and to parameters are required' },
        { status: 400 }
      );
    }

    const funnel = await db.query.funnels.findFirst({
      where: eq(funnels.slug, funnelSlug),
    });

    if (!funnel) {
      return NextResponse.json({ error: `Funnel not found: ${funnelSlug}` }, { status: 404 });
    }

    const conditions = [
      eq(sessions.funnelId, funnel.id),
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
      count: data.length,
      sessions: data,
    });
  } catch (error) {
    console.error('Admin dashboard sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
