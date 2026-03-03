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
  publishedVersion: number | null;
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
        createdAt: funnels.createdAt,
      })
      .from(funnels)
      .orderBy(asc(funnels.baseSlug), asc(funnels.versionNumber));

    // Group into families keyed by baseSlug, tracking min createdAt per family
    const familyMap = new Map<string, FunnelFamily & { _minCreatedAt: Date }>();
    for (const f of list) {
      if (!familyMap.has(f.baseSlug)) {
        familyMap.set(f.baseSlug, {
          baseSlug: f.baseSlug,
          name: f.name,
          publishedVersion: null,
          versions: [],
          _minCreatedAt: f.createdAt,
        });
      }
      const family = familyMap.get(f.baseSlug)!;
      family.versions.push({
        slug: f.slug,
        versionNumber: f.versionNumber,
        isPublished: f.isPublished,
      });
      if (f.isPublished) {
        family.publishedVersion = f.versionNumber;
      }
      if (f.createdAt < family._minCreatedAt) {
        family._minCreatedAt = f.createdAt;
      }
    }

    // Sort families by when they were first created — oldest (most established) first
    const sorted = Array.from(familyMap.values())
      .sort((a, b) => a._minCreatedAt.getTime() - b._minCreatedAt.getTime())
      .map(({ _minCreatedAt: _, ...rest }) => rest);

    return NextResponse.json({ funnels: sorted });
  } catch (error) {
    console.error('Admin dashboard funnels error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
