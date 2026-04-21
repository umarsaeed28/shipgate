"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, Card, DataTable, MetricPill } from "@/components/ui";

const STATUS_TONE: Record<string, "ok" | "err" | "default"> = { completed: "ok", failed: "err" };

const inputClass =
  "mt-1.5 w-full rounded-xl border bg-[--bg-inset] px-4 py-2.5 text-[14px] text-[--text-primary] outline-none transition-colors placeholder:text-[--text-quaternary] focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20";

export default function PipelinesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pipelines"], queryFn: api.pipelines });
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const [appId, setAppId] = useState("");
  const [framework, setFramework] = useState("codeceptjs");
  const [prompt, setPrompt] = useState("");

  const create = useMutation({
    mutationFn: () => api.createPipeline({ applicationId: appId, framework, promptMarkdown: prompt || undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipelines"] }),
  });

  const running = q.data?.filter((p) => !["completed", "failed"].includes(p.status)).length ?? 0;
  const completed = q.data?.filter((p) => p.status === "completed").length ?? 0;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[20px] font-bold tracking-tight text-[--text-primary]">AI Pipeline</h1>
        <p className="mt-1 text-[13px] text-[--text-tertiary]">Ingest stories &rarr; Plan &rarr; Generate &rarr; Execute &rarr; Heal &rarr; Report</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricPill label="Total runs" value={String(q.data?.length ?? 0)} />
        <MetricPill label="Running" value={String(running)} tone={running > 0 ? "warn" : "neutral"} />
        <MetricPill label="Completed" value={String(completed)} tone="good" />
        <MetricPill label="With healing" value={String(q.data?.filter((p) => (p.totalHealed ?? 0) > 0).length ?? 0)} tone="warn" />
      </div>

      <Card title="Launch new pipeline">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Application</span>
            <select className={inputClass} style={{ borderColor: "var(--border-primary)" }} value={appId} onChange={(e) => setAppId(e.target.value)}>
              <option value="">Select app…</option>
              {apps.data?.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.baseUrl})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Framework</span>
            <select className={inputClass} style={{ borderColor: "var(--border-primary)" }} value={framework} onChange={(e) => setFramework(e.target.value)}>
              <option value="codeceptjs">CodeceptJS</option>
              <option value="playwright">Playwright</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Prompt (optional)</span>
            <textarea className={`${inputClass} resize-none`} style={{ borderColor: "var(--border-primary)" }} rows={3} placeholder="Focus on checkout flows…" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </label>
        </div>
        <div className="mt-5 flex items-center gap-4 border-t pt-5" style={{ borderColor: "var(--border-secondary)" }}>
          <Button disabled={!appId || create.isPending} onClick={() => create.mutate()}>Run pipeline</Button>
          {create.isSuccess && <span className="text-[13px] text-[--accent-green] animate-fade-in font-medium">Pipeline <code className="text-[11px] font-mono">{create.data.id.slice(0, 12)}</code> queued</span>}
        </div>
      </Card>

      <Card title="Pipeline runs" noPadding>
        {q.isLoading ? <p className="p-5 text-[13px] text-[--text-tertiary]">Loading…</p> : !q.data?.length ? <p className="p-5 text-[13px] text-[--text-tertiary]">No pipeline runs yet.</p> : (
          <DataTable
            columns={["Run", "App", "Status", "Framework", "Planned", "Passed", "Failed", "Healed", "Duration"]}
            rows={q.data.map((p) => [
              <Link key={p.id} href={`/pipelines/${p.id}`} className="font-mono text-[12px] text-[--color-primary] hover:underline">{p.id.slice(0, 10)}…</Link>,
              p.applicationName,
              <Badge key={p.id + "s"} variant={STATUS_TONE[p.status] ?? "default"}>{p.status}</Badge>,
              p.framework, p.totalPlanned ?? "-", p.totalPassed ?? "-", p.totalFailed ?? "-", p.totalHealed ?? "-",
              p.durationMs != null ? `${(p.durationMs / 1000).toFixed(1)}s` : "-",
            ])}
          />
        )}
      </Card>
    </div>
  );
}
