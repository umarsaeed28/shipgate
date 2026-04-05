"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Badge, Card, DataTable, MetricPill } from "@/components/ui";

const STATUS_TONE: Record<string, "ok" | "err" | "default"> = {
  completed: "ok",
  failed: "err",
};

export default function PipelinesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pipelines"], queryFn: api.pipelines });
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const [appId, setAppId] = useState("");
  const [framework, setFramework] = useState("codeceptjs");
  const [prompt, setPrompt] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createPipeline({
        applicationId: appId,
        framework,
        promptMarkdown: prompt || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pipelines"] });
    },
  });

  const running = q.data?.filter((p) => !["completed", "failed"].includes(p.status)).length ?? 0;
  const completed = q.data?.filter((p) => p.status === "completed").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI Pipeline</h2>
        <p className="text-sm text-zinc-500">
          Ingest user stories → Plan tests → Generate scripts → Execute → Auto-heal → Report
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricPill label="Total runs" value={String(q.data?.length ?? 0)} />
        <MetricPill label="Running" value={String(running)} tone={running > 0 ? "warn" : "neutral"} />
        <MetricPill label="Completed" value={String(completed)} tone="good" />
        <MetricPill
          label="With healing"
          value={String(q.data?.filter((p) => (p.totalHealed ?? 0) > 0).length ?? 0)}
          tone="warn"
        />
      </div>

      <Card title="Launch new pipeline">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-zinc-500">Application</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            >
              <option value="">Select app…</option>
              {apps.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.baseUrl})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Framework</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
            >
              <option value="codeceptjs">CodeceptJS</option>
              <option value="playwright">Playwright</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-zinc-500">Prompt instructions (optional)</span>
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
              rows={3}
              placeholder="Focus on checkout flows, cover accessibility, include negative tests for payment forms…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            disabled={!appId || create.isPending}
            onClick={() => create.mutate()}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
          >
            Run pipeline
          </button>
          {create.isSuccess && (
            <span className="text-sm text-emerald-400">
              Pipeline <code className="text-xs">{create.data.id.slice(0, 12)}</code> queued
            </span>
          )}
        </div>
      </Card>

      <Card title="Pipeline runs">
        {q.isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : !q.data?.length ? (
          <p className="text-zinc-500">No pipeline runs yet. Launch one above.</p>
        ) : (
          <DataTable
            columns={["Run", "App", "Status", "Framework", "Planned", "Passed", "Failed", "Healed", "Duration"]}
            rows={q.data.map((p) => [
              <Link key={p.id} href={`/pipelines/${p.id}`} className="text-sky-400 hover:underline">
                {p.id.slice(0, 10)}…
              </Link>,
              p.applicationName,
              <Badge key={p.id + "s"} variant={STATUS_TONE[p.status] ?? "default"}>
                {p.status}
              </Badge>,
              p.framework,
              p.totalPlanned ?? "—",
              p.totalPassed ?? "—",
              p.totalFailed ?? "—",
              p.totalHealed ?? "—",
              p.durationMs != null ? `${(p.durationMs / 1000).toFixed(1)}s` : "—",
            ])}
          />
        )}
      </Card>
    </div>
  );
}
