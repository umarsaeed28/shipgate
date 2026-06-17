import { prisma } from "@qa/store";
import { enqueue } from "@qa/queue";
import { clientConfig } from "@qa/config/client";

/**
 * Schedule periodic CodeceptJS suite runs. Enabled by QA_SCHEDULE_MS (ms). Each
 * tick enqueues a run_suite job (the worker executes it and writes
 * Run/Failure/Event). Skips if a run_suite job is already queued.
 */
export function startScheduler(): void {
  const intervalMs = Number(process.env.QA_SCHEDULE_MS ?? 0);
  if (!intervalMs) {
    console.log("[scheduler] disabled (set QA_SCHEDULE_MS to enable)");
    return;
  }
  console.log(`[scheduler] scheduling suite runs every ${intervalMs}ms`);

  const tick = async () => {
    try {
      const pending = await prisma.job.count({
        where: { type: "run_suite", status: { in: ["queued", "running"] } },
      });
      if (pending > 0) return;

      const client = await prisma.client.findUnique({
        where: { slug: clientConfig.slug },
      });
      if (!client?.stagingUrl) return;

      await enqueue("run_suite", {
        source: "schedule",
        trigger: "cron",
        baseUrl: client.stagingUrl,
      });
      console.log("[scheduler] enqueued run_suite");
    } catch (err) {
      console.error("[scheduler] tick failed", err);
    }
  };

  setInterval(tick, intervalMs);
}
