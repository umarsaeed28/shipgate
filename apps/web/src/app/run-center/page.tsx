"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

export default function RunCenterPage() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  const suites = useQuery({ queryKey: ["suites"], queryFn: api.suites });
  const [appId, setAppId] = useState<string>("");
  const [suiteId, setSuiteId] = useState<string>("");
  const [envId, setEnvId] = useState<string>("");

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  const filteredSuites = suites.data?.filter((s) => !appId || s.applicationId === appId) ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-zinc-500">
        Select an application, suite, and environment, then start a run. Execution is mocked locally and processed by the worker.
      </p>
      <Card title="Run configuration">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-zinc-500">Application</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={appId}
              onChange={(e) => {
                setAppId(e.target.value);
                setSuiteId("");
                setEnvId("");
              }}
            >
              <option value="">Select…</option>
              {apps.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-zinc-500">Suite</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={suiteId}
              onChange={(e) => setSuiteId(e.target.value)}
              disabled={!appId}
            >
              <option value="">Select…</option>
              {filteredSuites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-zinc-500">Environment</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              value={envId}
              onChange={(e) => setEnvId(e.target.value)}
              disabled={!appId || !detail.data}
            >
              <option value="">Default / optional</option>
              {detail.data?.environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-600">
              Environment selection is persisted for UX; the mock runner records the run without strict env binding in MVP.
            </p>
          </label>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => run.mutate()}
            disabled={!suiteId || run.isPending}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
          >
            Run tests
          </button>
          {run.isSuccess ? (
            <span className="text-sm text-emerald-400">
              Queued run <code className="text-xs">{run.data.runId}</code>
            </span>
          ) : null}
          {run.isError ? <span className="text-sm text-rose-400">{(run.error as Error).message}</span> : null}
        </div>
      </Card>
    </div>
  );
}
