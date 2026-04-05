"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Badge, Card } from "@/components/ui";

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["run", id], queryFn: () => api.run(id), enabled: !!id });
  const analyze = useMutation({
    mutationFn: () => api.analyzeRun(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["run", id] }),
  });
  if (q.isLoading) return <p className="text-zinc-500">Loading run…</p>;
  if (q.isError || !q.data) return <p className="text-rose-400">Run not found.</p>;
  const r = q.data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Run {r.id.slice(0, 12)}…</h2>
          <p className="text-sm text-zinc-500">
            {r.suite.name}
            {r.environment ? ` · ${r.environment.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={r.status === "passed" ? "ok" : r.status === "failed" ? "err" : "default"}>{r.status}</Badge>
          <button
            type="button"
            onClick={() => analyze.mutate()}
            disabled={analyze.isPending}
            className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
          >
            Analyze failures
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Logs">
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-400">
            {r.logs ?? "No logs captured."}
          </pre>
        </Card>
        <Card title="Failure breakdown">
          <ul className="space-y-3 text-sm">
            {r.failures.length === 0 ? (
              <li className="text-zinc-500">No failures recorded.</li>
            ) : (
              r.failures.map((f) => (
                <li key={f.id} className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
                  <div className="font-medium text-rose-300">{f.caseName ?? "Unknown case"}</div>
                  <div className="mt-1 text-zinc-400">{f.message}</div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
      <Card title="Analyzer output">
        {r.analyses.length === 0 ? (
          <p className="text-sm text-zinc-500">No analysis yet. Use &quot;Analyze failures&quot; to invoke the regression agent.</p>
        ) : (
          <ul className="space-y-3">
            {r.analyses.map((a) => (
              <li key={a.id} className="rounded-md border border-zinc-800 p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge>{a.classification}</Badge>
                  <span className="text-zinc-500">confidence {(a.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-2 text-zinc-300">{a.summary}</p>
                {a.suggestedAction ? <p className="mt-1 text-zinc-500">{a.suggestedAction}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
