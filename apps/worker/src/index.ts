import { Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  generateMockScenarios,
  generateMockTestPlan,
  generateMockScripts,
  mockHealFailures,
} from "@shipgate/agents";
import { prisma } from "@shipgate/database";
import { TestRunStatus, WebhookDeliveryStatus, PipelineStatus } from "@prisma/client";
import { env } from "./env.js";

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const QUEUE = "shipgate-jobs";

const worker = new Worker(
  QUEUE,
  async (job) => {
    const name = job.name;
    if (name === "mock_run_execution") {
      const { runId } = job.data as { runId: string };
      await prisma.testRun.update({
        where: { id: runId },
        data: {
          status: TestRunStatus.running,
          startedAt: new Date(),
          logs: "Mock executor: starting synthetic tests…",
        },
      });
      await new Promise((r) => setTimeout(r, 1500));
      await prisma.testRun.update({
        where: { id: runId },
        data: {
          status: TestRunStatus.passed,
          finishedAt: new Date(),
          durationMs: 1500,
          logs: "Mock executor: all checks passed.",
        },
      });
      return { ok: true };
    }
    if (name === "scenario_generation") {
      const { storyId } = job.data as { storyId: string };
      const story = await prisma.userStory.findUnique({
        where: { id: storyId },
        include: { acceptanceCriteria: true },
      });
      if (!story) return { ok: false };
      const data = generateMockScenarios({
        storyTitle: story.title,
        acceptanceCriteria: story.acceptanceCriteria.map((c) => c.text),
      });
      for (const s of data.scenarios) {
        await prisma.testScenario.create({
          data: {
            storyId: story.id,
            title: s.title,
            steps: s.steps,
            kind: s.kind,
            coverageMapJson: "{}",
          },
        });
      }
      return { ok: true };
    }
    if (name === "webhook_processing") {
      const { eventId } = job.data as { eventId: string };
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { deliveryStatus: WebhookDeliveryStatus.processed, processedAt: new Date() },
      });
      return { ok: true };
    }
    if (name === "suite_aggregation") {
      return { ok: true, skipped: true };
    }
    if (name === "pipeline_orchestrate") {
      return await runPipeline(job.data.pipelineRunId);
    }
    return { ok: true, unknown: name };
  },
  { connection }
);

worker.on("failed", (job, err) => {
  console.error("Job failed", job?.id, err);
});

