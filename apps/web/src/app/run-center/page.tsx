"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, Card, MetricPill, Skeleton } from "@/components/ui";

const selectClass =
  "w-full appearance-none rounded-xl border bg-[--bg-inset] px-4 py-3 text-[14px] text-[--text-primary] outline-none transition-colors focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20 disabled:cursor-not-allowed disabled:opacity-40";

function PipelineSteps({ active }: { active: boolean }) {
  const steps = ["Queue", "Checkout", "Tests", "Report"];
  const idx = active ? 2 : 0;
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((label, i) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium"
          style={{
            borderColor: "var(--border-secondary)",
            background: i <= idx && active ? "var(--color-primary-soft)" : "var(--bg-surface)",
            color: i <= idx && active ? "var(--color-primary)" : "var(--text-tertiary)",
          }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{
              background: i < idx ? "var(--accent-green)" : i === idx && active ? "var(--accent-blue)" : "var(--text-quaternary)",
            }}
          >
            {i + 1}
          </span>
          {label}
        </div>
      ))}
    </div>
  );
}

function LiveLogPanel({ active }: { active: boolean }) {
  const lines = useMemo(
    () =>
      active
        ? [
            "[runner] Allocating agent…",
            "[runner] Resolving suite manifest",
            "[tests] shard 1/1 starting",
            "[tests] executing scenarios…",
          ]
        : ["[system] Idle - start a run to stream logs"],
    [active],
  );
  return (
    <div
      className="max-h-[220px] overflow-auto rounded-xl border p-3 font-mono text-[11px] leading-relaxed text-[--text-secondary]"
      style={{ borderColor: "var(--border-secondary)", background: "var(--bg-inset)" }}
    >
      {lines.map((line, i) => (
        <div key={i} className="border-b border-[--border-secondary]/60 py-1 last:border-0">
          {line}
        </div>
      ))}
    </div>
  );
}

