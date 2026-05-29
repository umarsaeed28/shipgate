import type { AgentEnv } from "./env.js";

export interface AgentJob {
  id: string;
  kind: "explore" | "failure_followup";
  status: string;
  sutUrl: string;
  createdAt: string;
  relatedFailureId: string | null;
}

function base(env: AgentEnv): string {
  return env.SHIPGATE_API_URL.replace(/\/$/, "");
}

export async function fetchNextJob(env: AgentEnv): Promise<AgentJob | null> {
  const res = await fetch(`${base(env)}/api/regression/agent-jobs/next`);
  if (!res.ok) throw new Error(`agent-jobs/next ${res.status}`);
  const data = (await res.json()) as { job: AgentJob | null };
  return data.job;
}

export async function claimJob(env: AgentEnv, jobId: string): Promise<AgentJob> {
  const res = await fetch(`${base(env)}/api/regression/agent-jobs/${encodeURIComponent(jobId)}/claim`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`claim ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { job: AgentJob };
  return data.job;
}

export async function postFinding(
  env: AgentEnv,
  body: {
    jobId: string;
    title: string;
    summary: string;
    classification: string;
    confidence: number;
    steps: Array<{ step: number; action: string; detail: string }>;
  },
): Promise<void> {
  const res = await fetch(`${base(env)}/api/regression/agent/findings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`findings ${res.status}: ${await res.text()}`);
}

export async function completeJob(
  env: AgentEnv,
  jobId: string,
  body: {
    status: "completed" | "failed";
    error?: string;
    trace?: Array<{ step: number; action: string; detail: string }>;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      llmCalls: number;
    };
  },
): Promise<void> {
  const res = await fetch(`${base(env)}/api/regression/agent-jobs/${encodeURIComponent(jobId)}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`complete ${res.status}: ${await res.text()}`);
}

export type LogLevel = "info" | "warn" | "error" | "debug";

export async function postAgentLog(
  env: AgentEnv,
  entry: {
    level: LogLevel;
    message: string;
    source?: string;
    jobId?: string | null;
  },
): Promise<void> {
  const res = await fetch(`${base(env)}/api/regression/agent-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level: entry.level,
      message: entry.message,
      source: entry.source ?? "playwright-agent",
      jobId: entry.jobId ?? undefined,
    }),
  });
  if (!res.ok) {
    console.warn(`[playwright-agent] log ingest failed ${res.status}: ${await res.text()}`);
  }
}

export function makeAgentLogger(env: AgentEnv, jobId: string | null) {
  return async (level: LogLevel, message: string): Promise<void> => {
    const line = message.length > 4000 ? `${message.slice(0, 4000)}…` : message;
    console.log(`[playwright-agent] ${line}`);
    await postAgentLog(env, { level, message: line, jobId: jobId ?? undefined });
  };
}
