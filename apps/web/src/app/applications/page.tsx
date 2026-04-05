"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, DataTable } from "@/components/ui";

export default function ApplicationsPage() {
  const q = useQuery({ queryKey: ["applications"], queryFn: api.applications });
  if (q.isLoading) return <p className="text-zinc-500">Loading applications…</p>;
  if (q.isError) return <p className="text-rose-400">Failed to load applications.</p>;
  if (!q.data) return null;
  const rows = q.data.map((a) => [
    <Link key={a.id} href={`/applications/${a.id}`} className="text-sky-400 hover:underline">
      {a.name}
    </Link>,
    a.baseUrl,
    a.jiraProjectKey ?? "—",
    a.jenkinsJobName ?? "—",
    a.environmentCount,
    a.suiteCount,
  ]);
  return (
    <div className="space-y-6">
      <Card title="Applications under test">
        <p className="mb-4 text-sm text-zinc-500">
          Configure base URLs, environments, credentials, and mappings to Jira and Jenkins.
        </p>
        <DataTable
          columns={["Name", "Base URL", "Jira project", "Jenkins job", "Envs", "Suites"]}
          rows={rows as unknown as (string | number | null)[][]}
        />
      </Card>
    </div>
  );
}
