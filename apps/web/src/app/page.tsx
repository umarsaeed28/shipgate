"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Card, MetricPill, Skeleton } from "@/components/ui";

function GreetingHeader({ activeRuns }: { activeRuns: number }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-[--text-primary]">{greeting}</h1>
        <p className="mt-1 text-[14px] text-[--text-tertiary]">
          QA control center - test health, trends, and integrations at a glance.
        </p>
      </div>
      <div className="flex items-center gap-4 text-[12px]">
        {activeRuns > 0 && (
          <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-medium text-[--color-primary]"
            style={{ background: "var(--color-primary-soft)" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[--accent-blue] opacity-50" />
              <span className="inline-flex h-2 w-2 rounded-full bg-[--accent-blue]" />
            </span>
            {activeRuns} active run{activeRuns > 1 ? "s" : ""}
          </div>
        )}
        <span className="text-[--text-quaternary]">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

function LineChart({ points, color, height = 100 }: { points: number[]; color: string; height?: number }) {
  if (points.length < 2) return <p className="py-8 text-center text-[14px] text-[--text-tertiary]">Not enough data</p>;
  const max = Math.max(...points, 1);
  const w = 100;
  const h = height;
  const pad = 2;
  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const polyline = coords.join(" ");
  const gid = `g-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`} fill={`url(#${gid})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function BarFailureChart({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="py-8 text-center text-[14px] text-[--text-tertiary]">Not enough data</p>;
  const max = Math.max(...values, 1);
  const h = 120;
  return (
    <div className="flex items-end gap-1" style={{ height: h }}>
      {values.map((v, i) => {
        const barH = Math.max((v / max) * (h - 8), 4);
        return (
          <div key={i} className="group relative flex-1 bar-animate" style={{ animationDelay: `${i * 12}ms`, minWidth: 6 }}>
            <div
              className="w-full rounded-t transition-opacity group-hover:opacity-90"
              style={{ height: barH, background: "var(--accent-red)", opacity: 0.75 }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 38;
  const circ = 2 * Math.PI * r;
  let cumOffset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-secondary)" strokeWidth="7" />
        {data.map((d) => {
          const pct = d.value / total;
          const dash = circ * pct;
          const offset = circ * cumOffset;
          cumOffset += pct;
          if (d.value === 0) return null;
          return (
            <circle
              key={d.label}
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="7"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="flex flex-col gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-[12px]">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-[--text-secondary]">{d.label}</span>
            <span className="ml-auto font-mono font-semibold tabular-nums text-[--text-primary]">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const runsQ = useQuery({ queryKey: ["runs"], queryFn: api.runs });
  const suitesQ = useQuery({ queryKey: ["suites"], queryFn: api.suites });
  const casesQ = useQuery({ queryKey: ["cases"], queryFn: api.cases });
  const integrationsQ = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });

  if (overview.isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Skeleton className="h-14 w-80 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-80 rounded-2xl lg:col-span-8" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <div className="rounded-2xl border bg-[--bg-card] px-10 py-6 text-center shadow-sm" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-[16px] font-semibold text-[--accent-red]">Unable to connect to API</p>
          <p className="mt-2 text-[14px] text-[--text-tertiary]">Make sure the API server is running on port 4000</p>
        </div>
      </div>
    );
  }

  if (!overview.data) return null;
  const d = overview.data;
  const runs = runsQ.data ?? [];
  const suites = suitesQ.data ?? [];
  const cases = casesQ.data ?? [];
  const integrations = integrationsQ.data ?? [];

  const passed = cases.filter((c) => c.lastResult === "passed").length;
  const failed = cases.filter((c) => c.lastResult === "failed").length;
  const skipped = cases.filter((c) => c.lastResult === "skipped").length;
  const other = cases.length - passed - failed - skipped;

  const passPoints = runs.slice(0, 20).reverse().map((r) => {
    const total = r.failureCount + 1;
    return Math.max(0, 1 - r.failureCount / total);
  });
  const failPoints = runs.slice(0, 20).reverse().map((r) => r.failureCount);

  const jiraOk = integrations.some((i) => i.type.toLowerCase().includes("jira") && i.isActive);
  const jenOk = integrations.some((i) => i.type.toLowerCase().includes("jenkins") && i.isActive);

  return (
    <div className="space-y-8 animate-slide-up">
      <GreetingHeader activeRuns={d.activeRuns} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricPill label="Pass rate" value={`${(d.passRate * 100).toFixed(1)}%`} tone="good" />
        <MetricPill label="Failure rate" value={`${(d.failureRate * 100).toFixed(1)}%`} tone="bad" />
        <MetricPill label="Flaky rate" value={`${(d.flakyRate * 100).toFixed(1)}%`} tone="warn" />
        <MetricPill label="Active runs" value={String(d.activeRuns)} />
        <MetricPill
          label="Release risk"
          value={d.releaseRisk.charAt(0).toUpperCase() + d.releaseRisk.slice(1)}
          tone={d.releaseRisk === "low" ? "good" : d.releaseRisk === "medium" ? "warn" : "bad"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card title="Test run trends">
            <div className="mb-3 flex items-center gap-5 text-[12px] text-[--text-tertiary]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-4 rounded bg-[--accent-green]" /> Pass signal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-[2px] w-4 rounded bg-[--accent-red]" /> Failures
              </span>
            </div>
            <LineChart points={passPoints.length >= 2 ? passPoints : [0.5, 0.5]} color="var(--accent-green)" height={128} />
          </Card>

          <Card title="Failure trends">
            <BarFailureChart values={failPoints.length >= 2 ? failPoints : [0, 0, 1, 0]} />
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Suite health">
              {suites.length === 0 ? (
                <p className="py-6 text-center text-[14px] text-[--text-tertiary]">No suites</p>
              ) : (
                <DonutChart
                  data={[
                    { label: "Healthy (≥80%)", value: suites.filter((s) => (s.passRate ?? 0) >= 0.8).length, color: "var(--accent-green)" },
                    { label: "At risk", value: suites.filter((s) => (s.passRate ?? 0) < 0.8).length, color: "var(--accent-orange)" },
                  ]}
                />
              )}
            </Card>
            <Card title="Test distribution">
              <DonutChart
                data={[
                  { label: "Passed", value: passed, color: "var(--accent-green)" },
                  { label: "Failed", value: failed, color: "var(--accent-red)" },
                  { label: "Skipped", value: skipped, color: "var(--accent-orange)" },
                  { label: "Other", value: other, color: "var(--text-quaternary)" },
                ]}
              />
            </Card>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card title="Alerts">
            {d.recentActivity.length === 0 ? (
              <p className="py-4 text-center text-[14px] text-[--text-tertiary]">No recent alerts</p>
            ) : (
              <ul className="space-y-0">
                {d.recentActivity.slice(0, 8).map((a, i) => (
                  <li
                    key={a.id}
                    className="animate-fade-in flex items-start gap-3 border-b py-3 last:border-0"
                    style={{ animationDelay: `${i * 25}ms`, borderColor: "var(--border-secondary)" }}
                  >
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[--accent-orange]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-[--text-primary]">{a.action}</p>
                      <p className="text-[12px] text-[--text-quaternary]">{a.actor ?? "system"}</p>
                    </div>
                    <time className="shrink-0 text-[11px] tabular-nums text-[--text-quaternary]">
                      {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Integration health">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-secondary)" }}>
                <div>
                  <div className="text-[14px] font-semibold text-[--text-primary]">Jira</div>
                  <div className="text-[12px] text-[--text-tertiary]">Stories &amp; webhooks</div>
                </div>
                <Badge variant={jiraOk ? "ok" : "warn"}>{jiraOk ? "Connected" : "Not connected"}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-secondary)" }}>
                <div>
                  <div className="text-[14px] font-semibold text-[--text-primary]">Jenkins</div>
                  <div className="text-[12px] text-[--text-tertiary]">Jobs &amp; runs ingest</div>
                </div>
                <Badge variant={jenOk ? "ok" : "warn"}>{jenOk ? "Connected" : "Not connected"}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
