"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, DataTable } from "@/components/ui";

export default function AdminPage() {
  const rules = useQuery({ queryKey: ["admin-rules"], queryFn: api.adminRules });
  const prompts = useQuery({ queryKey: ["admin-prompts"], queryFn: api.adminPrompts });
  const audit = useQuery({ queryKey: ["admin-audit"], queryFn: api.adminAudit });
  const tools = useQuery({ queryKey: ["admin-tools"], queryFn: api.adminTools });

  return (
    <div className="space-y-8">
      <div className="flex gap-2 border-b border-zinc-800 pb-2 text-sm">
        <span className="font-semibold text-zinc-200">Rules</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Prompts</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Tools</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Audit</span>
      </div>

      <Card title="Rules">
        {rules.isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <DataTable
            columns={["Key", "Name", "Enabled", "Config"]}
            rows={(rules.data ?? []).map((r) => [r.key, r.name, r.isEnabled ? "yes" : "no", r.configJson])}
          />
        )}
      </Card>

      <Card title="Prompts">
        {prompts.isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <ul className="space-y-4 text-sm">
            {(prompts.data ?? []).map((p) => (
              <li key={p.id} className="rounded-md border border-zinc-800 p-3">
                <div className="font-medium text-zinc-200">
                  {p.title}{" "}
                  <span className="text-zinc-500">
                    ({p.key} · v{p.version})
                  </span>
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-zinc-500">{p.body}</pre>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Tools (future: Cursor / MCP)">
        {tools.isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <DataTable
            columns={["ID", "Name", "Status", "Description"]}
            rows={(tools.data?.tools ?? []).map((t) => [t.id, t.name, t.status, t.description])}
          />
        )}
      </Card>

      <Card title="Audit">
        {audit.isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <DataTable
            columns={["Time", "Actor", "Action", "Resource"]}
            rows={(audit.data ?? []).map((a) => [
              new Date(a.createdAt).toLocaleString(),
              a.actor ?? "—",
              a.action,
              a.resource ?? "—",
            ])}
          />
        )}
      </Card>
    </div>
  );
}
