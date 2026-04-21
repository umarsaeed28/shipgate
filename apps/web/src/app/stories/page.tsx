"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, Card, DataTable, EmptyState, Skeleton } from "@/components/ui";

function statusVariant(status: string): "default" | "ok" | "err" | "warn" {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("closed")) return "ok";
  if (s.includes("fail") || s.includes("block")) return "err";
  if (s.includes("progress") || s.includes("review")) return "warn";
  return "default";
}

export default function StoriesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["stories"], queryFn: api.stories });
  const gen = useMutation({
    mutationFn: (id: string) => api.generateStory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold tracking-tight text-[--text-primary]">Stories</h1>
        <p className="mt-1 max-w-xl text-[14px] text-[--text-tertiary]">User stories, acceptance criteria, and linked scenarios.</p>
      </div>

      {q.isError && <p className="animate-fade-in text-[14px] text-[--accent-red]">Failed to load stories.</p>}

      <Card title="Stories" noPadding>
        {q.isLoading ? (
          <div className="space-y-3 p-5">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}</div>
        ) : q.data?.length === 0 ? (
          <EmptyState title="No stories" description="Sync or import stories to generate scenarios from acceptance criteria." />
        ) : q.data ? (
          <DataTable
            columns={["Key", "Title", "Status", "Criteria", "Scenarios", ""]}
            rows={q.data.map((s) => [
              <span key={`k-${s.id}`} className="font-mono text-[13px] text-[--text-primary]">{s.key}</span>,
              <span key={`t-${s.id}`} className="text-[--text-secondary]">{s.title}</span>,
              <Badge key={`st-${s.id}`} variant={statusVariant(s.status)}>{s.status}</Badge>,
              s.criteriaCount, s.scenarioCount,
              <Button key={`btn-${s.id}`} size="sm" variant="secondary" disabled={gen.isPending} onClick={() => gen.mutate(s.id)}>Generate scenarios</Button>,
            ])}
          />
        ) : null}
      </Card>
    </div>
  );
}
