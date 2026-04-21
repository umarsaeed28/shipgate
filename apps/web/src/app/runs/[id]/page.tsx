"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Button, Card } from "@/components/ui";

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["run", id], queryFn: () => api.run(id), enabled: !!id });
  const analyze = useMutation({ mutationFn: () => api.analyzeRun(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["run", id] }) });

  if (q.isLoading) return <p className="py-8 text-[--text-tertiary] animate-fade-in">Loading run…</p>;
  if (q.isError || !q.data) return <p className="py-8 text-[--accent-red] animate-fade-in">Run not found.</p>;
  const r = q.data;
  const codeBlockStyle = { borderColor: "var(--border-secondary)", background: "var(--bg-inset)" };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-[24px] font-bold text-[--text-primary]">Run {r.id.slice(0, 12)}…</h1>
          <p className="mt-1 text-[14px] text-[--text-tertiary]">{r.suite.name}{r.environment ? ` · ${r.environment.name}` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button variant="secondary" size="sm" disabled={analyze.isPending} onClick={() => analyze.mutate()}>Analyze failures</Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Logs"><pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-[12px] text-[--text-secondary] rounded-xl border p-4" style={codeBlockStyle}>{r.logs ?? "No logs captured."}</pre></Card>
        <Card title="Failure breakdown">
          <ul className="space-y-2 text-[13px]">
            {r.failures.length === 0 ? <li className="text-[--text-tertiary]">No failures recorded.</li> : r.failures.map((f) => (
              <li key={f.id} className="rounded-xl border p-4" style={{ borderColor: "var(--border-secondary)" }}>
                <div className="font-semibold text-[--accent-red]">{f.caseName ?? "Unknown case"}</div>
                <div className="mt-1 text-[12px] text-[--text-secondary]">{f.message}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Analyzer output">
        {r.analyses.length === 0 ? <p className="text-[13px] text-[--text-tertiary]">No analysis yet. Click &quot;Analyze failures&quot; above.</p> : (
          <ul className="space-y-3">
            {r.analyses.map((a) => (
              <li key={a.id} className="rounded-xl border p-4 text-[13px]" style={{ borderColor: "var(--border-secondary)" }}>
                <div className="flex flex-wrap items-center gap-2"><Badge>{a.classification}</Badge><span className="text-[11px] text-[--text-quaternary]">{(a.confidence * 100).toFixed(0)}% confidence</span></div>
                <p className="mt-2 text-[--text-primary]">{a.summary}</p>
                {a.suggestedAction && <p className="mt-1 text-[--text-tertiary]">{a.suggestedAction}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
