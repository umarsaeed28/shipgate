/**
 * Enqueue a job for the worker.
 *
 *   pnpm tsx scripts/enqueue.ts <type> '<json-payload>'
 *   pnpm tsx scripts/enqueue.ts run_suite '{"baseUrl":"https://example.com","trigger":"manual"}'
 */
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });

import { enqueue, type JobType } from "@qa/queue";

async function main() {
  const type = process.argv[2] as JobType;
  const payload = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  if (!type) {
    console.error("Usage: tsx scripts/enqueue.ts <type> '<json>'");
    process.exit(1);
  }
  const job = await enqueue(type, payload);
  console.log(`Enqueued ${type} job ${job.id}`);
  process.exit(0);
}

main();
