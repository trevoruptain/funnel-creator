#!/usr/bin/env npx tsx
/**
 * Verify funnel tracking after a manual run-through.
 *
 * 1. Run through funnel: http://localhost:3000/?utm_source=test&utm_campaign=verify
 * 2. Run: npx tsx scripts/verify-tracking.ts
 *
 * Loads .env.local for DATA_API_KEY (for stats endpoint).
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const API_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';
const API_KEY = process.env.DATA_API_KEY;

async function fetchJson(path: string, useAuth = false) {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  if (useAuth && API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  console.log('═'.repeat(60));
  console.log('FUNNEL TRACKING VERIFICATION');
  console.log('═'.repeat(60));
  console.log(`\nAPI: ${API_BASE}`);
  console.log(`API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'none (local dev may not need)'}\n`);

  // 1. Get recent sessions (no auth needed)
  let sessions: { id?: string; utm_params?: unknown }[] = [];
  try {
    const res = await fetchJson('/api/funnel-response?funnel=maternal-fetal-399-v1&limit=10');
    sessions = res.sessions ?? [];
  } catch (e) {
    console.log('Sessions API failed:', (e as Error).message);
  }

  // 2. Get stats (requires DATA_API_KEY)
  const funnelSlug = 'maternal-fetal-399-v1';
  let stats: { step_drop_off?: { step_id: string; views: number; answers: number }[] } = {};
  try {
    stats = await fetchJson(`/api/data/stats?funnel=${funnelSlug}`, true);
  } catch (e) {
    console.log('Stats API failed (set DATA_API_KEY in .env.local):', (e as Error).message);
  }

  // 3. Report (API returns camelCase utmParams from Drizzle)
  const utm = (s: (typeof sessions)[0]) => (s as Record<string, unknown>).utmParams ?? (s as Record<string, unknown>).utm_params;
  const stepViews = (s: (typeof sessions)[0]) => (s as Record<string, unknown>).stepViews ?? (s as Record<string, unknown>).step_views;

  console.log('─ UTM Params ─');
  if (sessions.length > 0) {
    const withUtm = sessions.filter((s) => {
      const u = utm(s);
      return u && typeof u === 'object' && Object.keys(u).length > 0;
    });
    console.log(`  Recent sessions: ${sessions.length}`);
    console.log(`  With UTM: ${withUtm.length}`);
    if (withUtm.length > 0) {
      console.log('  ✓ UTM passthrough working');
      const latest = withUtm[0];
      console.log(`  Sample: ${JSON.stringify(utm(latest))}`);
    } else {
      console.log('  ⚠ No sessions with UTM. Try: ?utm_source=test&utm_campaign=verify');
    }
  } else {
    console.log('  No sessions returned. Complete the funnel first.');
  }

  // 4. Verify step_view fix on MOST RECENT session (with UTM = your test run)
  console.log('\n─ Step View Fix (Latest Session) ─');
  const latestWithUtm = sessions.find((s) => {
    const u = utm(s);
    return u && typeof u === 'object' && Object.keys(u).length > 0;
  });
  if (latestWithUtm) {
    const views = (stepViews(latestWithUtm) as { stepId: string }[]) ?? [];
    const hasWelcomeView = views.some((v) => v.stepId === 'welcome');
    const responses = (latestWithUtm as Record<string, unknown>).responses as { stepId: string }[] ?? [];
    const responseCount = responses.length;
    const viewCount = views.length;

    console.log(`  Latest UTM session: ${viewCount} step_views, ${responseCount} responses`);
    console.log(`  First step (welcome) has step_view: ${hasWelcomeView ? '✓ YES' : '❌ NO'}`);
    if (hasWelcomeView && viewCount >= responseCount) {
      console.log('  ✓ Step view fix VERIFIED — first step recorded, views >= responses');
    } else if (!hasWelcomeView) {
      console.log('  ❌ Fix NOT verified — welcome step_view missing (run funnel again with UTM URL)');
    } else {
      console.log(`  ⚠ Views (${viewCount}) < responses (${responseCount}) — partial run or old session`);
    }
  } else {
    console.log('  No UTM session found. Run funnel with ?utm_source=test&utm_campaign=verify first.');
  }

  console.log('\n─ Step Views vs Answers ─');
  if (stats.step_drop_off?.length) {
    const steps = stats.step_drop_off;
    const firstStep = steps[0];
    const viewsLtAnswers = steps.filter((s) => s.views < s.answers);
    console.log(`  Steps: ${steps.length}`);
    console.log(`  First step (${firstStep?.step_id}): views=${firstStep?.views} answers=${firstStep?.answers}`);
    if (viewsLtAnswers.length > 0) {
      console.log(`  ⚠ ${viewsLtAnswers.length} steps have views < answers:`);
      viewsLtAnswers.slice(0, 5).forEach((s) => console.log(`     ${s.step_id}: ${s.views} views, ${s.answers} answers`));
    } else {
      console.log('  ✓ Views >= answers for all steps (or no data yet)');
    }
  } else {
    console.log('  No step_drop_off data (stats API may need DATA_API_KEY)');
  }

  console.log('\n' + '═'.repeat(60));
}

main().catch(console.error);
