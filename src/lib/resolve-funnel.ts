/**
 * Shared helper for resolving one or more funnel rows from a slug/baseSlug + optional version.
 *
 * Rules:
 *   - Versioned slug  (e.g. aurora-399-v2)  → exact row, ignores version param
 *   - Base slug + version param              → exact version within family
 *   - Base slug only                         → all versions in family (for cross-version aggregation)
 *
 * Returns:
 *   targetFunnels  — the funnel rows whose sessions should be included
 *   stepFunnel     — the funnel whose step list is used for ordering (published > latest)
 */

import { db } from '@/db';
import { funnels } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export type ResolvedFunnel = typeof funnels.$inferSelect;

export interface FunnelResolution {
  targetFunnels: ResolvedFunnel[];
  stepFunnel: ResolvedFunnel;
  /** IDs of all target funnels — use for session filtering */
  funnelIds: string[];
  isAggregated: boolean;
}

const VERSIONED_SLUG_RE = /-v\d+$/;

export async function resolveFunnel(
  funnelParam: string,
  versionParam: string | null,
): Promise<FunnelResolution | null> {
  if (VERSIONED_SLUG_RE.test(funnelParam)) {
    // Exact versioned slug — single version, version param ignored
    const funnel = await db.query.funnels.findFirst({
      where: eq(funnels.slug, funnelParam),
    });
    if (!funnel) return null;
    return {
      targetFunnels: [funnel],
      stepFunnel: funnel,
      funnelIds: [funnel.id],
      isAggregated: false,
    };
  }

  if (versionParam) {
    // Base slug + specific version number
    const versionNumber = parseInt(versionParam, 10);
    if (isNaN(versionNumber)) return null;
    const funnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.baseSlug, funnelParam),
        eq(funnels.versionNumber, versionNumber),
      ),
    });
    if (!funnel) return null;
    return {
      targetFunnels: [funnel],
      stepFunnel: funnel,
      funnelIds: [funnel.id],
      isAggregated: false,
    };
  }

  // Base slug only — aggregate across all versions
  const allVersions = await db
    .select()
    .from(funnels)
    .where(eq(funnels.baseSlug, funnelParam))
    .orderBy(asc(funnels.versionNumber));

  if (!allVersions.length) return null;

  // Use the published version for step ordering; fall back to latest
  const stepFunnel = allVersions.find((f) => f.isPublished) ?? allVersions[allVersions.length - 1];

  return {
    targetFunnels: allVersions,
    stepFunnel,
    funnelIds: allVersions.map((f) => f.id),
    isAggregated: allVersions.length > 1,
  };
}
