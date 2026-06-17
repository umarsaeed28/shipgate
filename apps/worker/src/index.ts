import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: new URL("../../../.env", import.meta.url).pathname });

// Anchor cwd at the repo root so generated tests land in <root>/tests/<slug>.
process.chdir(fileURLToPath(new URL("../../../", import.meta.url)));

import { claimNext, completeJob, failJob } from "@qa/queue";
import { handleJob } from "./handlers";
import { startScheduler } from "./scheduler";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 1000);

async function loop() {
  console.log("[worker] started; polling for jobs…");
  startScheduler();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await claimNext();
    if (!job) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    console.log(`[worker] job ${job.id} (${job.type}) attempt ${job.attempts}`);
    try {
      const result = await handleJob(job);
      await completeJob(job.id, result);
      console.log(`[worker] job ${job.id} done`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await failJob(job.id, msg);
      console.error(`[worker] job ${job.id} failed: ${msg}`);
    }
  }
}

loop().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
