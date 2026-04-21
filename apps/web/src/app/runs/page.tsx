"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, Card, DataTable, EmptyState, Skeleton } from "@/components/ui";

function runStatusVariant(status: string): "default" | "ok" | "err" | "warn" | "running" {
  const s = status.toLowerCase();
  if (s === "passed" || s === "pass") return "ok";
  if (s === "failed" || s === "error" || s === "fail") return "err";
  if (s === "running" || s === "in_progress" || s === "in progress") return "running";
  if (s === "flaky") return "warn";
  return "default";
}

export default function RunsPage() {
  const q = useQuery({ queryKey: ["runs"], queryFn: api.runs });

  if (q.isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Skeleton className="h-6 w-36 rounded-xl" />
        <Skeleton className="h-4 w-80 rounded-xl" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="animate-fade-in">
        <Card title="Test runs">
          <EmptyState title="Couldn't load runs" description={q.error instanceof Error ? q.error.message : "Something went wrong."} action={<Button variant="secondary" onClick={() => q.refetch()}>Retry</Button>} />
        </Card>
      </div>
    );
  }

  if (!q.data?.length) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-[24px] font-bold text-[--text-primary]">Test Runs</h1>
          <p className="mt-1 text-[14px] text-[--text-tertiary]">History of suite executions, durations, and outcomes.</p>
        </div>
        <Card title="Test runs"><EmptyState title="No test runs yet" description="Start a suite from the Run Center to see runs here." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold text-[--text-primary]">Test Runs</h1>
        <p className="mt-1 text-[14px] text-[--text-tertiary]">History of suite executions, durations, and outcomes.</p>
      </div>
      <Card title="Test runs" noPadding>
        <DataTable
          columns={["Run", "Suite", "Environment", "Status", "Duration", "Failures"]}
          rows={q.data.map((r) => [
            <Link key={r.id} href={`/runs/${r.id}`} className="font-mono text-[12px] text-[--color-primary] hover:underline">{r.id.slice(0, 8)}…</Link>,
            <span key={`sn-${r.id}`} className="text-[--text-secondary]">{r.suiteName}</span>,
            r.environmentName ?? "-",
            <Badge key={`b-${r.id}`} variant={runStatusVariant(r.status)}>{r.status}</Badge>,
            r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : "-",
            <span key={`fc-${r.id}`} className={r.failureCount > 0 ? "tabular-nums text-[--accent-red]" : "tabular-nums text-[--text-secondary]"}>{r.failureCount}</span>,
          ])}
        />
      </Card>
    </div>
  );
}
