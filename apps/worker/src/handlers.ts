import { draftScenarios, generateAndRunTest } from "@qa/scenario-writer";
import { runSuite } from "@qa/test-runner";
import {
  ingestJUnit,
  classifyFailure,
  pollJenkins,
} from "@qa/regression-analyzer";
import { enqueue } from "@qa/queue";
import type { Job } from "@qa/store";

/** Dispatch a claimed job to its handler. Returns a JSON-serializable result. */
export async function handleJob(job: Job): Promise<Record<string, unknown>> {
  const payload = (job.payload ?? {}) as Record<string, unknown>;

  switch (job.type) {
    case "draft_scenarios": {
      const res = await draftScenarios({
        storyKey: String(payload.storyKey),
        prId: payload.prId != null ? Number(payload.prId) : undefined,
        maxScenarios:
          payload.maxScenarios != null ? Number(payload.maxScenarios) : undefined,
      });
      return { ...res };
    }
    case "generate_test": {
      const res = await generateAndRunTest(String(payload.scenarioId));
      return { testId: res.testId, passed: res.passed, filePath: res.filePath };
    }
    case "run_suite": {
      const run = await runSuite({
        source: (payload.source as "schedule" | "pr" | "jenkins") ?? "schedule",
        trigger: String(payload.trigger ?? "manual"),
        baseUrl: String(payload.baseUrl),
        commitSha: payload.commitSha ? String(payload.commitSha) : undefined,
      });
      return { runId: run.id, summary: run.summary as Record<string, unknown> };
    }
    case "ingest_jenkins": {
      // Inline JUnit from the webhook, or poll the build URL as a fallback.
      const ingestInput = payload.junitXml
        ? {
            junitXml: String(payload.junitXml),
            trigger: String(payload.trigger ?? "jenkins"),
            commitSha: payload.commitSha ? String(payload.commitSha) : undefined,
            consoleLogUrl: payload.consoleLogUrl
              ? String(payload.consoleLogUrl)
              : undefined,
            screenshots: Array.isArray(payload.screenshots)
              ? (payload.screenshots as string[])
              : undefined,
          }
        : await pollJenkins(String(payload.buildUrl), {
            commitSha: payload.commitSha ? String(payload.commitSha) : undefined,
            trigger: payload.trigger ? String(payload.trigger) : undefined,
          });

      const { runId, failureIds } = await ingestJUnit(ingestInput);
      // Auto-classify each new failure (Agent 2 explains; never edits tests).
      for (const failureId of failureIds) {
        await enqueue("classify_failure", { failureId });
      }
      return { runId, failures: failureIds.length };
    }
    case "classify_failure": {
      const c = await classifyFailure(String(payload.failureId));
      return { classificationId: c.id, class: c.class, confidence: c.confidence };
    }
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
