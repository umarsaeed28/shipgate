"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Card, DataTable } from "@/components/ui";

export default function RunsPage() {
  const q = useQuery({ queryKey: ["runs"], queryFn: api.runs });
  if (q.isLoading) return <p className="text-zinc-500">Loading runs…</p>;
  if (q.isError) return <p className="text-rose-400">Failed to load runs.</p>;
  if (!q.data) return null;
  const rows = q.data.map((r) => [
    <Link key={r.id} href={`/runs/${r.id}`} className="text-sky-400 hover:underline">
      {r.id.slice(0, 8)}…
    </Link>,
    r.suiteName,
    <Badge
      key={r.id}
      variant={r.status === "passed" ? "ok" : r.status === "failed" || r.status === "error" ? "err" : "default"}
    >
      {r.status}
    </Badge>,
    r.environmentName ?? "—",
    r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : "—",
    r.failureCount,
  ]);
  return (
    <Card title="Test runs">
      <DataTable
        columns={["Run", "Suite", "Status", "Environment", "Duration", "Failures"]}
        rows={rows as unknown as (string | number | null)[][]}
      />
    </Card>
  );
}
