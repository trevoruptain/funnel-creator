import { db } from '@/db';
import { sessions } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveFunnel } from '@/lib/resolve-funnel';
import { eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/dashboard/date-bounds?funnel=X&version=Y
 *
 * Returns the earliest and latest session dates for a funnel.
 * Used to constrain the date picker so users can't select dates before
 * any data existed or in the future.
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const funnelParam = searchParams.get('funnel');
    const versionParam = searchParams.get('version');

    if (!funnelParam) {
      return NextResponse.json(
        { error: 'The "funnel" query parameter is required' },
        { status: 400 }
      );
    }

    const resolution = await resolveFunnel(funnelParam, versionParam);
    if (!resolution) {
      return NextResponse.json({ error: `Funnel not found: ${funnelParam}` }, { status: 404 });
    }

    const { funnelIds } = resolution;

    const [row] = await db
      .select({
        min_date: sql<string>`min(${sessions.startedAt})::date`,
        max_date: sql<string>`max(${sessions.startedAt})::date`,
      })
      .from(sessions)
      .where(
        funnelIds.length === 1
          ? eq(sessions.funnelId, funnelIds[0])
          : inArray(sessions.funnelId, funnelIds)
      );

    const minDate = row?.min_date ? String(row.min_date).slice(0, 10) : null;
    const maxDate = row?.max_date ? String(row.max_date).slice(0, 10) : null;

    return NextResponse.json({ min: minDate, max: maxDate });
  } catch (error) {
    console.error('Admin dashboard date-bounds error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
