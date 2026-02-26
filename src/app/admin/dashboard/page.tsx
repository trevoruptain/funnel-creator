"use client";

import { useCallback, useEffect, useState } from "react";
import "./dashboard.css";
import { MetaDropZone } from "./MetaDropZone";

const STEP_LABELS: Record<string, string> = {
  welcome: "Welcome",
  "pregnancy-status": "Pregnancy Status",
  gender: "Gender",
  height: "Height",
  weight: "Weight",
  trimester: "Trimester",
  "previous-children": "Previous Children",
  "current-monitoring": "Current Monitoring",
  "feature-interest": "Feature Interest",
  "monitoring-gaps": "Monitoring Gaps",
  importance: "Importance Rating",
  "feature-ranking": "Feature Ranking",
  email: "Email Step",
  checkout: "Checkout",
  result: "Result Page",
  "info-introducing-aurora": "Introducing Aurora",
  "info-wellness-for-two": "Wellness for Two",
  "future-monitoring": "Future Monitoring",
  "future-priorities": "Future Priorities",
  "supporter-role": "Supporter Role",
  "supporter-interest": "Supporter Interest",
};

function stepLabel(id: string) {
  if (STEP_LABELS[id]) return STEP_LABELS[id];
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function fmt(n: number | null | undefined): string {
  return n == null ? "—" : Number(n).toLocaleString();
}

function fmtPct(r: number | null | undefined): string {
  return r == null ? "—" : (r * 100).toFixed(1) + "%";
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  // Date-only strings (YYYY-MM-DD) are parsed as UTC by default,
  // which shifts back a day in US timezones. Force local parsing.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? new Date(s + "T00:00:00")
    : new Date(s);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

interface StatsData {
  funnel: { slug: string; name: string };
  date_range: { from?: string; to?: string };
  overview: {
    total_sessions: number;
    total_responses: number;
    completed_sessions: number;
    completion_rate: number;
    unique_emails: number;
  };
  step_drop_off: Array<{
    step_id: string;
    sort_order: number;
    views: number;
    answers: number;
    drop_off_rate: number | null;
  }>;
  answer_distributions: Record<
    string,
    Array<{ value: string | string[]; count: number }>
  >;
}

interface SessionData {
  total: number;
  sessions: Array<{
    session_id: string;
    started_at: string;
    is_completed: boolean;
  }>;
}

interface MetaData {
  reach: number;
  impressions: number;
  amountSpent: number;
  funnelCompleted: number;
  cpc: number;
  linkClicks: number;
  landingPageViews: number;
  frequency?: number;
}

export default function DashboardPage() {
  const [funnels, setFunnels] = useState<Array<{ slug: string; name: string }>>(
    [],
  );
  const [funnelSlug, setFunnelSlug] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [sessions, setSessions] = useState<SessionData | null>(null);
  const [metaData, setMetaData] = useState<MetaData | null>(null);
  const [metaUploadedAt, setMetaUploadedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFunnels = useCallback(async () => {
    const res = await fetch("/api/admin/dashboard/funnels");
    if (!res.ok) return;
    const data = await res.json();
    setFunnels(data.funnels || []);
    if (data.funnels?.length && !funnelSlug) {
      setFunnelSlug(data.funnels[0].slug);
    }
  }, [funnelSlug]);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/admin/meta-export");
    if (!res.ok) return;
    const data = await res.json();
    if (data.data) setMetaData(data.data);
    else setMetaData(null);
    setMetaUploadedAt(data.uploadedAt || null);
  }, []);

  const loadAll = useCallback(async () => {
    if (!funnelSlug || !from || !to) return;

    setLoading(true);
    setError(null);

    try {
      const toEndOfDay = to + 'T23:59:59';
      const statsParams = new URLSearchParams({
        funnel: funnelSlug,
        from,
        to: toEndOfDay,
      });
      const sessParams = new URLSearchParams({
        funnel: funnelSlug,
        from,
        to: toEndOfDay,
        limit: "500",
      });

      const [statsRes, sessRes] = await Promise.all([
        fetch(`/api/admin/dashboard/stats?${statsParams}`),
        fetch(`/api/admin/dashboard/sessions?${sessParams}`),
      ]);

      if (!statsRes.ok) {
        const err = await statsRes.json();
        throw new Error(err.error || "Failed to load stats");
      }
      if (!sessRes.ok) {
        const err = await sessRes.json();
        throw new Error(err.error || "Failed to load sessions");
      }

      const [statsJson, sessJson] = await Promise.all([
        statsRes.json(),
        sessRes.json(),
      ]);

      setStats(statsJson);
      setSessions(sessJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      setStats(null);
      setSessions(null);
    } finally {
      setLoading(false);
    }
  }, [funnelSlug, from, to]);

  useEffect(() => {
    loadFunnels();
    loadMeta();
  }, [loadFunnels, loadMeta]);

  const hasDateRange = from && to;
  const ov: StatsData["overview"] = stats?.overview ?? {
    total_sessions: 0,
    total_responses: 0,
    completed_sessions: 0,
    completion_rate: 0,
    unique_emails: 0,
  };
  const stepDropOff = stats?.step_drop_off || [];
  const dist = stats?.answer_distributions || {};
  const allSessions = sessions?.sessions || [];

  const groupByDay = (sess: typeof allSessions) => {
    const map: Record<string, number> = {};
    sess.forEach((s) => {
      const d = s.started_at?.slice(0, 10);
      if (d) map[d] = (map[d] || 0) + 1;
    });
    return map;
  };

  const daysMap = groupByDay(allSessions);
  const days = Object.keys(daysMap).sort();
  const dayVals = days.map((d) => daysMap[d]);
  const maxDayVal = Math.max(...dayVals, 1);

  return (
    <div className="dashboard min-h-screen bg-[#e1deea]">
      {/* Header */}
      <header className="dashboard-header flex flex-wrap items-end justify-between gap-4 px-8 py-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#b55600] to-[#0590b9] text-lg font-bold">
            A
          </div>
          <div>
            <h1 className="text-xl font-semibold">Aurora Funnel Dashboard</h1>
            <p className="text-xs opacity-75">
              Select date range and funnel, then refresh to load data
            </p>
          </div>
        </div>
        <div className="text-right text-xs opacity-70">
          <div>
            <strong>Funnel:</strong> {funnelSlug || "—"}
          </div>
          <div className="mt-1">
            Last refreshed: {stats ? new Date().toLocaleTimeString() : "—"}
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="border-b border-[#c8c2d8] bg-[#f5f3f9] px-8 py-2.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="sel-funnel"
              className="text-xs font-semibold uppercase tracking-wide text-[#6b6480]"
            >
              Funnel
            </label>
            <select
              id="sel-funnel"
              value={funnelSlug}
              onChange={(e) => setFunnelSlug(e.target.value)}
              className="rounded border border-[#c8c2d8] bg-white px-2 py-1.5 text-sm text-[#1a1625]"
            >
              <option value="">Select funnel</option>
              {funnels.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="h-5 w-px bg-[#c8c2d8]" />
          <div className="flex items-center gap-2">
            <label
              htmlFor="inp-from"
              className="text-xs font-semibold uppercase tracking-wide text-[#6b6480]"
            >
              From
            </label>
            <input
              id="inp-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-[#c8c2d8] bg-white px-2 py-1.5 text-sm text-[#1a1625]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="inp-to"
              className="text-xs font-semibold uppercase tracking-wide text-[#6b6480]"
            >
              To
            </label>
            <input
              id="inp-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-[#c8c2d8] bg-white px-2 py-1.5 text-sm text-[#1a1625]"
            />
          </div>
          <div className="h-5 w-px bg-[#c8c2d8]" />
          <button
            onClick={loadAll}
            disabled={!hasDateRange || !funnelSlug || loading}
            className="rounded bg-[#1753a0] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <button
            onClick={() => {
              setFrom("");
              setTo("");
              setStats(null);
              setSessions(null);
            }}
            className="rounded bg-[#e8e4f0] px-4 py-1.5 text-sm font-semibold text-[#1a1625] hover:opacity-90"
          >
            Clear dates
          </button>
          {sessions && (
            <span className="ml-auto text-xs text-[#6b6480]">
              {fmt(sessions.total)} total sessions
            </span>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-8 py-6 pb-12">
        {/* Date range required banner */}
        {!hasDateRange && (
          <div className="mb-4 rounded-lg border border-[#fde68a] bg-[#fef6e4] px-4 py-3 text-sm text-[#b55600]">
            Select a date range (From and To) and funnel, then click Refresh to
            load dashboard data.
          </div>
        )}

        {/* Meta Drop Zone */}
        <div className="mb-6">
          <MetaDropZone
            onUploadSuccess={loadMeta}
            lastUploadedAt={metaUploadedAt}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#f9a8c0] bg-[#fce8ef] px-4 py-3 text-sm text-[#b8003c]">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Loading banner */}
        {loading && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3 text-sm text-[#3730a3]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c7d2fe] border-t-[#3730a3]" />
            <span>Loading live data…</span>
          </div>
        )}

        {!stats && !loading && hasDateRange && (
          <div className="rounded-lg border border-[#c8c2d8] bg-white p-8 text-center text-[#6b6480]">
            Click Refresh to load data for the selected date range.
          </div>
        )}

        {stats && sessions && (
          <>
            {/* Overview */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">
                Overview{" "}
                <span className="text-xs font-normal text-[#6b6480]">
                  {fmtDate(from)} – {fmtDate(to)}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                <div className="dashboard-metric-card rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="text-2xl font-light leading-tight tracking-tight text-[#1a1625]">
                    {fmt(ov.total_sessions)}
                  </div>
                  <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#6b6480]">
                    Sessions
                  </div>
                  <div className="text-[0.72rem] text-[#6b6480]">
                    Total funnel starts
                  </div>
                </div>
                <div className="dashboard-metric-card rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="val accent text-2xl font-light leading-tight tracking-tight text-[#1753a0]">
                    {fmt(ov.total_responses)}
                  </div>
                  <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#6b6480]">
                    Responses
                  </div>
                  <div className="text-[0.72rem] text-[#6b6480]">
                    {ov.total_sessions
                      ? (ov.total_responses / ov.total_sessions).toFixed(1)
                      : "0"}{" "}
                    per session
                  </div>
                </div>
                <div className="dashboard-metric-card rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="val green text-2xl font-light leading-tight tracking-tight text-[#1a7f5a]">
                    {fmt(ov.completed_sessions)}
                  </div>
                  <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#6b6480]">
                    Completed
                  </div>
                  <div className="text-[0.72rem] text-[#6b6480]">
                    {fmtPct(
                      ov.total_sessions
                        ? ov.completed_sessions / ov.total_sessions
                        : 0,
                    )}{" "}
                    completion rate
                  </div>
                </div>
                <div className="dashboard-metric-card rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="val orange text-2xl font-light leading-tight tracking-tight text-[#b55600]">
                    {fmt(ov.unique_emails)}
                  </div>
                  <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#6b6480]">
                    Unique Emails
                  </div>
                  <div className="text-[0.72rem] text-[#6b6480]">captured</div>
                </div>
                <div className="dashboard-metric-card rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="text-xl font-light leading-tight tracking-tight text-[#1a1625]">
                    {fmtDate(from)} – {fmtDate(to)}
                  </div>
                  <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wider text-[#6b6480]">
                    Date Range
                  </div>
                  <div className="text-[0.72rem] text-[#6b6480]">
                    selected period
                  </div>
                </div>
              </div>
            </section>

            {/* Funnel Waterfall */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">Funnel Step Drop-Off</h2>
              <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                <div className="dashboard-wf-row mb-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[#6b6480]">
                  <div>Step</div>
                  <div />
                  <div className="text-right">N</div>
                  <div className="text-right">Drop-off</div>
                </div>
                {(() => {
                  const activeSteps = stepDropOff
                    .filter((s) => (s.views || 0) > 0)
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                  if (activeSteps.length === 0)
                    return (
                      <div className="py-6 text-center text-sm italic text-[#6b6480]">
                        No step data
                      </div>
                    );
                  const maxV = Math.max(
                    ...activeSteps.map((x) => x.views || 0),
                    1,
                  );
                  return activeSteps.map((s, i) => {
                    const pct = Math.round(((s.views || 0) / maxV) * 100);
                    const prevViews = i > 0 ? activeSteps[i - 1].views : 0;
                    const isBranchBoundary =
                      i > 0 &&
                      (s.views > prevViews || s.views < prevViews * 0.25);
                    const stepDrop =
                      i > 0 && prevViews > 0 && !isBranchBoundary
                        ? Math.round(((prevViews - s.views) / prevViews) * 100)
                        : null;
                    const isBig = stepDrop != null && stepDrop > 15;
                    const color =
                      s.step_id === "checkout" ? "#1a7f5a" : "var(--c5)";
                    return (
                      <div key={s.step_id} className="dashboard-wf-row">
                        <div className="truncate text-[#1a1625]">
                          {stepLabel(s.step_id)}
                        </div>
                        <div className="h-6 overflow-hidden rounded bg-[#e8e4f0]">
                          <div
                            className="h-full rounded transition-[width] duration-300"
                            style={{
                              width: `${pct}%`,
                              background: color,
                              opacity: 0.75,
                            }}
                          />
                        </div>
                        <div className="text-right font-tabular-nums text-[#6b6480]">
                          {fmt(s.views)}
                        </div>
                        <div
                          className={`text-right text-[0.75rem] font-tabular-nums ${isBig ? "font-semibold text-[#b8003c]" : ""}`}
                        >
                          {i === 0
                            ? ""
                            : stepDrop != null
                              ? `-${stepDrop}%`
                              : "—"}
                        </div>
                      </div>
                    );
                  });
                })()}
                {stepDropOff.filter((s) => (s.views || 0) > 0).length > 0 &&
                  (() => {
                    const active = stepDropOff
                      .filter((s) => (s.views || 0) > 0)
                      .sort(
                        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
                      );
                    const firstViews = active[0]?.views ?? 0;
                    const completedViews =
                      active.find((s) => s.step_id === "checkout")?.views ??
                      active[active.length - 1]?.views ??
                      0;
                    return (
                      <p className="mt-3 text-[0.75rem] text-[#6b6480]">
                        {firstViews} users reached the first step;{" "}
                        {completedViews} completed the full funnel.
                      </p>
                    );
                  })()}
              </div>
            </section>

            {/* Response Insights */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">
                Response Insights — Answer Distributions
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {(() => {
                  const COLORS = [
                    "var(--c5)",
                    "var(--c2)",
                    "var(--good)",
                    "var(--c4)",
                    "var(--c1)",
                    "var(--c6)",
                    "var(--c3)",
                  ];
                  const orderedKeys = [...stepDropOff]
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((s) => s.step_id)
                    .filter(
                      (id) =>
                        dist[id] &&
                        dist[id].length > 0 &&
                        id !== "email" &&
                        id !== "checkout",
                    );
                  const extraKeys = Object.keys(dist).filter(
                    (k) =>
                      !orderedKeys.includes(k) &&
                      dist[k].length > 0 &&
                      k !== "email" &&
                      k !== "checkout",
                  );
                  const allKeys = [...orderedKeys, ...extraKeys];

                  return allKeys.map((key, idx) => {
                    const data = dist[key];
                    const maxVal = Math.max(...data.map((d) => d.count), 1);
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-[#c8c2d8] bg-white p-4"
                      >
                        <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-wider text-[#6b6480]">
                          {stepLabel(key)}
                        </div>
                        {data.slice(0, 8).map((d, i) => {
                          const lbl = Array.isArray(d.value)
                            ? d.value.join(", ")
                            : String(d.value);
                          const pct = Math.round((d.count / maxVal) * 100);
                          return (
                            <div key={i} className="dashboard-hbar-row">
                              <div className="truncate" title={lbl}>
                                {lbl}
                              </div>
                              <div className="h-4 overflow-hidden rounded bg-[#e8e4f0]">
                                <div
                                  className="h-full rounded transition-[width] duration-300"
                                  style={{
                                    width: `${pct}%`,
                                    background: color,
                                  }}
                                />
                              </div>
                              <div className="text-right text-[0.75rem] font-tabular-nums text-[#6b6480]">
                                {d.count}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            </section>

            {/* Audience + Conversion */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">
                Audience Profile & Conversions
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-wider text-[#6b6480]">
                    Audience Snapshot (from responses)
                  </div>
                  <table className="dashboard-data-table w-full text-[0.82rem]">
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th>Top Answer</th>
                        <th>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const SKIP = [
                          "email",
                          "checkout",
                          "feature-interest",
                          "monitoring-gaps",
                          "importance",
                        ];
                        const keys = [...stepDropOff]
                          .sort(
                            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
                          )
                          .map((s) => s.step_id)
                          .filter(
                            (id) =>
                              dist[id] &&
                              dist[id].length > 0 &&
                              !SKIP.includes(id),
                          );
                        return keys.map((key) => {
                          const d = dist[key];
                          const total = d.reduce((a, b) => a + b.count, 0);
                          const top = d[0];
                          const val = Array.isArray(top.value)
                            ? top.value.join("+")
                            : String(top.value);
                          const pct =
                            total > 0
                              ? `${Math.round((top.count / total) * 100)}%`
                              : "—";
                          return (
                            <tr key={key}>
                              <td>{stepLabel(key)}</td>
                              <td>{val}</td>
                              <td>{pct}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-wider text-[#6b6480]">
                    Conversion Funnel
                  </div>
                  <table className="dashboard-data-table w-full text-[0.82rem]">
                    <thead>
                      <tr>
                        <th>Stage</th>
                        <th>Count</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Sessions</td>
                        <td>{fmt(ov.total_sessions)}</td>
                        <td>—</td>
                      </tr>
                      <tr>
                        <td>Completed funnel</td>
                        <td>{fmt(ov.completed_sessions)}</td>
                        <td>
                          {fmtPct(
                            ov.total_sessions
                              ? ov.completed_sessions / ov.total_sessions
                              : 0,
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Unique emails</td>
                        <td>{fmt(ov.unique_emails)}</td>
                        <td>
                          {fmtPct(
                            ov.total_sessions && ov.unique_emails
                              ? ov.unique_emails / ov.total_sessions
                              : 0,
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-3 text-center">
                    <div className="text-3xl font-light tracking-tight text-[#45108d]">
                      {fmtPct(
                        ov.total_sessions
                          ? ov.completed_sessions / ov.total_sessions
                          : 0,
                      )}
                    </div>
                    <div className="text-[0.72rem] uppercase tracking-wider text-[#6b6480]">
                      Completion Rate
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Session Activity */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">Session Activity</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-wider text-[#6b6480]">
                    Sessions by Day
                  </div>
                  {days.length === 0 ? (
                    <div className="py-4 text-center text-sm italic text-[#6b6480]">
                      No data
                    </div>
                  ) : (
                    <>
                      <div className="flex h-14 items-end gap-0.5">
                        {dayVals.map((v, i) => (
                          <div
                            key={i}
                            className="min-w-[2px] flex-1 rounded-t bg-[#1753a0] opacity-75 transition-opacity hover:opacity-100"
                            style={{
                              height: `${Math.max((v / maxDayVal) * 100, 2)}%`,
                            }}
                            title={`${days[i]}: ${v} sessions`}
                          />
                        ))}
                      </div>
                      <div className="mt-1 flex justify-between text-[0.67rem] text-[#6b6480]">
                        <span>{days[0]?.slice(5)}</span>
                        <span>
                          {days[Math.floor(days.length / 2)]?.slice(5)}
                        </span>
                        <span>{days[days.length - 1]?.slice(5)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                  <div className="mb-3 text-[0.72rem] font-bold uppercase tracking-wider text-[#6b6480]">
                    Recent Sessions
                  </div>
                  {allSessions.length === 0 ? (
                    <div className="py-4 text-center text-sm italic text-[#6b6480]">
                      No sessions
                    </div>
                  ) : (
                    <table className="dashboard-data-table w-full text-[0.82rem]">
                      <thead>
                        <tr>
                          <th>Session ID</th>
                          <th>Started</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allSessions.slice(0, 8).map((s) => (
                          <tr key={s.session_id}>
                            <td className="font-mono text-[0.75rem]">
                              {s.session_id.slice(0, 14)}…
                            </td>
                            <td>{fmtDate(s.started_at)}</td>
                            <td>
                              {s.is_completed ? (
                                <span className="rounded bg-[#bbf7d0] px-1.5 py-0.5 text-[0.65rem] font-bold text-[#14532d]">
                                  ✓ Complete
                                </span>
                              ) : (
                                <span className="rounded bg-[#e5e7eb] px-1.5 py-0.5 text-[0.65rem] font-bold text-[#374151]">
                                  Partial
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>

            {/* Meta vs Backend */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">
                Meta Pixel × Backend Cross-Reference
                {metaUploadedAt && (
                  <span className="dashboard-pill-purple">
                    {fmtDate(metaUploadedAt)} snapshot
                  </span>
                )}
              </h2>
              <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                <table className="dashboard-data-table w-full text-[0.82rem]">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Meta Pixel</th>
                      <th>Backend API</th>
                      <th>Gap</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Ad Reach</td>
                      <td>{metaData ? fmt(metaData.reach) : "—"}</td>
                      <td>—</td>
                      <td>—</td>
                      <td className="text-left text-[0.75rem]">
                        {metaData?.frequency
                          ? `Freq ${metaData.frequency.toFixed(2)} → ${fmt(metaData.impressions)} impressions`
                          : ""}
                      </td>
                    </tr>
                    <tr>
                      <td>Ad Spend</td>
                      <td>
                        {metaData ? `$${metaData.amountSpent.toFixed(2)}` : "—"}
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td className="text-left text-[0.75rem]">
                        From Meta export
                      </td>
                    </tr>
                    <tr>
                      <td>Page Loaded</td>
                      <td>—</td>
                      <td>{fmt(ov.total_sessions)}</td>
                      <td>—</td>
                      <td className="text-left text-[0.75rem]">
                        Sessions (backend)
                      </td>
                    </tr>
                    {metaData && ov.total_sessions ? (
                      <tr
                        className={
                          metaData.funnelCompleted < ov.completed_sessions
                            ? "bad"
                            : ""
                        }
                      >
                        <td>Funnel Completed</td>
                        <td>{fmt(metaData.funnelCompleted)}</td>
                        <td>{fmt(ov.completed_sessions)}</td>
                        <td>
                          {ov.completed_sessions > 0
                            ? `${(((metaData.funnelCompleted - ov.completed_sessions) / ov.completed_sessions) * 100).toFixed(0)}%`
                            : "—"}
                        </td>
                        <td className="text-left text-[0.75rem]">
                          CompleteRegistration vs backend
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td>Funnel Completed</td>
                        <td>
                          {metaData ? fmt(metaData.funnelCompleted) : "—"}
                        </td>
                        <td>{fmt(ov.completed_sessions)}</td>
                        <td>—</td>
                        <td className="text-left text-[0.75rem]">
                          CompleteRegistration vs backend
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Lead / Email</td>
                      <td>{metaData ? fmt(metaData.funnelCompleted) : "—"}</td>
                      <td>{fmt(ov.unique_emails)} real</td>
                      <td>—</td>
                      <td className="text-left text-[0.75rem]">
                        Backend is source of truth
                      </td>
                    </tr>
                    <tr>
                      <td>CPC (Meta)</td>
                      <td>
                        {metaData?.cpc ? `$${metaData.cpc.toFixed(2)}` : "—"}
                      </td>
                      <td>—</td>
                      <td>—</td>
                      <td className="text-left text-[0.75rem]">
                        Cost per link click
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Ad Performance vs Plan */}
            <section className="mb-8">
              <h2 className="dashboard-section-title">
                Ad Performance vs. Launch Plan
                {metaUploadedAt && (
                  <span className="dashboard-pill-purple">
                    {fmtDate(metaUploadedAt)} snapshot
                  </span>
                )}
              </h2>
              <div className="rounded-xl border border-[#c8c2d8] bg-white p-4">
                <table className="dashboard-data-table w-full text-[0.82rem]">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Actual</th>
                      <th>Target</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="good">
                      <td>Sessions driven</td>
                      <td>{fmt(ov.total_sessions)}</td>
                      <td>~50/concept/week</td>
                      <td className="text-left">✓ On pace</td>
                    </tr>
                    <tr
                      className={
                        metaData && metaData.cpc > 1.5 ? "bad" : "good"
                      }
                    >
                      <td>CPC (Meta)</td>
                      <td>
                        {metaData?.cpc ? `$${metaData.cpc.toFixed(2)}` : "—"}
                      </td>
                      <td>$0.75–$1.50</td>
                      <td className="text-left">
                        {metaData?.cpc && metaData.cpc > 1.5
                          ? "Above target"
                          : "✓"}
                      </td>
                    </tr>
                    <tr
                      className={
                        (ov.completion_rate || 0) < 0.2 ? "bad" : "good"
                      }
                    >
                      <td>Funnel completion</td>
                      <td>{fmtPct(ov.completion_rate)}</td>
                      <td>20–35%</td>
                      <td className="text-left">
                        {(ov.completion_rate || 0) >= 0.2
                          ? "✓"
                          : "Below target"}
                      </td>
                    </tr>
                    <tr>
                      <td>CPL (real leads)</td>
                      <td>
                        {metaData && ov.unique_emails && ov.unique_emails > 0
                          ? `$${(metaData.amountSpent / ov.unique_emails).toFixed(2)}`
                          : "—"}
                      </td>
                      <td>$7–$12</td>
                      <td className="text-left">—</td>
                    </tr>
                    <tr>
                      <td>Real email capture rate</td>
                      <td>
                        {ov.total_sessions && ov.unique_emails
                          ? fmtPct(ov.unique_emails / ov.total_sessions)
                          : "—"}
                      </td>
                      <td>20–35%</td>
                      <td className="text-left">—</td>
                    </tr>
                  </tbody>
                </table>
                <div className="dashboard-callout green">
                  <div className="font-bold">Important</div>
                  Backend is source of truth for funnel metrics. Meta export
                  provides ad spend, reach, and CPC. Ensure your Meta export
                  matches the selected date range for accurate comparison.
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-[#c8c2d8] bg-[#f5f3f9] py-6 text-center text-[0.72rem] text-[#6b6480]">
        Aurora Funnel Dashboard · Backend API + Meta Export · Confidential &
        Proprietary
      </footer>
    </div>
  );
}
