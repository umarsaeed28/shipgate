import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: new URL("../../../.env", import.meta.url).pathname });

// Anchor cwd at the repo root so generated tests land in <root>/tests/<slug>.
process.chdir(fileURLToPath(new URL("../../../", import.meta.url)));

import { claimNext, completeJob, failJob } from "@qa/queue";
import { handleJob } from "./handlers";

/** Process all currently-queued jobs once, then exit. Useful for CI/demos. */
async function drain() {
  let processed = 0;
  for (;;) {
    const job = await claimNext();
    if (!job) break;
    processed++;
    console.log(`[drain] job ${job.id} (${job.type})`);
    try {
      const result = await handleJob(job);
      await completeJob(job.id, result);
      console.log(`[drain] job ${job.id} done:`, JSON.stringify(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await failJob(job.id, msg);
      console.error(`[drain] job ${job.id} failed: ${msg}`);
    }
  }
  console.log(`[drain] processed ${processed} job(s)`);
  process.exit(0);
}

drain();
