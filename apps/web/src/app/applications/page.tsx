"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";

export default function ApplicationsPage() {
  const q = useQuery({ queryKey: ["applications"], queryFn: api.applications });

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold tracking-tight text-[--text-primary]">Applications</h1>
        <p className="mt-1 max-w-2xl text-[14px] text-[--text-tertiary]">
          Configure base URLs, environments, credentials, and links to Jira, Jenkins, and suites.
        </p>
      </div>

      {q.isError && <p className="animate-fade-in text-[14px] text-[--accent-red]">Failed to load applications.</p>}

      {q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : q.data?.length === 0 ? (
        <Card>
          <EmptyState
            title="No applications yet"
            description="Add an application to map environments, credentials, and test suites."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data?.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`} className="group block animate-fade-in">
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-semibold text-[--color-primary] group-hover:underline">{a.name}</h2>
                    <p className="mt-1 truncate font-mono text-[12px] text-[--text-tertiary]">{a.baseUrl}</p>
                  </div>
                  <Badge variant="ok">{a.suiteCount} suites</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="text-[--text-quaternary]">Jira</dt>
                    <dd className="mt-0.5 font-medium text-[--text-primary]">{a.jiraProjectKey ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[--text-quaternary]">Jenkins</dt>
                    <dd className="mt-0.5 font-medium text-[--text-primary]">{a.jenkinsJobName ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-[--text-quaternary]">Environments</dt>
                    <dd className="mt-0.5 font-medium text-[--text-primary]">{a.environmentCount}</dd>
                  </div>
                  <div>
                    <dt className="text-[--text-quaternary]">Suites</dt>
                    <dd className="mt-0.5 font-medium text-[--text-primary]">{a.suiteCount}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