async function runPipeline(pipelineRunId: string) {
  const started = Date.now();
  const run = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    include: { application: true },
  });
  if (!run) return { ok: false, error: "Pipeline run not found" };

  const stories: Array<{ key: string; title: string; criteria: string[] }> = run.storiesJson
    ? JSON.parse(run.storiesJson)
    : [
        {
          key: "AUTO-1",
          title: `Smoke test for ${run.application.name}`,
          criteria: ["Application loads", "Navigation works", "Core flows pass"],
        },
      ];

  try {
    // Phase 1: Planning
    console.log(`[pipeline:${pipelineRunId}] Planning…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.planning, startedAt: new Date() },
    });

    const planResult = generateMockTestPlan({
      applicationId: run.applicationId,
      baseUrl: run.application.baseUrl,
      userStories: stories,
      promptInstructions: run.promptMarkdown ?? undefined,
      observations: [
        { url: run.application.baseUrl + "/login", notes: "Login page observed" },
        { url: run.application.baseUrl + "/dashboard", notes: "Dashboard with stats" },
      ],
    });

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        testPlan: planResult.planMarkdown,
        planCasesJson: JSON.stringify(planResult.cases),
        coverageSummary: planResult.coverageSummary,
        totalPlanned: planResult.cases.length,
      },
    });

    // Phase 2: Generation
    console.log(`[pipeline:${pipelineRunId}] Generating scripts…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.generating },
    });

    const genResult = generateMockScripts({
      applicationId: run.applicationId,
      baseUrl: run.application.baseUrl,
      framework: run.framework as "playwright" | "codeceptjs",
      testPlanMarkdown: planResult.planMarkdown,
      plannedCases: planResult.cases,
    });

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        generatedScriptsJson: JSON.stringify(genResult.scripts),
        generatedConfigJson: genResult.configFile
          ? JSON.stringify(genResult.configFile)
          : null,
        totalGenerated: genResult.totalScenarios,
      },
    });

    // Phase 3: Execution (mock — we simulate some passes and failures)
    console.log(`[pipeline:${pipelineRunId}] Executing…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.executing },
    });

    await new Promise((r) => setTimeout(r, 1500));

    const totalScenarios = genResult.totalScenarios;
    const mockFailCount = Math.max(1, Math.floor(totalScenarios * 0.15));
    const mockPassCount = totalScenarios - mockFailCount;
    const mockFailures = genResult.scripts.slice(0, 1).map((s) => ({
      filename: s.filename,
      testName: s.caseRefs[0] ?? "unknown",
      error: 'Element "#submit-btn" not found on page — selector may have changed',
    }));

    const executionLog = [
      `Executing ${totalScenarios} scenarios against ${run.application.baseUrl}…`,
      `Framework: ${run.framework}`,
      "",
      ...genResult.scripts.map(
        (s) => `  ${s.filename}: ${s.caseRefs.length} scenarios`
      ),
      "",
      `Results: ${mockPassCount} passed, ${mockFailCount} failed`,
      "",
      ...(mockFailCount > 0
        ? [
            "FAILURES:",
            ...mockFailures.map((f) => `  ${f.filename} > ${f.testName}: ${f.error}`),
          ]
        : []),
    ].join("\n");

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        executionLog,
        executionStatus: mockFailCount > 0 ? "failed" : "passed",
        totalPassed: mockPassCount,
        totalFailed: mockFailCount,
      },
    });

    // Phase 4: Healing
    if (mockFailCount > 0) {
      console.log(`[pipeline:${pipelineRunId}] Healing ${mockFailCount} failures…`);
      await prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: { status: PipelineStatus.healing },
      });

      const healResult = mockHealFailures({
        pipelineRunId,
        scripts: genResult.scripts.map((s) => ({
          filename: s.filename,
          content: s.content,
        })),
        executionLog,
        failures: mockFailures,
      });

      await prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: {
          healerLog: [
            `Heal attempt: ${healResult.attempts}`,
            `Healed: ${healResult.healed.length}`,
            `Unresolved: ${healResult.unresolved.length}`,
            "",
            ...healResult.healed.map(
              (h) =>
                `✔ ${h.filename} > ${h.testName}: ${h.fix} (confidence: ${(h.confidence * 100).toFixed(0)}%)`
            ),
            ...healResult.unresolved.map(
              (u) => `✖ ${u.filename} > ${u.testName}: ${u.reason}`
            ),
          ].join("\n"),
          healActionsJson: JSON.stringify(healResult.healed),
          totalHealed: healResult.healed.length,
        },
      });
    }

    // Phase 5: Report
    console.log(`[pipeline:${pipelineRunId}] Generating report…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.reporting },
    });

    const elapsed = Date.now() - started;
    const reportMd = [
      `# Pipeline Execution Report`,
      "",
      `**Application:** ${run.application.name}`,
      `**Base URL:** ${run.application.baseUrl}`,
      `**Framework:** ${run.framework}`,
      `**Duration:** ${(elapsed / 1000).toFixed(1)}s`,
      "",
      `## Summary`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Planned test cases | ${planResult.cases.length} |`,
      `| Generated scenarios | ${genResult.totalScenarios} |`,
      `| Passed | ${mockPassCount} |`,
      `| Failed | ${mockFailCount} |`,
      `| Healed | ${mockFailCount > 0 ? mockFailCount : 0} |`,
      "",
      `## Coverage`,
      planResult.coverageSummary,
      "",
      `## Generated Files`,
      ...genResult.scripts.map((s) => `- \`${s.filename}\` (${s.caseRefs.length} scenarios)`),
      "",
      `## Status: ${mockFailCount > 0 ? "HEALED → PASSING" : "ALL PASSING"}`,
    ].join("\n");

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        status: PipelineStatus.completed,
        reportMarkdown: reportMd,
        finishedAt: new Date(),
        durationMs: elapsed,
      },
    });

    console.log(`[pipeline:${pipelineRunId}] Completed in ${elapsed}ms`);
    return { ok: true };
  } catch (err) {
    console.error(`[pipeline:${pipelineRunId}] Error:`, err);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        status: PipelineStatus.failed,
        finishedAt: new Date(),
        durationMs: Date.now() - started,
        executionLog: String(err),
      },
    });
    return { ok: false, error: String(err) };
  }
}

console.log("Worker listening on queue", QUEUE);
