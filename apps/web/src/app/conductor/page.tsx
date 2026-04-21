"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useState } from "react";
import { Badge, Button, Skeleton } from "../../components/ui";

type Tab = "explorer" | "suggestions" | "activity" | "settings";

export default function ConductorPage() {
  const [tab, setTab] = useState<Tab>("explorer");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "explorer", label: "Explorer" },
    { id: "suggestions", label: "Suggestions" },
    { id: "activity", label: "Activity" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[--text-primary]">Test Conductor</h1>
          <p className="mt-1 text-[13px] text-[--text-tertiary]">AI agent that monitors code and suggests tests</p>
        </div>
        <div className="flex items-center gap-3">
          <GitStatusBar />
          <ScanButton />
          <RunPipelineButton />
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex items-center gap-1 rounded-2xl border p-1" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? "bg-[--color-primary-soft] text-[--color-primary]"
                : "text-[--text-tertiary] hover:text-[--text-secondary]"
            }`}
          >
            {t.label}
            {t.id === "suggestions" && <SuggestionCount />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-2xl border bg-[--bg-card] overflow-hidden" style={{ borderColor: "var(--border-primary)", minHeight: "calc(100vh - 280px)" }}>
        {tab === "explorer" && <ExplorerTab selectedFile={selectedFile} onSelectFile={setSelectedFile} />}
        {tab === "suggestions" && <SuggestionsTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function GitStatusBar() {
  const { data } = useQuery({ queryKey: ["conductor-git"], queryFn: api.conductorGitStatus, refetchInterval: 10000 });
  if (!data) return <Skeleton className="h-7 w-40 rounded-xl" />;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="rounded-xl bg-[--color-primary-soft] px-3 py-1 font-mono font-semibold text-[--color-primary]">{data.branch}</span>
      {data.changedFiles.length > 0 && (
        <span className="rounded-xl bg-[--accent-orange-soft] px-2.5 py-1 font-semibold text-[--accent-orange]">
          {data.changedFiles.length} change{data.changedFiles.length > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function ScanButton() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["apps"], queryFn: api.applications });
  const scan = useMutation({
    mutationFn: (appId: string) => api.conductorScan(appId),
    onSuccess: () => { setTimeout(() => { qc.invalidateQueries({ queryKey: ["conductor-suggestions"] }); qc.invalidateQueries({ queryKey: ["conductor-activity"] }); }, 2000); },
  });
  const appId = apps.data?.[0]?.id;
  return (
    <Button variant="secondary" size="sm" disabled={scan.isPending || !appId} onClick={() => appId && scan.mutate(appId)}>
      {scan.isPending ? "Scanning…" : "Scan"}
    </Button>
  );
}

function RunPipelineButton() {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["apps"], queryFn: api.applications });
  const run = useMutation({
    mutationFn: (appId: string) => api.conductorRunPipeline(appId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-activity"] }),
  });
  const appId = apps.data?.[0]?.id;
  return (
    <Button size="sm" disabled={run.isPending || !appId} onClick={() => appId && run.mutate(appId)}>
      {run.isPending ? "Starting…" : "Run Pipeline"}
    </Button>
  );
}

function SuggestionCount() {
  const { data } = useQuery({ queryKey: ["conductor-suggestions", "pending"], queryFn: () => api.conductorSuggestions("pending"), refetchInterval: 5000 });
  if (!data?.length) return null;
  return <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: "var(--gradient-primary)" }}>{data.length}</span>;
}

function ExplorerTab({ selectedFile, onSelectFile }: { selectedFile: string | null; onSelectFile: (f: string | null) => void }) {
  const files = useQuery({ queryKey: ["conductor-files"], queryFn: api.conductorFiles });
  const tests = useQuery({ queryKey: ["conductor-tests"], queryFn: api.conductorTests, refetchInterval: 5000 });
  const fileContent = useQuery({ queryKey: ["conductor-file", selectedFile], queryFn: () => selectedFile ? api.conductorFileContent(selectedFile) : Promise.resolve(null), enabled: !!selectedFile });

  return (
    <div className="flex h-full" style={{ minHeight: "calc(100vh - 280px)" }}>
      <div className="w-64 shrink-0 overflow-auto border-r p-3" style={{ borderColor: "var(--border-secondary)" }}>
        <Section title="Test Files">
          {files.data?.testFiles.map((f) => (
            <FileItem key={f.path} name={f.name} active={selectedFile === f.path} onClick={() => onSelectFile(f.path)} />
          ))}
        </Section>
        <Section title="App Source">
          {files.data?.appFiles.map((f) => (
            <FileItem key={f.path} name={f.name} active={selectedFile === f.path} onClick={() => onSelectFile(f.path)} />
          ))}
        </Section>
        <Section title={`Scenarios (${tests.data?.reduce((n, t) => n + t.scenarios.length, 0) ?? 0})`}>
          {tests.data?.map((t) => (
            <div key={t.file} className="mb-2">
              <button onClick={() => onSelectFile(t.file)} className="text-[12px] font-semibold text-[--text-primary] hover:text-[--color-primary] transition-colors px-2">{t.feature}</button>
              {t.scenarios.map((s) => (
                <div key={`${t.file}:${s.line}`} className="flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-[--text-tertiary]">
                  <span className="h-1 w-1 rounded-full bg-[--accent-green]" />
                  <span className="truncate">{s.name}</span>
                </div>
              ))}
            </div>
          ))}
        </Section>
      </div>
      <div className="flex-1 overflow-auto">
        {selectedFile && fileContent.data ? (
          <div className="p-5 animate-fade-in">
            <div className="mb-3 flex items-center justify-between rounded-xl border px-4 py-2.5" style={{ borderColor: "var(--border-secondary)", background: "var(--bg-secondary)" }}>
              <span className="font-mono text-[12px] text-[--text-secondary]">{selectedFile}</span>
              <span className="text-[11px] text-[--text-quaternary]">{fileContent.data.lines} lines</span>
            </div>
            <pre className="rounded-xl border p-4 text-[12px] text-[--text-secondary] font-mono leading-6 overflow-auto" style={{ borderColor: "var(--border-secondary)", background: "var(--bg-inset)" }}>
              {fileContent.data.content.split("\n").map((line, i) => (
                <div key={i} className="flex hover:bg-[--bg-hover] -mx-4 px-4">
                  <span className="w-10 shrink-0 text-right text-[--text-quaternary] select-none pr-4 tabular-nums">{i + 1}</span>
                  <span>{line || " "}</span>
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center animate-fade-in">
            <div className="text-center">
              <p className="text-[13px] text-[--text-secondary]">Select a file to view</p>
              <p className="mt-1 text-[12px] text-[--text-quaternary]">Choose from test files or app source</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-[--text-quaternary]">{title}</div>
      {children}
    </div>
  );
}

function FileItem({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors ${active ? "bg-[--color-primary-soft] text-[--color-primary] font-semibold" : "text-[--text-secondary] hover:bg-[--bg-hover]"}`}>
      <span className="truncate">{name}</span>
    </button>
  );
}

function SuggestionsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const suggestions = useQuery({ queryKey: ["conductor-suggestions", filter], queryFn: () => api.conductorSuggestions(filter === "all" ? undefined : filter), refetchInterval: 5000 });
  const approve = useMutation({ mutationFn: api.conductorApprove, onSuccess: () => { qc.invalidateQueries({ queryKey: ["conductor-suggestions"] }); qc.invalidateQueries({ queryKey: ["conductor-tests"] }); } });
  const reject = useMutation({ mutationFn: api.conductorReject, onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-suggestions"] }) });
  const filters = ["pending", "approved", "written", "rejected", "all"];

  return (
    <div className="p-5 overflow-auto">
      <div className="flex flex-wrap gap-1 mb-4">
        {filters.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors ${filter === f ? "bg-[--color-primary-soft] text-[--color-primary]" : "text-[--text-tertiary] hover:bg-[--bg-hover]"}`}>{f}</button>
        ))}
      </div>
      {!suggestions.data?.length ? (
        <div className="py-16 text-center animate-fade-in">
          <p className="text-[13px] text-[--text-secondary]">{filter === "pending" ? "No pending suggestions" : `No ${filter} suggestions`}</p>
          <p className="mt-1 text-[12px] text-[--text-quaternary]">{filter === "pending" ? "Click Scan to analyze code" : "Try a different filter"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.data.map((sug, i) => (
            <div key={sug.id} className="rounded-2xl border bg-[--bg-surface] p-5 animate-fade-in" style={{ animationDelay: `${i * 30}ms`, borderColor: "var(--border-secondary)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={sug.status === "pending" ? "warn" : sug.status === "approved" ? "default" : sug.status === "written" ? "ok" : "err"}>{sug.status}</Badge>
                    <span className="rounded-lg bg-[--bg-active] px-2 py-0.5 text-[11px] font-semibold text-[--text-tertiary]">{sug.priority}</span>
                    <span className="rounded-lg bg-[--bg-active] px-2 py-0.5 text-[11px] text-[--text-tertiary] capitalize">{sug.category}</span>
                  </div>
                  <h4 className="text-[13px] font-semibold text-[--text-primary]">{sug.title}</h4>
                  {sug.description && <p className="mt-1 text-[12px] text-[--text-tertiary] leading-relaxed">{sug.description}</p>}
                  {sug.targetFile && <div className="mt-2 font-mono text-[11px] text-[--text-quaternary]">{sug.targetFile}</div>}
                </div>
                {sug.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="primary" size="sm" disabled={approve.isPending} onClick={() => approve.mutate(sug.id)}>Approve</Button>
                    <Button variant="ghost" size="sm" disabled={reject.isPending} onClick={() => reject.mutate(sug.id)}>Reject</Button>
                  </div>
                )}
              </div>
              {sug.generatedCode && (
                <details className="mt-3">
                  <summary className="text-[12px] text-[--color-primary] cursor-pointer hover:underline font-semibold">View generated code</summary>
                  <pre className="mt-2 rounded-xl border p-3 text-[12px] text-[--text-secondary] font-mono overflow-auto" style={{ borderColor: "var(--border-secondary)", background: "var(--bg-inset)" }}>{sug.generatedCode}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTab() {
  const activity = useQuery({ queryKey: ["conductor-activity"], queryFn: () => api.conductorActivity(), refetchInterval: 5000 });
  return (
    <div className="p-5 overflow-auto">
      {!activity.data?.length ? (
        <div className="py-16 text-center animate-fade-in">
          <p className="text-[13px] text-[--text-secondary]">No activity yet</p>
          <p className="mt-1 text-[12px] text-[--text-quaternary]">Trigger a scan to get started</p>
        </div>
      ) : (
        <div className="space-y-0">
          {activity.data.map((a, i) => (
            <div key={a.id} className="flex items-center gap-3 border-b py-3 animate-fade-in" style={{ animationDelay: `${i * 20}ms`, borderColor: "var(--border-secondary)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[--text-primary] truncate">{a.summary}</p>
                <p className="text-[11px] text-[--text-quaternary] capitalize">{a.type}</p>
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-[--text-quaternary]">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const config = useQuery({ queryKey: ["conductor-config"], queryFn: api.conductorConfig });
  const update = useMutation({ mutationFn: api.conductorUpdateConfig, onSuccess: () => qc.invalidateQueries({ queryKey: ["conductor-config"] }) });
  if (!config.data) return <div className="p-6"><Skeleton className="h-48 rounded-2xl" /></div>;
  const c = config.data;
  return (
    <div className="mx-auto max-w-xl p-6 animate-fade-in">
      <h3 className="text-[15px] font-bold text-[--text-primary]">Agent Configuration</h3>
      <p className="mt-1 mb-5 text-[12px] text-[--text-tertiary]">Configure how the test conductor agent behaves</p>
      <div className="space-y-3">
        <ToggleRow label="Auto-scan on file changes" desc="Automatically scan when files change" enabled={c.autoScanEnabled} onChange={(v) => update.mutate({ autoScanEnabled: v })} />
        <ToggleRow label="Auto-run pipeline on approval" desc="Trigger pipeline when a suggestion is approved" enabled={c.autoRunOnApproval} onChange={(v) => update.mutate({ autoRunOnApproval: v })} />
        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border-primary)" }}>
          <h4 className="text-[13px] font-semibold text-[--text-primary] mb-2">Watch Paths</h4>
          <div className="space-y-1.5">{c.watchPaths.map((p, i) => <div key={i} className="rounded-xl bg-[--bg-inset] px-3 py-2 font-mono text-[12px] text-[--text-secondary]">{p}</div>)}</div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, enabled, onChange }: { label: string; desc: string; enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border p-4" style={{ borderColor: "var(--border-primary)" }}>
      <div className="pr-4"><h4 className="text-[13px] font-semibold text-[--text-primary]">{label}</h4><p className="mt-0.5 text-[12px] text-[--text-tertiary]">{desc}</p></div>
      <button onClick={() => onChange(!enabled)} className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${enabled ? "" : "bg-[--bg-active]"}`} style={enabled ? { background: "var(--gradient-primary)" } : undefined}>
        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-[21px]" : "left-[3px]"}`} />
      </button>
    </div>
  );
}
