"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card } from "@/components/ui";

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const q = useQuery({ queryKey: ["application", id], queryFn: () => api.application(id), enabled: !!id });
  if (q.isLoading) return <p className="py-8 text-[--text-tertiary] animate-fade-in">Loading…</p>;
  if (q.isError || !q.data) return <p className="py-8 text-[--accent-red] animate-fade-in">Application not found.</p>;
  const a = q.data;
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold text-[--text-primary]">{a.name}</h1>
        <p className="mt-1 text-[14px] text-[--text-tertiary]">{a.baseUrl}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Environments">
          <ul className="space-y-0 text-[13px]">
            {a.environments.map((e) => (
              <li key={e.id} className="flex justify-between border-b py-2.5 last:border-0" style={{ borderColor: "var(--border-secondary)" }}>
                <span className="font-semibold text-[--text-primary]">{e.name}</span>
                <span className="font-mono text-[12px] text-[--text-tertiary]">{e.baseUrl ?? a.baseUrl}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Linked suites">
          <ul className="space-y-0 text-[13px]">
            {a.suites.map((s) => (
              <li key={s.id} className="flex justify-between border-b py-2.5 last:border-0" style={{ borderColor: "var(--border-secondary)" }}>
                <span className="text-[--text-primary]">{s.name}</span>
                <span className="text-[--text-tertiary]">{s.tags.join(", ") || "-"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Mappings & credentials">
        <dl className="grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-2">
          <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Jira project</dt><dd className="mt-1 text-[--text-primary]">{a.jiraProjectKey ?? "-"}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Jenkins job</dt><dd className="mt-1 text-[--text-primary]">{a.jenkinsJobName ?? "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wider text-[--text-quaternary]">Credentials (JSON)</dt><dd className="mt-2 rounded-xl border p-4 font-mono text-[12px] text-[--text-secondary]" style={{ borderColor: "var(--border-secondary)", background: "var(--bg-inset)" }}>{a.credentialsJson}</dd></div>
        </dl>
      </Card>
    </div>
  );
}
