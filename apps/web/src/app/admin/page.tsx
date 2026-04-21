"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Card, DataTable, EmptyState, Skeleton } from "@/components/ui";

type AdminTab = "rules" | "prompts" | "tools" | "audit";

const tabs: { id: AdminTab; label: string }[] = [
  { id: "rules", label: "Rules" },
  { id: "prompts", label: "Prompts" },
  { id: "tools", label: "Tools" },
  { id: "audit", label: "Audit" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("rules");
  const rules = useQuery({ queryKey: ["admin-rules"], queryFn: api.adminRules });
  const prompts = useQuery({ queryKey: ["admin-prompts"], queryFn: api.adminPrompts });
  const audit = useQuery({ queryKey: ["admin-audit"], queryFn: api.adminAudit });
  const tools = useQuery({ queryKey: ["admin-tools"], queryFn: api.adminTools });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold tracking-tight text-[--text-primary]">Admin</h1>
        <p className="mt-1 max-w-xl text-[14px] text-[--text-tertiary]">Rules, prompts, tool registry, and audit trail for the platform.</p>
      </div>

      <div className="animate-fade-in inline-flex rounded-2xl border p-1" role="tablist" style={{ borderColor: "var(--border-primary)", background: "var(--bg-secondary)" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors ${
              tab === t.id
                ? "bg-[--color-primary-soft] text-[--color-primary]"
                : "text-[--text-tertiary] hover:text-[--text-secondary]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === "rules" && (
          <Card title="Rules" noPadding>
            {rules.isError ? <p className="p-5 text-[13px] text-[--accent-red]">Failed to load rules.</p>
              : rules.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
              : (rules.data?.length ?? 0) === 0 ? <EmptyState title="No rules" description="Automation and guardrail rules will appear here." />
              : <DataTable columns={["Key", "Name", "Enabled", "Config"]} rows={(rules.data ?? []).map((r) => [r.key, r.name, <Badge key={r.id} variant={r.isEnabled ? "ok" : "default"}>{r.isEnabled ? "On" : "Off"}</Badge>, <code key={`c-${r.id}`} className="max-w-md truncate font-mono text-[11px] text-[--text-tertiary]">{r.configJson}</code>])} />}
          </Card>
        )}

        {tab === "prompts" && (
          <Card title="Prompts">
            {prompts.isError ? <p className="text-[13px] text-[--accent-red]">Failed to load prompts.</p>
              : prompts.isLoading ? <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="space-y-2 rounded-xl border p-4" style={{ borderColor: "var(--border-secondary)" }}><Skeleton className="h-4 w-2/3 rounded-lg" /><Skeleton className="h-24 w-full rounded-xl" /></div>)}</div>
              : (prompts.data?.length ?? 0) === 0 ? <EmptyState title="No prompts" description="Agent prompt templates are managed here." />
              : <ul className="space-y-4">{(prompts.data ?? []).map((p, idx) => (
                <li key={p.id} className="animate-fade-in rounded-2xl border bg-[--bg-surface] p-5" style={{ animationDelay: `${idx * 40}ms`, borderColor: "var(--border-secondary)" }}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-[15px] font-bold text-[--text-primary]">{p.title}</h3>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">{p.key} · v{p.version}</span>
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border p-4 font-mono text-[11px] leading-relaxed text-[--text-secondary]" style={{ borderColor: "var(--border-secondary)", background: "var(--bg-inset)" }}>{p.body}</pre>
                </li>
              ))}</ul>}
          </Card>
        )}

        {tab === "tools" && (
          <Card title="Tools" noPadding>
            <p className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Future: Cursor / MCP registry</p>
            {tools.isError ? <p className="p-5 text-[13px] text-[--accent-red]">Failed to load tools.</p>
              : tools.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
              : (tools.data?.tools.length ?? 0) === 0 ? <EmptyState title="No tools registered" description="External tools and MCP servers will list here." />
              : <DataTable columns={["ID", "Name", "Status", "Description"]} rows={(tools.data?.tools ?? []).map((t) => [t.id, t.name, <Badge key={t.id} variant="default">{t.status}</Badge>, t.description])} />}
          </Card>
        )}

        {tab === "audit" && (
          <Card title="Audit" noPadding>
            {audit.isError ? <p className="p-5 text-[13px] text-[--accent-red]">Failed to load audit log.</p>
              : audit.isLoading ? <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
              : (audit.data?.length ?? 0) === 0 ? <EmptyState title="No audit entries" description="Administrative actions will be recorded here." />
              : <DataTable columns={["Time", "Actor", "Action", "Resource"]} rows={(audit.data ?? []).map((a) => [<span className="text-[--text-tertiary]" key={a.id}>{new Date(a.createdAt).toLocaleString()}</span>, a.actor ?? "-", a.action, a.resource ?? "-"])} />}
          </Card>
        )}
      </div>
    </div>
  );
}
