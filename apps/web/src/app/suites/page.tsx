"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, DataTable } from "@/components/ui";

export default function SuitesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["suites"], queryFn: api.suites });
  const run = useMutation({
    mutationFn: (suiteId: string) => api.runSuite(suiteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
    },
  });
  if (q.isLoading) return <p className="text-zinc-500">Loading suites…</p>;
  if (q.isError) return <p className="text-rose-400">Failed to load suites.</p>;
  if (!q.data) return null;
  const rows = q.data.map((s) => [
    s.name,
    s.applicationName,
    s.owner ?? "—",
    s.tags.join(", ") || "—",
    s.passRate != null ? `${(s.passRate * 100).toFixed(1)}%` : "—",
    s.flakyRate != null ? `${(s.flakyRate * 100).toFixed(1)}%` : "—",
    <div key={s.id} className="flex gap-2">
      <button
        type="button"
        className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-900"
        onClick={() => run.mutate(s.id)}
        disabled={run.isPending}
      >
        Run
      </button>
      <Link href="/cases" className="text-xs text-sky-400 hover:underline">
        Tests
      </Link>
    </div>,
  ]);
  return (
    <Card title="Test suites">
      <DataTable
        columns={["Suite", "Application", "Owner", "Tags", "Pass rate", "Flaky", "Actions"]}
        rows={rows as unknown as (string | number | null)[][]}
      />
    </Card>
  );
}
