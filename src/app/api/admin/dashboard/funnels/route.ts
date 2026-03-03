import { db } from '@/db';
import { funnels } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export interface FunnelVersion {
  slug: string;
  versionNumber: number;
  isPublished: boolean;
}

export interface FunnelFamily {
  baseSlug: string;
  name: string;
  versions: FunnelVersion[];
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const list = await db
      .select({
        slug: funnels.slug,
        name: funnels.name,
        baseSlug: funnels.baseSlug,
        versionNumber: funnels.versionNumber,
        isPublished: funnels.isPublished,
      })
      .from(funnels)
      .orderBy(asc(funnels.baseSlug), asc(funnels.versionNumber));

    // Group into families keyed by baseSlug
    const familyMap = new Map<string, FunnelFamily>();
    for (const f of list) {
      if (!familyMap.has(f.baseSlug)) {
        familyMap.set(f.baseSlug, { baseSlug: f.baseSlug, name: f.name, versions: [] });
      }
      familyMap.get(f.baseSlug)!.versions.push({
        slug: f.slug,
        versionNumber: f.versionNumber,
        isPublished: f.isPublished,
      });
    }

    return NextResponse.json({ funnels: Array.from(familyMap.values()) });
  } catch (error) {
    console.error('Admin dashboard funnels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
