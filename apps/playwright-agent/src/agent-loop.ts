import { McpBrowser } from "@shipgate/agents";
import { z } from "zod";
import type { AgentEnv } from "./env.js";
import * as api from "./api-client.js";
import type { AgentJob, LogLevel } from "./api-client.js";

export type ShipLog = (level: LogLevel, message: string) => Promise<void>;

const StepSchema = z.object({
  thought: z.string(),
  action: z.enum(["click", "fill", "navigate", "wait_text", "snapshot", "done"]),
  ref: z.string().optional(),
  element: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  waitText: z.string().optional(),
  finding: z
    .object({
      title: z.string(),
      summary: z.string(),
      classification: z.enum([
        "BUG",
        "TEST_SCRIPT_ISSUE",
        "TIMEOUT",
        "INFRASTRUCTURE_OR_ENVIRONMENT",
        "UNKNOWN_NEEDS_REVIEW",
      ]),
      confidence: z.number().min(0).max(1),
    })
    .optional(),
});

type AgentStep = z.infer<typeof StepSchema>;

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

function allowUrl(target: string, job: AgentJob): boolean {
  try {
    const jobOrigin = new URL(job.sutUrl).origin;
    const u = new URL(target, job.sutUrl);
    return u.origin === jobOrigin;
  } catch {
    return false;
  }
}

async function callOpenAI(
  env: AgentEnv,
  log: ShipLog,
  system: string,
  user: string,
): Promise<{ step: AgentStep; usage: TokenUsage | null }> {
  const base = env.OPENAI_BASE_URL?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
  await log("debug", "Calling OpenAI chat.completions…");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.AGENT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const raw = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const text = raw.choices?.[0]?.message?.content;
  if (!text) throw new Error("No completion content");
  const parsed = JSON.parse(text) as unknown;
  const step = StepSchema.parse(parsed);

  let usage: TokenUsage | null = null;
  if (raw.usage) {
    const p = raw.usage.prompt_tokens ?? 0;
    const c = raw.usage.completion_tokens ?? 0;
    const t = raw.usage.total_tokens ?? p + c;
    usage = { promptTokens: p, completionTokens: c, totalTokens: t };
  }

  return { step, usage };
}

type UsageAcc = { prompt: number; completion: number; total: number; calls: number };

function bump(acc: UsageAcc, u: TokenUsage | null): void {
  if (!u) return;
  acc.prompt += u.promptTokens;
  acc.completion += u.completionTokens;
  acc.total += u.totalTokens;
  acc.calls += 1;
}

function tokenUsagePayload(acc: UsageAcc):
  | {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      llmCalls: number;
    }
  | undefined {
  if (acc.calls === 0) return undefined;
  return {
    promptTokens: acc.prompt,
    completionTokens: acc.completion,
    totalTokens: acc.total,
    llmCalls: acc.calls,
  };
}