export default function RunCenterPage() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const suites = useQuery({ queryKey: ["suites"], queryFn: api.suites });
  const runs = useQuery({ queryKey: ["runs"], queryFn: api.runs, refetchInterval: 3000 });
  const [appId, setAppId] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [envId, setEnvId] = useState("");

  const detail = useQuery({
    queryKey: ["application", appId],
    queryFn: () => api.application(appId),
    enabled: !!appId,
  });

  const run = useMutation({
    mutationFn: async () => {
      if (!suiteId) throw new Error("Select a suite");
      return api.runSuite(suiteId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  const filteredSuites = suites.data?.filter((s) => !appId || s.applicationId === appId) ?? [];
  const recentRuns = runs.data?.slice(0, 6) ?? [];
  const activeRuns = runs.data?.filter((r) => r.status === "running" || r.status === "in_progress") ?? [];
  const hasActive = activeRuns.length > 0;

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold tracking-tight text-[--text-primary]">Run Center</h1>
        <p className="mt-1 text-[14px] text-[--text-tertiary]">
          Select application and suite, choose environment, then start or monitor executions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricPill label="Applications" value={String(apps.data?.length ?? 0)} />
        <MetricPill label="Suites (filtered)" value={String(filteredSuites.length)} />
        <MetricPill label="Active runs" value={String(activeRuns.length)} tone={activeRuns.length > 0 ? "warn" : "neutral"} />
        <MetricPill label="Total runs" value={String(runs.data?.length ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left - selectors */}
        <div className="space-y-4 lg:col-span-3">
          <Card title="Selection">
            <div className="space-y-4">
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[--text-quaternary]">Application</span>
                {apps.isLoading ? (
                  <Skeleton className="mt-2 h-12 rounded-xl" />
                ) : (
                  <select
                    className={selectClass}
                    style={{ borderColor: "var(--border-primary)" }}
                    value={appId}
                    onChange={(e) => {
                      setAppId(e.target.value);
                      setSuiteId("");
                      setEnvId("");
                    }}
                  >
                    <option value="">Select application…</option>
                    {apps.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[--text-quaternary]">Test suite</span>
                {suites.isLoading ? (
                  <Skeleton className="mt-2 h-12 rounded-xl" />
                ) : (
                  <select
                    className={selectClass}
                    style={{ borderColor: "var(--border-primary)" }}
                    value={suiteId}
                    onChange={(e) => setSuiteId(e.target.value)}
                    disabled={!appId}
                  >
                    <option value="">Select suite…</option>
                    {filteredSuites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>
          </Card>
        </div>

        {/* Center - controls */}
        <div className="space-y-4 lg:col-span-5">
          <Card title="Run controls">
            <div className="space-y-5">
              <label className="block">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-[--text-quaternary]">Environment</span>
                {appId && detail.isLoading ? (
                  <Skeleton className="mt-2 h-12 rounded-xl" />
                ) : (
                  <select
                    className={selectClass}
                    style={{ borderColor: "var(--border-primary)" }}
                    value={envId}
                    onChange={(e) => setEnvId(e.target.value)}
                    disabled={!appId}
                  >
                    <option value="">Default environment</option>
                    {detail.data?.environments.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} - {e.baseUrl ?? detail.data?.baseUrl}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <div className="flex flex-wrap gap-3 border-t pt-4" style={{ borderColor: "var(--border-secondary)" }}>
                <Button disabled={!suiteId || run.isPending} onClick={() => run.mutate()}>
                  {run.isPending ? "Starting…" : "Start run"}
                </Button>
                <Button variant="secondary" disabled>
                  Stop
                </Button>
              </div>
              {run.isSuccess && (
                <p className="animate-fade-in text-[14px] font-medium text-[--accent-green]">
                  Queued{" "}
                  <code className="rounded-lg bg-[--accent-green-soft] px-2 py-0.5 font-mono text-[12px]">{run.data.runId}</code>
                </p>
              )}
              {run.isError && <p className="animate-fade-in text-[14px] text-[--accent-red]">{(run.error as Error).message}</p>}

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[--text-quaternary]">Pipeline</p>
                <PipelineSteps active={hasActive} />
              </div>
            </div>
          </Card>
        </div>

        {/* Right - live */}
        <div className="space-y-4 lg:col-span-4">
          <Card title="Live logs">
            <LiveLogPanel active={hasActive} />
          </Card>

          <Card title="Progress &amp; status">
            {activeRuns.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[14px] text-[--text-secondary]">No active runs</p>
                <p className="mt-1 text-[12px] text-[--text-quaternary]">Start a suite to see live status</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRuns.map((r) => (
                  <div key={r.id} className="rounded-xl border bg-[--bg-surface] p-3.5" style={{ borderColor: "var(--border-secondary)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-[--text-primary]">{r.suiteName}</span>
                      <Badge variant="running">{r.status}</Badge>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[--bg-inset]">
                      <div
                        className="h-full rounded-full animate-pulse"
                        style={{ width: "55%", background: "var(--gradient-primary)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Recent runs">
            {recentRuns.length === 0 ? (
              <p className="py-4 text-center text-[14px] text-[--text-tertiary]">No runs yet</p>
            ) : (
              <div className="space-y-0">
                {recentRuns.map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/runs/${r.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg border-b px-2 py-2.5 transition-colors last:border-0 hover:bg-[--bg-hover]"
                    style={{ borderColor: "var(--border-secondary)", animationDelay: `${i * 20}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-[--text-primary]">{r.suiteName}</div>
                      <div className="text-[12px] text-[--text-quaternary]">
                        {r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : "-"}
                      </div>
                    </div>
                    <Badge
                      variant={
                        r.status === "passed"
                          ? "ok"
                          : r.status === "failed"
                            ? "err"
                            : r.status === "running" || r.status === "in_progress"
                              ? "running"
                              : "default"
                      }
                    >
                      {r.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
