"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, Card, DataTable, EmptyState, Skeleton } from "@/components/ui";

function priorityVariant(priority: string): "default" | "ok" | "err" | "warn" {
  const p = priority.toLowerCase().trim();
  if (p === "p0" || p === "critical" || p === "blocker") return "err";
  if (p === "p1" || p === "high") return "warn";
  if (p === "p3" || p === "low" || p === "minor") return "ok";
  return "default";
}

function lastResultVariant(lastResult: string): "default" | "ok" | "err" | "warn" | "running" {
  const r = lastResult.toLowerCase();
  if (r === "passed" || r === "pass") return "ok";
  if (r === "failed" || r === "error" || r === "fail") return "err";
  if (r === "running" || r === "in_progress") return "running";
  if (r === "flaky") return "warn";
  if (r === "skipped") return "warn";
  return "default";
}

export default function CasesPage() {
  const q = useQuery({ queryKey: ["cases"], queryFn: api.cases });

  if (q.isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Skeleton className="h-6 w-40 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-xl" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="animate-fade-in">
        <Card title="Test cases"><EmptyState title="Couldn't load test cases" description={q.error instanceof Error ? q.error.message : "Something went wrong."} action={<Button variant="secondary" onClick={() => q.refetch()}>Retry</Button>} /></Card>
      </div>
    );
  }

  if (!q.data?.length) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-[24px] font-bold text-[--text-primary]">Test Cases</h1>
          <p className="mt-1 text-[14px] text-[--text-tertiary]">Individual tests, priority, status, and last execution result.</p>
        </div>
        <Card title="Test cases"><EmptyState title="No test cases" description="Cases will show up here once they're defined in your suites." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold text-[--text-primary]">Test Cases</h1>
        <p className="mt-1 text-[14px] text-[--text-tertiary]">Individual tests, priority, status, and last execution result.</p>
      </div>
      <Card title="Test cases" noPadding>
        <DataTable
          columns={["Name", "Suite", "Priority", "Status", "Last result"]}
          rows={q.data.map((c) => [
            <span key={`n-${c.id}`} className="font-semibold text-[--text-primary]">{c.name}</span>,
            <span key={`su-${c.id}`} className="text-[--text-secondary]">{c.suiteName}</span>,
            <Badge key={`pr-${c.id}`} variant={priorityVariant(c.priority)}>{c.priority}</Badge>,
            <span key={`st-${c.id}`} className="text-[11px] uppercase tracking-wider text-[--text-tertiary]">{c.status}</span>,
            <Badge key={`lr-${c.id}`} variant={lastResultVariant(c.lastResult)}>{c.lastResult}</Badge>,
          ])}
        />
      </Card>
    </div>
  );
}
