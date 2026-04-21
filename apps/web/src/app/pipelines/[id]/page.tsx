"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Card, MetricPill } from "@/components/ui";

const PHASE_ORDER = ["pending", "planning", "generating", "executing", "healing", "reporting", "completed", "failed"];

function phaseTone(current: string, phase: string): string {
  const ci = PHASE_ORDER.indexOf(current);
  const pi = PHASE_ORDER.indexOf(phase);
  if (current === "failed" && phase === current) return "text-[--accent-red]";
  if (pi < ci || current === "completed") return "text-[--accent-green]";
  if (pi === ci) return "text-[--color-primary] animate-pulse";
  return "text-[--text-quaternary]";
}

const codeBlockStyle = { borderColor: "var(--border-secondary)", background: "var(--bg-inset)" };

export default function PipelineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const q = useQuery({
    queryKey: ["pipeline", id], queryFn: () => api.pipeline(id), enabled: !!id,
    refetchInterval: (query) => { const s = query.state.data?.status; return s && !["completed", "failed"].includes(s) ? 2000 : false; },
  });

  if (q.isLoading) return <p className="py-8 text-[--text-tertiary] animate-fade-in">Loading pipeline…</p>;
  if (q.isError || !q.data) return <p className="py-8 text-[--accent-red] animate-fade-in">Pipeline not found.</p>;
  const p = q.data;
  const scripts: Array<{ filename: string; content: string; caseRefs: string[] }> = p.generatedScriptsJson ? JSON.parse(p.generatedScriptsJson) : [];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-[20px] font-bold text-[--text-primary]">Pipeline {p.id.slice(0, 12)}…</h1>
          <p className="mt-1 text-[13px] text-[--text-tertiary]">{p.applicationName} · {p.baseUrl} · {p.framework}</p>
        </div>
        <Badge variant={p.status === "completed" ? "ok" : p.status === "failed" ? "err" : "default"}>{p.status}</Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[12px] font-semibold">
        {["planning", "generating", "executing", "healing", "reporting", "completed"].map((phase) => (
          <span key={phase} className={`rounded-xl border px-3.5 py-1.5 capitalize ${phaseTone(p.status, phase)}`} style={{ borderColor: "var(--border-primary)" }}>{phase}</span>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        <MetricPill label="Planned" value={String(p.totalPlanned ?? "-")} />
        <MetricPill label="Generated" value={String(p.totalGenerated ?? "-")} />
        <MetricPill label="Passed" value={String(p.totalPassed ?? "-")} tone="good" />
        <MetricPill label="Failed" value={String(p.totalFailed ?? "-")} tone={p.totalFailed ? "bad" : "neutral"} />
        <MetricPill label="Healed" value={String(p.totalHealed ?? "-")} tone={p.totalHealed ? "warn" : "neutral"} />
      </div>

      {p.promptMarkdown && <Card title="Prompt"><pre className="whitespace-pre-wrap text-[13px] text-[--text-secondary]">{p.promptMarkdown}</pre></Card>}
      {p.testPlan && (
        <Card title="Test plan">
          <details><summary className="cursor-pointer text-[13px] text-[--color-primary] hover:underline font-semibold">{p.coverageSummary ?? "View plan"}</summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-[12px] text-[--text-secondary]" style={codeBlockStyle}>{p.testPlan}</pre>
          </details>
        </Card>
      )}
      {scripts.length > 0 && (
        <Card title={`Generated scripts (${scripts.length})`}>
          <div className="space-y-3">{scripts.map((s) => (
            <details key={s.filename}><summary className="cursor-pointer text-[13px] text-[--color-primary] hover:underline font-semibold">{s.filename} - {s.caseRefs.length} scenario(s)</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl border p-4 font-mono text-[12px] text-[--text-secondary]" style={codeBlockStyle}>{s.content}</pre>
            </details>
          ))}</div>
        </Card>
      )}
      {p.executionLog && <Card title="Execution log"><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-[12px] text-[--text-secondary]" style={codeBlockStyle}>{p.executionLog}</pre></Card>}
      {p.healerLog && <Card title="Healer log"><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-[12px] text-[--text-secondary]" style={codeBlockStyle}>{p.healerLog}</pre></Card>}
      {p.reportMarkdown && <Card title="Report"><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-[12px] text-[--text-primary]" style={codeBlockStyle}>{p.reportMarkdown}</pre></Card>}
      {p.durationMs != null && <p className="text-[13px] text-[--text-tertiary]">Total duration: <span className="font-mono tabular-nums font-semibold text-[--text-primary]">{(p.durationMs / 1000).toFixed(1)}s</span></p>}
    </div>
  );
}
