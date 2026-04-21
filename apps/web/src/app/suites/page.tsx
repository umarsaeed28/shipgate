"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button, Card, DataTable, EmptyState, Skeleton } from "@/components/ui";

export default function SuitesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["suites"], queryFn: api.suites });
  const run = useMutation({
    mutationFn: (suiteId: string) => api.runSuite(suiteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["runs"] }),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <Skeleton className="h-6 w-40 rounded-xl" />
        <Skeleton className="h-4 w-72 rounded-xl" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="animate-fade-in">
        <Card title="Test suites">
          <EmptyState
            title="Couldn't load suites"
            description={q.error instanceof Error ? q.error.message : "Something went wrong."}
            action={
              <Button variant="secondary" onClick={() => q.refetch()}>
                Retry
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!q.data?.length) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <h1 className="text-[24px] font-bold text-[--text-primary]">Test Suites</h1>
          <p className="mt-1 text-[14px] text-[--text-tertiary]">Organize and run automated tests by suite.</p>
        </div>
        <Card title="Test suites">
          <EmptyState title="No test suites" description="When suites exist, they'll appear here with pass rate, tags, and run actions." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold text-[--text-primary]">Test Suites</h1>
        <p className="mt-1 text-[14px] text-[--text-tertiary]">Organize and run automated tests by suite.</p>
      </div>
      <Card title="Test suites" noPadding>
        <DataTable
          columns={["Suite", "Application", "Pass rate", "Flake rate", "Owner", "Actions"]}
          rows={q.data.map((s) => {
            const runningHere = run.isPending && run.variables === s.id;
            return [
              <span key={`n-${s.id}`} className="font-semibold text-[--text-primary]">{s.name}</span>,
              s.applicationName,
              s.passRate != null ? `${(s.passRate * 100).toFixed(1)}%` : "-",
              s.flakyRate != null ? `${(s.flakyRate * 100).toFixed(1)}%` : "-",
              s.owner ?? "-",
              <div key={s.id} className="flex items-center gap-2">
                <Button size="sm" disabled={run.isPending} onClick={() => run.mutate(s.id)}>
                  {runningHere ? "Starting…" : "Run suite"}
                </Button>
                <Link
                  href="/cases"
                  className="inline-flex items-center rounded-xl px-3 py-1.5 text-[12px] font-semibold text-[--color-primary] hover:bg-[--bg-hover]"
                >
                  View tests
                </Link>
              </div>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
