"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useState } from "react";

type Tab = "explorer" | "suggestions" | "activity" | "settings";

export default function ConductorPage() {
  const [tab, setTab] = useState<Tab>("explorer");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "explorer", label: "Test Explorer" },
    { id: "suggestions", label: "Agent Suggestions" },
    { id: "activity", label: "Activity" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Test Conductor</h1>
          <p className="text-sm text-zinc-400">
            AI agent monitors your code, suggests tests, and runs pipelines
          </p>
        </div>
        <div className="flex gap-2">
          <ScanButton />
          <RunPipelineButton />
        </div>
      </div>

      {/* Git Status Bar */}
      <GitStatusBar />

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-blue-500 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label}
            {t.id === "suggestions" && <SuggestionBadge />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {tab === "explorer" && (
          <ExplorerTab selectedFile={selectedFile} onSelectFile={setSelectedFile} />
        )}
        {tab === "suggestions" && <SuggestionsTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

// ─── Git Status Bar ──────────────────────────────────────────

function GitStatusBar() {
  const { data } = useQuery({ queryKey: ["conductor-git"], queryFn: api.conductorGitStatus, refetchInterval: 10000 });
  if (!data) return null;
  return (
    <div className="flex items-center gap-4 border-b border-zinc-800/50 bg-zinc-900/50 px-6 py-2 text-xs">
      <span className="text-zinc-500">Branch:</span>
      <span className="font-mono text-emerald-400">{data.branch}</span>
      {data.lastCommit && (
        <>
          <span className="text-zinc-600">|</span>
          <span className="font-mono text-zinc-400">{data.lastCommit.hash?.slice(0, 7)}</span>
          <span className="text-zinc-500 truncate max-w-xs">{data.lastCommit.message}</span>
        </>
      )}
      {data.changedFiles.length > 0 && (
        <>
          <span className="text-zinc-600">|</span>
          <span className="text-amber-400">{data.changedFiles.length} uncommitted change(s)</span>
        </>
      )}
      {data.clean && (
        <>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400">Clean</span>
        </>
      )}
    </div>
  );
}

// ─── Scan & Pipeline Buttons ─────────────────────────────────

function ScanButton() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["apps"], queryFn: api.applications });
  const scan = useMutation({
    mutationFn: (appId: string) => api.conductorScan(appId),
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["conductor-suggestions"] });
        qc.invalidateQueries({ queryKey: ["conductor-activity"] });
      }, 2000);
    },
  });
  const appId = apps.data?.[0]?.id;
  return (
    <button
      onClick={() => appId && scan.mutate(appId)}
      disabled={scan.isPending || !appId}
      className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
    >
      {scan.isPending ? "Scanning…" : "Scan for Tests"}
    </button>
  );
}

function RunPipelineButton() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["apps"], queryFn: api.applications });
  const run = useMutation({
    mutationFn: (appId: string) => api.conductorRunPipeline(appId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conductor-activity"] });
    },
  });
  const appId = apps.data?.[0]?.id;
  return (
    <button
      onClick={() => appId && run.mutate(appId)}
      disabled={run.isPending || !appId}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
    >
      {run.isPending ? "Starting…" : "Run Pipeline"}
    </button>
  );
}

function SuggestionBadge() {
  const { data } = useQuery({
    queryKey: ["conductor-suggestions", "pending"],
    queryFn: () => api.conductorSuggestions("pending"),
    refetchInterval: 5000,
  });
  if (!data?.length) return null;
  return (
    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
      {data.length}
    </span>
  );
}

// ─── Explorer Tab ────────────────────────────────────────────