export async function runExploreJob(env: AgentEnv, job: AgentJob, mcp: McpBrowser, log: ShipLog): Promise<void> {
  const trace: Array<{ step: number; action: string; detail: string }> = [];
  let stepNo = 0;
  const acc: UsageAcc = { prompt: 0, completion: 0, total: 0, calls: 0 };

  await log("info", `Navigate to SUT ${job.sutUrl}`);
  await mcp.navigate(job.sutUrl);
  await mcp.wait(0.5);
  trace.push({ step: ++stepNo, action: "navigate", detail: job.sutUrl });

  const system = `You are an autonomous QA agent driving a browser via MCP-style tools (already wrapped).
You receive an accessibility snapshot of the page: lines like [ref=e1] link "Home".
You must respond with a single JSON object only (no markdown), shape:
{
  "thought": "brief reasoning",
  "action": "click" | "fill" | "navigate" | "wait_text" | "snapshot" | "done",
  "ref": "optional e.g. e2 — required for click/fill",
  "element": "optional human label for click/fill",
  "value": "for fill",
  "url": "for navigate — path or full URL on same origin only",
  "waitText": "substring to wait for",
  "finding": { "title", "summary", "classification", "confidence" } — required when action is "done"
}
Classifications: BUG | TEST_SCRIPT_ISSUE | TIMEOUT | INFRASTRUCTURE_OR_ENVIRONMENT | UNKNOWN_NEEDS_REVIEW
When you have enough evidence to summarize what you observed (UI loads, forms, errors), use action "done" with a finding.
If stuck after exploring, still use "done" with UNKNOWN_NEEDS_REVIEW.`;

  await log("info", `Starting agent loop (max ${env.MAX_AGENT_STEPS} LLM steps)`);

  for (let i = 0; i < env.MAX_AGENT_STEPS; i++) {
    await log("info", `Iteration ${i + 1}/${env.MAX_AGENT_STEPS}: capturing snapshot`);
    const snap = await mcp.interactiveSnapshot();
    const snapshotBlock = [
      `URL: ${snap.url}`,
      `Title: ${snap.title}`,
      `Interactive:`,
      snap.tree.slice(0, 12_000),
    ].join("\n");

    const user = `Job kind: ${job.kind}. Goal: explore the application under test, confirm it loads, interact lightly (e.g. one field), then finish with a concise finding.

${snapshotBlock}

Choose the next action. Prefer "done" once you have a meaningful summary.`;

    let decision: AgentStep;
    let usage: TokenUsage | null = null;
    try {
      const out = await callOpenAI(env, log, system, user);
      decision = out.step;
      usage = out.usage;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await log("error", `OpenAI step failed: ${msg}`);
      throw e;
    }

    bump(acc, usage);
    if (usage) {
      await log(
        "info",
        `LLM tokens (step ${i + 1}): prompt=${usage.promptTokens} completion=${usage.completionTokens} total=${usage.totalTokens}`,
      );
    } else {
      await log("warn", `LLM response had no usage field (step ${i + 1})`);
    }

    await log(
      "info",
      `Model step ${i + 1}: action=${decision.action} | ${decision.thought.slice(0, 280)}`,
    );
    trace.push({
      step: ++stepNo,
      action: decision.action,
      detail: decision.thought.slice(0, 500),
    });

    if (decision.action === "done") {
      const f = decision.finding;
      if (!f) {
        await log("error", "Model returned done without finding object");
        await log(
          "info",
          `Token totals so far: prompt=${acc.prompt} completion=${acc.completion} total=${acc.total} (${acc.calls} calls)`,
        );
        await api.completeJob(env, job.id, {
          status: "failed",
          error: "Model returned done without finding",
          trace,
          tokenUsage: tokenUsagePayload(acc),
        });
        return;
      }
      await log("info", `Posting finding: ${f.title} (${f.classification})`);
      await api.postFinding(env, {
        jobId: job.id,
        title: f.title,
        summary: f.summary,
        classification: f.classification,
        confidence: f.confidence,
        steps: trace,
      });
      await log(
        "info",
        `Job token totals (${acc.calls} LLM calls): prompt=${acc.prompt} completion=${acc.completion} total=${acc.total}`,
      );
      await log("info", "Job completed successfully");
      await api.completeJob(env, job.id, {
        status: "completed",
        trace,
        tokenUsage: tokenUsagePayload(acc),
      });
      return;
    }

    if (decision.action === "snapshot") {
      await log("debug", "Model requested extra snapshot");
      continue;
    }

    if (decision.action === "navigate") {
      const raw = decision.url?.trim();
      if (!raw) continue;
      const target = raw.startsWith("http") ? raw : new URL(raw, job.sutUrl).href;
      if (!allowUrl(target, job)) {
        await log("warn", `Blocked navigate outside SUT: ${target}`);
        trace.push({
          step: ++stepNo,
          action: "blocked",
          detail: `Refused URL outside SUT: ${target}`,
        });
        continue;
      }
      await log("info", `Navigate → ${target}`);
      await mcp.navigate(target);
      await mcp.wait(0.5);
      continue;
    }

    if (decision.action === "click") {
      const ref = decision.ref;
      if (!ref) continue;
      await log("info", `Click ref=${ref} (${decision.element ?? "element"})`);
      await mcp.click(decision.element ?? "control", ref);
      await mcp.wait(0.4);
      continue;
    }

    if (decision.action === "fill") {
      const ref = decision.ref;
      const value = decision.value ?? "";
      if (!ref) continue;
      await log("info", `Fill ref=${ref} len=${value.length}`);
      await mcp.fill(decision.element ?? "field", ref, value);
      await mcp.wait(0.3);
      continue;
    }

    if (decision.action === "wait_text") {
      const t = decision.waitText?.trim();
      if (t) {
        await log("info", `Wait for text: ${t.slice(0, 120)}`);
        await mcp.waitForText(t, 12_000);
      }
      continue;
    }
  }

  await log("warn", `Step limit reached (${env.MAX_AGENT_STEPS}); posting partial finding`);
  await log(
    "info",
    `Job token totals (${acc.calls} LLM calls): prompt=${acc.prompt} completion=${acc.completion} total=${acc.total}`,
  );
  await api.postFinding(env, {
    jobId: job.id,
    title: "Explore incomplete (step limit)",
    summary: `Stopped after ${env.MAX_AGENT_STEPS} LLM steps. Partial trace recorded.`,
    classification: "UNKNOWN_NEEDS_REVIEW",
    confidence: 0.4,
    steps: trace,
  });
  await api.completeJob(env, job.id, {
    status: "completed",
    trace,
    tokenUsage: tokenUsagePayload(acc),
  });
}
