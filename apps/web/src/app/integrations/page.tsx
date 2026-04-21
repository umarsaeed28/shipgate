"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Badge, Button, Card, DataTable, EmptyState, Skeleton } from "@/components/ui";

const inputClass =
  "mt-1.5 w-full rounded-xl border bg-[--bg-inset] px-4 py-2.5 text-[14px] text-[--text-primary] outline-none transition-colors placeholder:text-[--text-quaternary] focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20";

function deliveryVariant(status: string): "default" | "ok" | "err" | "warn" {
  const s = status.toLowerCase();
  if (s.includes("fail") || s.includes("error")) return "err";
  if (s.includes("success") || s.includes("deliver") || s.includes("ok")) return "ok";
  if (s.includes("pending") || s.includes("retry")) return "warn";
  return "default";
}

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });
  const events = useQuery({ queryKey: ["webhook-events"], queryFn: api.webhookEvents });
  const [jiraUrl, setJiraUrl] = useState("https://acme.atlassian.net");
  const [jiraProj, setJiraProj] = useState("CHK");
  const [jenUrl, setJenUrl] = useState("https://jenkins.acme.test");
  const [jenJob, setJenJob] = useState("checkout-e2e");

  const jira = useMutation({
    mutationFn: () => api.connectJira({ baseUrl: jiraUrl, projectKey: jiraProj }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });
  const jenkins = useMutation({
    mutationFn: () => api.connectJenkins({ baseUrl: jenUrl, jobName: jenJob }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="animate-fade-in">
        <h1 className="text-[24px] font-bold tracking-tight text-[--text-primary]">Integrations</h1>
        <p className="mt-1 max-w-xl text-[14px] text-[--text-tertiary]">Connect Jira and Jenkins, map projects and jobs, and monitor webhooks.</p>
      </div>

      <div className="grid animate-fade-in gap-6 lg:grid-cols-2">
        <Card title="Jira">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[--text-quaternary]">
            Mock connect - stores workspace mapping
          </p>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[--text-tertiary]">
                Base URL
              </span>
              <input className={inputClass} value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[--text-tertiary]">
                Project key
              </span>
              <input
                className={inputClass}
                placeholder="e.g. CHK"
                value={jiraProj}
                onChange={(e) => setJiraProj(e.target.value)}
              />
            </label>
            <Button disabled={jira.isPending} onClick={() => jira.mutate()}>
              Connect Jira
            </Button>
          </div>
        </Card>
        <Card title="Jenkins">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[--text-quaternary]">
            Mock connect - stores job mapping
          </p>
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[--text-tertiary]">
                Base URL
              </span>
              <input className={inputClass} value={jenUrl} onChange={(e) => setJenUrl(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[--text-tertiary]">
                Job name
              </span>
              <input
                className={inputClass}
                placeholder="e.g. checkout-e2e"
                value={jenJob}
                onChange={(e) => setJenJob(e.target.value)}
              />
            </label>
            <Button disabled={jenkins.isPending} onClick={() => jenkins.mutate()}>
              Connect Jenkins
            </Button>
          </div>
        </Card>
      </div>

      <Card title="Connections">
        {list.isError ? (
          <p className="text-[13px] text-[--accent-red]">Failed to load integrations.</p>
        ) : list.isLoading ? (
          <div className="space-y-3 p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <EmptyState title="No connections" description="Connect Jira or Jenkins to see them listed here." />
        ) : (
          <DataTable
            columns={["Type", "Name", "Base URL", "Active"]}
            rows={(list.data ?? []).map((c) => [
              c.type,
              c.name,
              c.baseUrl,
              <Badge key={c.id} variant={c.isActive ? "ok" : "default"}>
                {c.isActive ? "Active" : "Inactive"}
              </Badge>,
            ])}
          />
        )}
      </Card>

      <Card title="Webhooks">
        <p className="mb-1 text-[13px] text-[--text-secondary]">
          POST endpoints - header{" "}
          <code className="rounded-md bg-[--bg-hover] px-1.5 py-0.5 font-mono text-[11px] text-[--color-primary]">
            X-Shipgate-Secret
          </code>{" "}
          must match server{" "}
          <code className="rounded-md bg-[--bg-hover] px-1.5 py-0.5 font-mono text-[11px] text-[--color-primary]">
            WEBHOOK_SECRET
          </code>
          :
        </p>
        <ul className="mb-6 space-y-1.5 font-mono text-[11px] text-[--color-primary]">
          <li>POST {apiBase}/webhooks/jira</li>
          <li>POST {apiBase}/webhooks/jenkins</li>
        </ul>
        {events.isError ? (
          <p className="text-[13px] text-[--accent-red]">Failed to load webhook events.</p>
        ) : events.isLoading ? (
          <div className="space-y-3 p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
        ) : (events.data?.length ?? 0) === 0 ? (
          <EmptyState title="No webhook events" description="Deliveries will appear here after Jira or Jenkins posts." />
        ) : (
          <DataTable
            columns={["ID", "Source", "Status", "Created", "Error"]}
            rows={(events.data ?? []).map((e) => [
              e.id.slice(0, 8) + "…",
              e.source,
              <Badge key={e.id} variant={deliveryVariant(e.deliveryStatus)}>
                {e.deliveryStatus}
              </Badge>,
              <span key={`d-${e.id}`} className="text-[--text-tertiary]">{new Date(e.createdAt).toLocaleString()}</span>,
              e.errorMessage ?? "-",
            ])}
          />
        )}
      </Card>
    </div>
  );
}
