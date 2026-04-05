"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, MetricPill } from "@/components/ui";

export default function OverviewPage() {
  const q = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  if (q.isLoading) return <p className="text-zinc-500">Loading overview…</p>;
  if (q.isError) return <p className="text-rose-400">Failed to load overview. Is the API running?</p>;
  if (!q.data) return null;
  const d = q.data;
  const risk =
    d.releaseRisk === "high" ? "bad" : d.releaseRisk === "medium" ? "warn" : ("good" as const);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricPill label="Pass rate" value={`${(d.passRate * 100).toFixed(1)}%`} tone="good" />
        <MetricPill label="Failure rate" value={`${(d.failureRate * 100).toFixed(1)}%`} tone="bad" />
        <MetricPill label="Flaky rate" value={`${(d.flakyRate * 100).toFixed(1)}%`} tone="warn" />
        <MetricPill label="Active runs" value={String(d.activeRuns)} tone="neutral" />
        <MetricPill
          label="Release risk"
          value={d.releaseRisk.toUpperCase()}
          tone={risk === "good" ? "good" : risk === "warn" ? "warn" : "bad"}
        />
      </div>
      <Card title="Recent activity">
        <ul className="space-y-2 text-sm text-zinc-400">
          {d.recentActivity.map((a) => (
            <li key={a.id} className="flex justify-between gap-4 border-b border-zinc-800/80 py-2 last:border-0">
              <span>
                <span className="text-zinc-200">{a.action}</span>
                {a.actor ? <span className="text-zinc-500"> · {a.actor}</span> : null}
              </span>
              <span className="shrink-0 text-xs text-zinc-600">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
