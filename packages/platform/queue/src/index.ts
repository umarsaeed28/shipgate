import { prisma, type Job } from "@qa/store";

export type JobType = "draft_scenarios" | "generate_test" | "run_suite";

export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
): Promise<Job> {
  return prisma.job.create({ data: { type, payload: payload as never } });
}

/**
 * Atomically claim the next runnable job. Single-worker-safe: we read the oldest
 * queued job then conditionally flip it to running, so a lost race simply yields
 * null and the loop retries.
 */
export async function claimNext(): Promise<Job | null> {
  const candidate = await prisma.job.findFirst({
    where: { status: "queued", runAt: { lte: new Date() } },
    orderBy: { runAt: "asc" },
  });
  if (!candidate) return null;

  const claimed = await prisma.job.updateMany({
    where: { id: candidate.id, status: "queued" },
    data: { status: "running", lockedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return null;

  return prisma.job.findUnique({ where: { id: candidate.id } });
}

export async function completeJob(
  id: string,
  result: Record<string, unknown>,
): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: { status: "done", result: result as never, error: null },
  });
}

export async function failJob(id: string, error: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  const retry = job ? job.attempts < job.maxAttempts : false;
  await prisma.job.update({
    where: { id },
    data: {
      status: retry ? "queued" : "error",
      error,
      lockedAt: null,
      runAt: retry ? new Date(Date.now() + 5000) : undefined,
    },
  });
}