function ExplorerTab({
  selectedFile,
  onSelectFile,
}: {
  selectedFile: string | null;
  onSelectFile: (f: string | null) => void;
}) {
  const files = useQuery({ queryKey: ["conductor-files"], queryFn: api.conductorFiles });
  const tests = useQuery({ queryKey: ["conductor-tests"], queryFn: api.conductorTests, refetchInterval: 5000 });
  const fileContent = useQuery({
    queryKey: ["conductor-file", selectedFile],
    queryFn: () => (selectedFile ? api.conductorFileContent(selectedFile) : Promise.resolve(null)),
    enabled: !!selectedFile,
  });

  return (
    <div className="flex h-full">
      {/* Left: File tree + Test tree */}
      <div className="w-80 shrink-0 border-r border-zinc-800 overflow-auto">
        {/* Test files */}
        <div className="border-b border-zinc-800 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Test Files
          </h3>
          {files.data?.testFiles.map((f) => (
            <button
              key={f.path}
              onClick={() => onSelectFile(f.path)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                selectedFile === f.path
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <span className="text-emerald-400 text-xs">TS</span>
              <span className="truncate">{f.name}</span>
              <span className="ml-auto text-xs text-zinc-600">{(f.size / 1024).toFixed(1)}k</span>
            </button>
          ))}
        </div>

        {/* App source files */}
        <div className="border-b border-zinc-800 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            App Source
          </h3>
          {files.data?.appFiles.map((f) => (
            <button
              key={f.path}
              onClick={() => onSelectFile(f.path)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                selectedFile === f.path
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <span className="text-blue-400 text-xs">JS</span>
              <span className="truncate">{f.name}</span>
              <span className="ml-auto text-xs text-zinc-600">{(f.size / 1024).toFixed(1)}k</span>
            </button>
          ))}
        </div>

        {/* Test Scenarios */}
        <div className="p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Test Scenarios ({tests.data?.reduce((n, t) => n + t.scenarios.length, 0) ?? 0})
          </h3>
          {tests.data?.map((t) => (
            <div key={t.file} className="mb-3">
              <button
                onClick={() => onSelectFile(t.file)}
                className="text-xs font-medium text-zinc-300 mb-1 hover:text-white transition-colors"
              >
                {t.feature}
              </button>
              {t.scenarios.map((s) => (
                <div
                  key={`${t.file}:${s.line}`}
                  className="flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto text-zinc-700">L{s.line}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right: File content viewer */}
      <div className="flex-1 overflow-auto">
        {selectedFile && fileContent.data ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono text-sm text-zinc-300">{selectedFile}</h3>
              <span className="text-xs text-zinc-600">{fileContent.data.lines} lines</span>
            </div>
            <pre className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-xs text-zinc-300 overflow-auto font-mono leading-relaxed">
              {fileContent.data.content.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 shrink-0 text-right text-zinc-600 select-none pr-3">
                    {i + 1}
                  </span>
                  <span>{line || " "}</span>
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
            Select a file to view its contents
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Suggestions Tab ─────────────────────────────────────────

function SuggestionsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const suggestions = useQuery({
    queryKey: ["conductor-suggestions", filter],
    queryFn: () => api.conductorSuggestions(filter === "all" ? undefined : filter),
    refetchInterval: 5000,
  });

  const approve = useMutation({
    mutationFn: api.conductorApprove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conductor-suggestions"] });
      qc.invalidateQueries({ queryKey: ["conductor-tests"] });
      qc.invalidateQueries({ queryKey: ["conductor-activity"] });
    },
  });

  const reject = useMutation({
    mutationFn: api.conductorReject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conductor-suggestions"] });
      qc.invalidateQueries({ queryKey: ["conductor-activity"] });
    },
  });

  const filters = ["pending", "approved", "written", "rejected", "all"];

  return (
    <div className="p-6">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {!suggestions.data?.length ? (
        <div className="rounded-lg border border-zinc-800 p-8 text-center text-zinc-500">
          {filter === "pending"
            ? 'No pending suggestions. Click "Scan for Tests" to analyze your code.'
            : `No ${filter} suggestions.`}
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.data.map((sug) => (
            <div
              key={sug.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={sug.status} />
                    <PriorityBadge priority={sug.priority} />
                    <span className="text-xs text-zinc-600 capitalize">{sug.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-white mb-1">{sug.title}</h4>
                  {sug.description && (
                    <p className="text-xs text-zinc-400 mb-2">{sug.description}</p>
                  )}
                  {sug.triggerReason && (
                    <p className="text-xs text-zinc-500 italic mb-2">
                      Reason: {sug.triggerReason}
                    </p>
                  )}
                  {sug.targetFile && (
                    <span className="text-xs font-mono text-zinc-600">
                      Target: {sug.targetFile}
                    </span>
                  )}
                </div>

                {sug.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approve.mutate(sug.id)}
                      disabled={approve.isPending}
                      className="rounded-md bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject.mutate(sug.id)}
                      disabled={reject.isPending}
                      className="rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Generated Code Preview */}
              {sug.generatedCode && (
                <details className="mt-3">
                  <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors">
                    View generated test code
                  </summary>
                  <pre className="mt-2 rounded-md bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300 font-mono overflow-auto">
                    {sug.generatedCode}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400",
    approved: "bg-blue-500/20 text-blue-400",
    written: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-zinc-700 text-zinc-400"}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    P0: "text-red-400",
    P1: "text-amber-400",
    P2: "text-blue-400",
    P3: "text-zinc-500",
  };
  return <span className={`text-xs font-semibold ${styles[priority] ?? "text-zinc-500"}`}>{priority}</span>;
}

// ─── Activity Tab ────────────────────────────────────────────

function ActivityTab() {
  const activity = useQuery({
    queryKey: ["conductor-activity"],
    queryFn: () => api.conductorActivity(),
    refetchInterval: 5000,
  });

  const typeIcons: Record<string, { icon: string; color: string }> = {
    scan: { icon: "S", color: "bg-blue-500/20 text-blue-400" },
    suggest: { icon: "A", color: "bg-amber-500/20 text-amber-400" },
    write: { icon: "W", color: "bg-emerald-500/20 text-emerald-400" },
    execute: { icon: "E", color: "bg-purple-500/20 text-purple-400" },
    watch: { icon: "O", color: "bg-zinc-500/20 text-zinc-400" },
  };

  return (
    <div className="p-6">
      {!activity.data?.length ? (
        <div className="rounded-lg border border-zinc-800 p-8 text-center text-zinc-500">
          No agent activity yet. Trigger a scan to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {activity.data.map((a) => {
            const t = typeIcons[a.type] ?? typeIcons.watch;
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3"
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${t.color}`}>
                  {t.icon}
                </div>
                <div className="flex-1">
                  <span className="text-sm text-zinc-200">{a.summary}</span>
                </div>
                <span className="text-xs text-zinc-600">
                  {new Date(a.createdAt).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ────────────────────────────────────────────

function SettingsTab() {
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ["conductor-config"], queryFn: api.conductorConfig });
  const update = useMutation({
    mutationFn: api.conductorUpdateConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-config"] }),
  });

  if (!config.data) return <div className="p-6 text-zinc-500">Loading…</div>;

  const c = config.data;

  return (
    <div className="mx-auto max-w-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Agent Configuration</h3>
      <div className="space-y-4">
        <ToggleSetting
          label="Auto-scan on file changes"
          description="Agent automatically scans when test or app files change"
          enabled={c.autoScanEnabled}
          onChange={(v) => update.mutate({ autoScanEnabled: v })}
        />
        <ToggleSetting
          label="Auto-run pipeline on approval"
          description="Automatically trigger the test pipeline when a suggestion is approved"
          enabled={c.autoRunOnApproval}
          onChange={(v) => update.mutate({ autoRunOnApproval: v })}
        />
        <div className="rounded-lg border border-zinc-800 p-4">
          <h4 className="text-sm font-medium text-zinc-200 mb-1">Watch Paths</h4>
          <p className="text-xs text-zinc-500 mb-2">Directories the agent monitors for changes</p>
          <div className="space-y-1">
            {c.watchPaths.map((p, i) => (
              <div key={i} className="rounded bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-400">
                {p}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-4">
      <div>
        <h4 className="text-sm font-medium text-zinc-200">{label}</h4>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? "bg-blue-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
