"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Card, MetricPill } from "@/components/ui";

const PHASE_ORDER = [
  "pending",
  "planning",
  "generating",
  "executing",
  "healing",
  "reporting",
  "completed",
  "failed",
];

function phaseTone(current: string, phase: string): string {
  const ci = PHASE_ORDER.indexOf(current);
  const pi = PHASE_ORDER.indexOf(phase);
  if (current === "failed" && phase === current) return "text-rose-400";
  if (pi < ci || current === "completed") return "text-emerald-400";
  if (pi === ci) return "text-amber-300 animate-pulse";
  return "text-zinc-600";
}

export default function PipelineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const q = useQuery({
    queryKey: ["pipeline", id],
    queryFn: () => api.pipeline(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s && !["completed", "failed"].includes(s) ? 2000 : false;
    },
  });

  if (q.isLoading) return <p className="text-zinc-500">Loading pipeline…</p>;
  if (q.isError || !q.data) return <p className="text-rose-400">Pipeline not found.</p>;
  const p = q.data;

  const scripts: Array<{ filename: string; content: string; caseRefs: string[] }> = p.generatedScriptsJson
    ? JSON.parse(p.generatedScriptsJson)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Pipeline {p.id.slice(0, 12)}…</h2>
          <p className="text-sm text-zinc-500">
            {p.applicationName} · {p.baseUrl} · {p.framework}
          </p>
        </div>
        <Badge variant={p.status === "completed" ? "ok" : p.status === "failed" ? "err" : "default"}>
          {p.status}
        </Badge>
      </div>

      {/* Phase tracker */}
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        {["planning", "generating", "executing", "healing", "reporting", "completed"].map((phase) => (
          <span key={phase} className={`rounded-full border border-zinc-700 px-3 py-1 ${phaseTone(p.status, phase)}`}>
            {phase}
          </span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <MetricPill label="Planned" value={String(p.totalPlanned ?? "—")} />
        <MetricPill label="Generated" value={String(p.totalGenerated ?? "—")} />
        <MetricPill label="Passed" value={String(p.totalPassed ?? "—")} tone="good" />
        <MetricPill label="Failed" value={String(p.totalFailed ?? "—")} tone={p.totalFailed ? "bad" : "neutral"} />
        <MetricPill label="Healed" value={String(p.totalHealed ?? "—")} tone={p.totalHealed ? "warn" : "neutral"} />
      </div>

      {p.promptMarkdown && (
        <Card title="Prompt instructions">
          <pre className="whitespace-pre-wrap text-sm text-zinc-400">{p.promptMarkdown}</pre>
        </Card>
      )}

      {p.testPlan && (
        <Card title="Test plan">
          <details>
            <summary className="cursor-pointer text-sm text-sky-400">
              {p.coverageSummary ?? "View plan"}
            </summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-400">
              {p.testPlan}
            </pre>
          </details>
        </Card>
      )}

      {scripts.length > 0 && (
        <Card title={`Generated scripts (${scripts.length} files)`}>
          <div className="space-y-4">
            {scripts.map((s) => (
              <details key={s.filename}>
                <summary className="cursor-pointer text-sm text-sky-400">
                  {s.filename} — {s.caseRefs.length} scenario(s)
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-400">
                  {s.content}
                </pre>
              </details>
            ))}
          </div>
        </Card>
      )}

      {p.executionLog && (
        <Card title="Execution log">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-400">
            {p.executionLog}
          </pre>
        </Card>
      )}

      {p.healerLog && (
        <Card title="Healer log">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-400">
            {p.healerLog}
          </pre>
        </Card>
      )}

      {p.reportMarkdown && (
        <Card title="Execution report">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-300">
            {p.reportMarkdown}
          </pre>
        </Card>
      )}

      {p.durationMs != null && (
        <p className="text-sm text-zinc-500">
          Total duration: {(p.durationMs / 1000).toFixed(1)}s
        </p>
      )}
    </div>
  );
}
