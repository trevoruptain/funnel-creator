import { db } from '@/db';
import { funnelSteps } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';
import { resolveFunnel } from '@/lib/resolve-funnel';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

interface StepCondition {
  stepId: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';
  value: string | string[];
}

interface PathOption {
  value: string;
  label: string;
}

interface PathSegment {
  stepId: string;
  stepLabel: string;
  options: PathOption[];
}

/**
 * GET /api/admin/dashboard/paths?funnel=aurora-399&version=1
 *
 * Returns the branching path segments for a funnel, derived from steps that
 * have `showIf` conditions pointing at other steps. Each unique "branching
 * question" step becomes a segment group; its config options become the
 * filter choices.
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

    const { stepFunnel } = resolution;

    // Load all steps with showIf and config columns
    const steps = await db.query.funnelSteps.findMany({
      where: eq(funnelSteps.funnelId, stepFunnel.id),
      orderBy: (fs, { asc }) => [asc(fs.sortOrder)],
      columns: { stepId: true, type: true, config: true, showIf: true },
    });

    // Find the unique set of "branching step IDs" — steps referenced in showIf conditions
    const branchingStepIds = new Set<string>();
    for (const step of steps) {
      if (step.showIf) {
        const condition = step.showIf as StepCondition;
        if (condition.stepId) {
          branchingStepIds.add(condition.stepId);
        }
      }
    }

    if (branchingStepIds.size === 0) {
      return NextResponse.json({ paths: [] });
    }

    // Build the path segments — one per branching step
    const paths: PathSegment[] = [];

    for (const branchingStepId of branchingStepIds) {
      const branchingStep = steps.find((s) => s.stepId === branchingStepId);
      if (!branchingStep) continue;

      const config = branchingStep.config as Record<string, unknown>;
      const rawOptions = config?.options as Array<{ id: string; label: string }> | undefined;

      if (!rawOptions?.length) continue;

      // Determine which option values are actually used in showIf conditions
      const usedValues = new Set<string>();
      for (const step of steps) {
        if (!step.showIf) continue;
        const condition = step.showIf as StepCondition;
        if (condition.stepId !== branchingStepId) continue;
        const values = Array.isArray(condition.value) ? condition.value : [condition.value];
        for (const v of values) usedValues.add(v);
      }

      // Only include options that actually appear in at least one showIf condition
      const options: PathOption[] = rawOptions
        .filter((opt) => usedValues.has(opt.id))
        .map((opt) => ({ value: opt.id, label: opt.label }));

      if (!options.length) continue;

      // Derive a human-readable step label from the stepId
      const stepLabel = branchingStepId
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      paths.push({ stepId: branchingStepId, stepLabel, options });
    }

    return NextResponse.json({ paths });
  } catch (error) {
    console.error('Admin dashboard paths error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
