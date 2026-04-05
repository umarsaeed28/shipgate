"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, DataTable } from "@/components/ui";

export default function StoriesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["stories"], queryFn: api.stories });
  const gen = useMutation({
    mutationFn: (id: string) => api.generateStory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  });
  if (q.isLoading) return <p className="text-zinc-500">Loading stories…</p>;
  if (q.isError) return <p className="text-rose-400">Failed to load stories.</p>;
  if (!q.data) return null;
  const rows = q.data.map((s) => [
    s.key,
    s.title,
    s.status,
    s.criteriaCount,
    s.scenarioCount,
    <button
      key={s.id}
      type="button"
      className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
      onClick={() => gen.mutate(s.id)}
      disabled={gen.isPending}
    >
      Generate scenarios
    </button>,
  ]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        User stories and acceptance criteria. Scenario generation uses the Test Scenario Writer agent (queued job).
      </p>
      <Card title="Stories">
        <DataTable
          columns={["Key", "Title", "Status", "Criteria", "Scenarios", ""]}
          rows={rows as unknown as (string | number | null)[][]}
        />
      </Card>
    </div>
  );
}
