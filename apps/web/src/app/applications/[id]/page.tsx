"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const q = useQuery({ queryKey: ["application", id], queryFn: () => api.application(id), enabled: !!id });
  if (q.isLoading) return <p className="text-zinc-500">Loading…</p>;
  if (q.isError || !q.data) return <p className="text-rose-400">Application not found.</p>;
  const a = q.data;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{a.name}</h2>
        <p className="text-sm text-zinc-500">{a.baseUrl}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Environments">
          <ul className="space-y-2 text-sm">
            {a.environments.map((e) => (
              <li key={e.id} className="flex justify-between border-b border-zinc-800 py-2">
                <span className="font-medium text-zinc-200">{e.name}</span>
                <span className="text-zinc-500">{e.baseUrl ?? a.baseUrl}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Linked suites">
          <ul className="space-y-2 text-sm">
            {a.suites.map((s) => (
              <li key={s.id} className="flex justify-between border-b border-zinc-800 py-2">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-zinc-500">{s.tags.join(", ") || "—"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Mappings & credentials (opaque)">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Jira project</dt>
            <dd className="text-zinc-200">{a.jiraProjectKey ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Jenkins job</dt>
            <dd className="text-zinc-200">{a.jenkinsJobName ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Credentials (JSON blob)</dt>
            <dd className="mt-1 rounded-md bg-zinc-950 p-3 font-mono text-xs text-zinc-400">{a.credentialsJson}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
