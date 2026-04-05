"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, DataTable } from "@/components/ui";

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
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Jira">
          <p className="mb-3 text-xs text-zinc-500">Mock connect — stores workspace mapping.</p>
          <div className="space-y-2">
            <input
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Project key"
              value={jiraProj}
              onChange={(e) => setJiraProj(e.target.value)}
            />
            <button
              type="button"
              onClick={() => jira.mutate()}
              disabled={jira.isPending}
              className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            >
              Connect Jira
            </button>
          </div>
        </Card>
        <Card title="Jenkins">
          <p className="mb-3 text-xs text-zinc-500">Mock connect — stores job mapping.</p>
          <div className="space-y-2">
            <input
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={jenUrl}
              onChange={(e) => setJenUrl(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Job name"
              value={jenJob}
              onChange={(e) => setJenJob(e.target.value)}
            />
            <button
              type="button"
              onClick={() => jenkins.mutate()}
              disabled={jenkins.isPending}
              className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
            >
              Connect Jenkins
            </button>
          </div>
        </Card>
      </div>

      <Card title="Connections">
        {list.isLoading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : (
          <DataTable
            columns={["Type", "Name", "Base URL", "Active"]}
            rows={(list.data ?? []).map((c) => [c.type, c.name, c.baseUrl, c.isActive ? "yes" : "no"])}
          />
        )}
      </Card>

      <Card title="Webhooks">
        <p className="mb-2 text-sm text-zinc-500">
          POST endpoints (header <code className="text-zinc-400">X-Shipgate-Secret</code> must match server{" "}
          <code className="text-zinc-400">WEBHOOK_SECRET</code>):
        </p>
        <ul className="mb-4 font-mono text-xs text-sky-400">
          <li>
            POST {apiBase}/webhooks/jira
          </li>
          <li>
            POST {apiBase}/webhooks/jenkins
          </li>
        </ul>
        {events.isLoading ? (
          <p className="text-zinc-500">Loading events…</p>
        ) : (
          <DataTable
            columns={["ID", "Source", "Status", "Created"]}
            rows={(events.data ?? []).map((e) => [
              e.id.slice(0, 8) + "…",
              e.source,
              e.deliveryStatus,
              new Date(e.createdAt).toLocaleString(),
            ])}
          />
        )}
      </Card>
    </div>
  );
}
