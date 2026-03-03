import { requireAdmin } from '@/lib/admin-auth';
import { NextRequest, NextResponse } from 'next/server';

const META_API_VERSION = 'v22.0';

interface MetaInsightsRow {
  reach?: string;
  impressions?: string;
  spend?: string;
  clicks?: string;
  cpc?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

function findAction(actions: MetaInsightsRow['actions'], type: string): number {
  return Number(actions?.find((a) => a.action_type === type)?.value ?? 0);
}

/**
 * GET /api/admin/meta-stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Fetches live aggregated ad insights from the Meta Marketing API for the
 * configured ad account and returns them in the MetaData shape used by
 * the dashboard.
 *
 * Env vars required:
 *   META_ACCESS_TOKEN    — Marketing API access token
 *   META_AD_ACCOUNT_ID  — Ad account ID (numeric, without "act_" prefix)
 */
export async function GET(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Both "from" and "to" date parameters are required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json(
      { error: 'META_ACCESS_TOKEN and META_AD_ACCOUNT_ID env vars are required' },
      { status: 500 }
    );
  }

  try {
    const timeRange = JSON.stringify({ since: from, until: to });
    const fields = 'reach,impressions,spend,clicks,cpc,frequency,actions';

    const url = new URL(
      `https://graph.facebook.com/${META_API_VERSION}/act_${adAccountId}/insights`
    );
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('time_range', timeRange);
    url.searchParams.set('fields', fields);
    url.searchParams.set('level', 'account');

    const res = await fetch(url.toString(), { cache: 'no-store' });

    if (!res.ok) {
      const body = await res.text();
      console.error('Meta API error:', res.status, body);
      return NextResponse.json(
        { error: `Meta API returned ${res.status}` },
        { status: 503 }
      );
    }

    const json = await res.json();

    if (json.error) {
      console.error('Meta API error object:', json.error);
      return NextResponse.json(
        { error: json.error.message ?? 'Meta API error' },
        { status: 503 }
      );
    }

    // Aggregate across all rows (there's typically one at account level, but sum to be safe)
    const rows: MetaInsightsRow[] = json.data ?? [];

    if (rows.length === 0) {
      // No data for the date range — return zeros rather than an error
      return NextResponse.json({
        data: {
          reach: 0,
          impressions: 0,
          amountSpent: 0,
          funnelCompleted: 0,
          cpc: 0,
          linkClicks: 0,
          landingPageViews: 0,
          frequency: 0,
        },
      });
    }

    const totals = rows.reduce(
      (acc, row) => ({
        reach: acc.reach + Number(row.reach ?? 0),
        impressions: acc.impressions + Number(row.impressions ?? 0),
        amountSpent: acc.amountSpent + Number(row.spend ?? 0),
        linkClicks: acc.linkClicks + Number(row.clicks ?? 0),
        funnelCompleted:
          acc.funnelCompleted + findAction(row.actions, 'complete_registration'),
        landingPageViews:
          acc.landingPageViews + findAction(row.actions, 'landing_page_view'),
        // CPC and frequency are averages — take from first row (account-level is already aggregated)
        cpc: acc.cpc || Number(row.cpc ?? 0),
        frequency: acc.frequency || Number(row.frequency ?? 0),
      }),
      {
        reach: 0,
        impressions: 0,
        amountSpent: 0,
        linkClicks: 0,
        funnelCompleted: 0,
        landingPageViews: 0,
        cpc: 0,
        frequency: 0,
      }
    );

    return NextResponse.json({ data: totals });
  } catch (error) {
    console.error('meta-stats route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
