"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Card, DataTable } from "@/components/ui";

export default function CasesPage() {
  const q = useQuery({ queryKey: ["cases"], queryFn: api.cases });
  if (q.isLoading) return <p className="text-zinc-500">Loading test cases…</p>;
  if (q.isError) return <p className="text-rose-400">Failed to load cases.</p>;
  if (!q.data) return null;
  const rows = q.data.map((c) => [
    c.name,
    c.suiteName,
    c.priority,
    c.status,
    <Badge
      key={c.id}
      variant={c.lastResult === "failed" ? "err" : c.lastResult === "passed" ? "ok" : "default"}
    >
      {c.lastResult}
    </Badge>,
  ]);
  return (
    <Card title="Test cases">
      <DataTable columns={["Name", "Suite", "Priority", "Status", "Last result"]} rows={rows as unknown as (string | number | null)[][]} />
    </Card>
  );
}
