import { prisma, recordEvent } from "@qa/store";
import { parseJUnit } from "./junit";

export interface IngestInput {
  junitXml: string;
  trigger: string;
  commitSha?: string;
  /** Reference to the Jenkins console log (we store the URL, not the payload). */
  consoleLogUrl?: string;
  /** Screenshot/artifact URLs captured by the CI job. */
  screenshots?: string[];
}

/**
 * Agent 2 ingestion: parse a JUnit report from a Jenkins run into Run + Failure
 * rows (source: jenkins) and an Event per failure. References cross boundaries:
 * we store the console-log URL and artifact URLs, never their contents.
 * Returns the created failure ids so the caller can enqueue classification.
 */
export async function ingestJUnit(input: IngestInput) {
  const cases = parseJUnit(input.junitXml);
  const failed = cases.filter((c) => c.failure);

  const run = await prisma.run.create({
    data: {
      trigger: input.trigger,
      source: "jenkins",
      commitSha: input.commitSha ?? null,
      finishedAt: new Date(),
      summary: {
        total: cases.length,
        failed: failed.length,
        passed: cases.length - failed.length,
      } as never,
    },
  });
  await recordEvent({
    type: "run_ingested",
    entityRef: run.id,
    payload: { source: "jenkins", total: cases.length, failed: failed.length },
  });

  const failureIds: string[] = [];
  for (const c of failed) {
    const artifactUrls = [
      ...(input.consoleLogUrl ? [input.consoleLogUrl] : []),
      ...(input.screenshots ?? []),
    ];
    // Best-effort link to an existing Test by file path / classname.
    const test = await prisma.test.findFirst({
      where: { filePath: { contains: c.name } },
    });
    const failure = await prisma.failure.create({
      data: {
        runId: run.id,
        testId: test?.id ?? null,
        errorType: c.failure?.type ?? "error",
        message: `${c.classname} ${c.name}: ${c.failure?.message ?? ""}`.trim(),
        artifactUrls,
      },
    });
    failureIds.push(failure.id);
    await recordEvent({
      type: "failure_recorded",
      entityRef: failure.id,
      payload: { runId: run.id, source: "jenkins" },
    });
  }

  return { runId: run.id, failureIds };
}
