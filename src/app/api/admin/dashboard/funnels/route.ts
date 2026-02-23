import { db } from '@/db';
import { funnels } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const list = await db
      .select({ slug: funnels.slug, name: funnels.name })
      .from(funnels)
      .orderBy(funnels.name);

    return NextResponse.json({ funnels: list });
  } catch (error) {
    console.error('Admin dashboard funnels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
