import { draftScenarios, generateAndRunTest } from "@qa/scenario-writer";
import { runSuite } from "@qa/test-runner";
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
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}
