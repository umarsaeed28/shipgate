import { prisma, recordEvent, type RunSource, type Run } from "@qa/store";
import { runTest } from "./runner";

export interface SuiteOptions {
  source: RunSource;
  trigger: string;
  baseUrl: string;
  commitSha?: string;
}

/**
 * Run all active tests for this client and write Run/Failure/Event rows to the
 * history store. This is the CI/run plumbing invoked on a schedule (Step 4).
 */
export async function runSuite(opts: SuiteOptions): Promise<Run> {
  const tests = await prisma.test.findMany({
    where: { status: { in: ["active", "passing", "failing"] } },
  });

  const run = await prisma.run.create({
    data: {
      trigger: opts.trigger,
      source: opts.source,
      commitSha: opts.commitSha ?? null,
    },
  });
  await recordEvent({
    type: "run_started",
    entityRef: run.id,
    payload: { source: opts.source, trigger: opts.trigger, count: tests.length },
  });

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const res = await runTest(test.filePath, opts.baseUrl);
    if (res.passed) {
      passed++;
      await prisma.test.update({ where: { id: test.id }, data: { status: "passing" } });
    } else {
      failed++;
      await prisma.test.update({ where: { id: test.id }, data: { status: "failing" } });
      const failure = await prisma.failure.create({
        data: {
          runId: run.id,
          testId: test.id,
          errorType: "assertion",
          message: res.output.slice(-2000),
          artifactUrls: [`file://${res.artifactDir}`],
        },
      });
      await recordEvent({
        type: "failure_recorded",
        entityRef: failure.id,
        payload: { testId: test.id, runId: run.id },
      });
    }
  }

  const finished = await prisma.run.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      summary: { passed, failed, total: tests.length } as never,
    },
  });
  await recordEvent({
    type: "run_finished",
    entityRef: run.id,
    payload: { passed, failed, total: tests.length },
  });

  return finished;
}
