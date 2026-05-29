import { chromium } from "playwright";
import { McpBrowser } from "@shipgate/agents";
import { createPlaywrightMcpCallFn } from "@shipgate/playwright-mcp-bridge";
import * as api from "./api-client.js";
import { makeAgentLogger } from "./api-client.js";
import { loadEnv } from "./env.js";
import { runExploreJob } from "./agent-loop.js";

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const env = loadEnv();
  console.log(
    `[playwright-agent] SHIPGATE_API_URL=${env.SHIPGATE_API_URL} model=${env.AGENT_MODEL} poll=${env.POLL_INTERVAL_MS}ms`,
  );
  const bootLog = makeAgentLogger(env, null);
  await bootLog("info", `Agent service started (model=${env.AGENT_MODEL}, poll=${env.POLL_INTERVAL_MS}ms)`);

  for (;;) {
    try {
      const next = await api.fetchNextJob(env);
      if (!next) {
        await sleep(env.POLL_INTERVAL_MS);
        continue;
      }

      const job = await api.claimJob(env, next.id);
      const log = makeAgentLogger(env, job.id);
      await log("info", `Claimed job kind=${job.kind} sut=${job.sutUrl}`);

      try {
        const browser = await chromium.launch({
          headless: true,
          args: ["--disable-dev-shm-usage", "--no-sandbox"],
        });
        try {
          await log("info", "Launching browser context");
          const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            ignoreHTTPSErrors: true,
          });
          const page = await context.newPage();
          const callMcp = createPlaywrightMcpCallFn(page);
          const mcp = new McpBrowser(callMcp);

          if (job.kind === "explore" || job.kind === "failure_followup") {
            await runExploreJob(env, job, mcp, log);
          } else {
            await log("error", "Unknown job kind");
            await api.completeJob(env, job.id, { status: "failed", error: "Unknown job kind" });
          }

          await context.close();
        } finally {
          await browser.close();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[playwright-agent] job error", err);
        try {
          const log = makeAgentLogger(env, job.id);
          await log("error", `Job failed: ${msg}`);
        } catch {
          /* ignore log failure */
        }
        try {
          await api.completeJob(env, job.id, {
            status: "failed",
            error: msg,
          });
        } catch (e2) {
          console.error("[playwright-agent] failed to mark job failed", e2);
        }
      }
    } catch (err) {
      console.error("[playwright-agent] loop error", err);
      await sleep(env.POLL_INTERVAL_MS);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
