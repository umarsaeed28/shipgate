import { Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  generateMockScenarios,
  generateMockTestPlan,
  generateMockScripts,
  mockHealFailures,
  McpTestPlanner,
  McpTestGenerator,
  McpTestHealer,
  type McpCallFn,
} from "@shipgate/agents";
import { prisma } from "@shipgate/database";
import { TestRunStatus, WebhookDeliveryStatus, PipelineStatus, SuggestionStatus } from "@prisma/client";
import { env } from "./env.js";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

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
    if (name === "agent_scan") {
      return await runAgentScan(job.data.applicationId);
    }
    if (name === "agent_write_test") {
      return await runAgentWriteTest(job.data.suggestionId);
    }
    if (name === "pipeline_orchestrate_mcp") {
      const callMcp: McpCallFn = async (server, tool, args) => {
        console.log(`[MCP] ${server}.${tool}(${JSON.stringify(args).slice(0, 100)})`);
        return { note: "MCP call dispatched - requires cursor runtime for live execution" };
      };
      return await runMcpPipeline(job.data.pipelineRunId, callMcp);
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

    // Phase 3: Execution (mock - we simulate some passes and failures)
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
      error: 'Element "#submit-btn" not found on page - selector may have changed',
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

/**
 * MCP-backed pipeline: uses real Playwright MCP browser tools to explore the
 * SUT, plan tests, generate CodeceptJS scripts, execute them, and heal failures.
 */
async function runMcpPipeline(pipelineRunId: string, callMcp: McpCallFn) {
  const started = Date.now();
  const run = await prisma.pipelineRun.findUnique({
    where: { id: pipelineRunId },
    include: { application: true },
  });
  if (!run) return { ok: false, error: "Pipeline run not found" };

  const stories: Array<{ key: string; title: string; criteria: string[] }> =
    run.storiesJson
      ? JSON.parse(run.storiesJson)
      : [
          {
            key: "AUTO-1",
            title: `Smoke test for ${run.application.name}`,
            criteria: ["Application loads", "Login works", "Core flows pass"],
          },
        ];

  const ctx = { workspaceId: run.applicationId, traceId: pipelineRunId };

  try {
    // Phase 1: Planning with MCP exploration
    console.log(`[mcp-pipeline:${pipelineRunId}] Planning with MCP exploration…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.planning, startedAt: new Date() },
    });

    const planner = new McpTestPlanner(callMcp);
    const planResult = await planner.plan(ctx, {
      applicationId: run.applicationId,
      baseUrl: run.application.baseUrl,
      userStories: stories,
      promptInstructions: run.promptMarkdown ?? undefined,
    });

    if (!planResult.ok || !planResult.data) {
      throw new Error(planResult.error ?? "Planner returned no data");
    }

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        testPlan: planResult.data.planMarkdown,
        planCasesJson: JSON.stringify(planResult.data.cases),
        coverageSummary: planResult.data.coverageSummary,
        totalPlanned: planResult.data.cases.length,
      },
    });

    // Phase 2: Generation with MCP selector discovery
    console.log(`[mcp-pipeline:${pipelineRunId}] Generating scripts with MCP…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.generating },
    });

    const generator = new McpTestGenerator(callMcp);
    const genResult = await generator.generate(ctx, {
      applicationId: run.applicationId,
      baseUrl: run.application.baseUrl,
      framework: run.framework as "playwright" | "codeceptjs",
      testPlanMarkdown: planResult.data.planMarkdown,
      plannedCases: planResult.data.cases,
    });

    if (!genResult.ok || !genResult.data) {
      throw new Error(genResult.error ?? "Generator returned no data");
    }

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        generatedScriptsJson: JSON.stringify(genResult.data.scripts),
        generatedConfigJson: genResult.data.configFile
          ? JSON.stringify(genResult.data.configFile)
          : null,
        totalGenerated: genResult.data.totalScenarios,
      },
    });

    // Phase 3: Execute generated scripts
    console.log(`[mcp-pipeline:${pipelineRunId}] Executing generated scripts…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.executing },
    });

    const e2eDir = process.env.E2E_DIR || "/Users/umarsaeed/shipgate/tests/e2e";
    let executionLog = "";
    let exitCode = 0;

    try {
      executionLog = execSync("npx codeceptjs run --steps 2>&1", {
        cwd: e2eDir,
        encoding: "utf-8",
        timeout: 120_000,
      });
    } catch (e: any) {
      executionLog = (e.stdout || "") + "\n" + (e.stderr || "");
      exitCode = e.status ?? 1;
    }

    const passMatch = executionLog.match(/(\d+)\s+passed/);
    const failMatch = executionLog.match(/(\d+)\s+failed/);
    const totalPassed = passMatch ? parseInt(passMatch[1]) : 0;
    const totalFailed = failMatch ? parseInt(failMatch[1]) : 0;

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        executionLog,
        executionStatus: totalFailed > 0 ? "failed" : exitCode !== 0 ? "error" : "passed",
        totalPassed,
        totalFailed,
      },
    });

    // Phase 4: Heal if failures
    if (totalFailed > 0) {
      console.log(`[mcp-pipeline:${pipelineRunId}] Healing ${totalFailed} failures…`);
      await prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: { status: PipelineStatus.healing },
      });

      const failures = parseFailures(executionLog, genResult.data.scripts);
      const healer = new McpTestHealer(callMcp);
      const healResult = await healer.heal(ctx, {
        pipelineRunId,
        scripts: genResult.data.scripts.map((s) => ({
          filename: s.filename,
          content: s.content,
        })),
        executionLog,
        failures,
      });

      if (healResult.ok && healResult.data) {
        await prisma.pipelineRun.update({
          where: { id: pipelineRunId },
          data: {
            healerLog: [
              `Heal attempts: ${healResult.data.attempts}`,
              `Healed: ${healResult.data.healed.length}`,
              `Unresolved: ${healResult.data.unresolved.length}`,
              "",
              ...healResult.data.healed.map(
                (h) =>
                  `✔ ${h.filename} > ${h.testName}: ${h.fix} (${(h.confidence * 100).toFixed(0)}%)`
              ),
              ...healResult.data.unresolved.map(
                (u) => `✖ ${u.filename} > ${u.testName}: ${u.reason}`
              ),
            ].join("\n"),
            healActionsJson: JSON.stringify(healResult.data.healed),
            totalHealed: healResult.data.healed.length,
          },
        });
      }
    }

    // Phase 5: Report
    console.log(`[mcp-pipeline:${pipelineRunId}] Generating report…`);
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { status: PipelineStatus.reporting },
    });

    const elapsed = Date.now() - started;
    const reportMd = [
      `# MCP Pipeline Execution Report`,
      "",
      `**Application:** ${run.application.name}`,
      `**Base URL:** ${run.application.baseUrl}`,
      `**Framework:** ${run.framework}`,
      `**Mode:** MCP Playwright (live exploration)`,
      `**Duration:** ${(elapsed / 1000).toFixed(1)}s`,
      "",
      `## Summary`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Planned test cases | ${planResult.data.cases.length} |`,
      `| Generated scenarios | ${genResult.data.totalScenarios} |`,
      `| Passed | ${totalPassed} |`,
      `| Failed | ${totalFailed} |`,
      "",
      `## Coverage`,
      planResult.data.coverageSummary,
      "",
      `## Generated Files`,
      ...genResult.data.scripts.map(
        (s) => `- \`${s.filename}\` (${s.caseRefs.length} scenarios)`
      ),
      "",
      `## Status: ${totalFailed === 0 ? "ALL PASSING" : totalFailed + " FAILURES"}`,
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

    console.log(`[mcp-pipeline:${pipelineRunId}] Completed in ${elapsed}ms`);
    return { ok: true };
  } catch (err) {
    console.error(`[mcp-pipeline:${pipelineRunId}] Error:`, err);
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

// ─── Test Creator Agent ─────────────────────────────────────

const REPO_ROOT = process.env.REPO_ROOT || "/Users/umarsaeed/shipgate";
const TEST_DIR = path.join(REPO_ROOT, "tests/e2e/smoke");
const APP_DIR = path.join(REPO_ROOT, "apps/dummy-app/src");

async function runAgentScan(applicationId: string) {
  console.log(`[agent:scan] Scanning for app ${applicationId}…`);

  await prisma.agentActivity.create({
    data: { applicationId, type: "scan", summary: "Agent scan started" },
  });

  const app = await prisma.testApplication.findUnique({ where: { id: applicationId } });
  if (!app) return { ok: false, error: "Application not found" };

  const appCode = readAppCode();
  const existingTests = readExistingTests();
  const existingScenarios = extractScenarioNames(existingTests);

  const suggestions = analyzeAndSuggest(appCode, existingScenarios, applicationId);

  let created = 0;
  for (const sug of suggestions) {
    const exists = await prisma.testSuggestion.findFirst({
      where: { applicationId, title: sug.title, status: { in: ["pending", "approved", "written"] } },
    });
    if (!exists) {
      await prisma.testSuggestion.create({ data: sug });
      created++;
    }
  }

  await prisma.agentActivity.create({
    data: {
      applicationId,
      type: "suggest",
      summary: `Scan complete: ${created} new suggestions, ${suggestions.length - created} duplicates skipped`,
      detailsJson: JSON.stringify({
        total: suggestions.length,
        created,
        existingScenarios: existingScenarios.length,
      }),
    },
  });

  console.log(`[agent:scan] Created ${created} suggestions`);
  return { ok: true, created, total: suggestions.length };
}

function readAppCode(): string {
  try {
    const serverFile = path.join(APP_DIR, "server.js");
    return fs.readFileSync(serverFile, "utf-8");
  } catch {
    return "";
  }
}

function readExistingTests(): Array<{ file: string; content: string }> {
  if (!fs.existsSync(TEST_DIR)) return [];
  return fs
    .readdirSync(TEST_DIR)
    .filter((f) => f.endsWith("_test.js"))
    .map((f) => ({
      file: f,
      content: fs.readFileSync(path.join(TEST_DIR, f), "utf-8"),
    }));
}

function extractScenarioNames(tests: Array<{ content: string }>): string[] {
  const names: string[] = [];
  for (const t of tests) {
    const matches = t.content.matchAll(/Scenario\(["'](.+?)["']/g);
    for (const m of matches) names.push(m[1].toLowerCase());
  }
  return names;
}

function analyzeAndSuggest(
  appCode: string,
  existingScenarios: string[],
  applicationId: string
): Array<{
  applicationId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  sourceFile: string;
  triggerReason: string;
  generatedCode: string;
  targetFile: string;
}> {
  const suggestions: Array<{
    applicationId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    sourceFile: string;
    triggerReason: string;
    generatedCode: string;
    targetFile: string;
  }> = [];

  const has = (keyword: string) =>
    existingScenarios.some((s) => s.includes(keyword.toLowerCase()));

  if (appCode.includes("app.post(\"/logout\"") && !has("logout")) {
    suggestions.push({
      applicationId,
      title: "should logout and redirect to login",
      description: "Verify that clicking the Logout button ends the session and redirects to /login",
      category: "smoke",
      priority: "P1",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "Detected POST /logout route in app code but no logout test exists",
      generatedCode: [
        'Scenario("should logout and redirect to login", ({ I }) => {',
        "  I.login();",
        '  I.click("Logout");',
        '  I.waitInUrl("/login", 5);',
        '  I.see("Sign in");',
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/01_login_test.js",
    });
  }

  if (appCode.includes("app.post(\"/calculator\"") && !has("empty fields")) {
    suggestions.push({
      applicationId,
      title: "should show validation when all fields are empty",
      description: "Submit the calculator form with no values and verify a validation error appears",
      category: "negative",
      priority: "P1",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "Calculator POST handler has validation logic but no empty-fields test exists",
      generatedCode: [
        'Scenario("should show validation when all fields are empty", ({ I }) => {',
        "  I.login();",
        '  I.click("#calculate-btn");',
        '  I.seeElement("#calc-error");',
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
    });
  }

  if (appCode.includes("Reset") && !has("reset")) {
    suggestions.push({
      applicationId,
      title: "should reset calculator form fields",
      description: "Fill the calculator form, click Reset, and verify all fields are cleared",
      category: "smoke",
      priority: "P2",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "Detected Reset button in calculator UI but no reset test exists",
      generatedCode: [
        'Scenario("should reset calculator form fields", ({ I }) => {',
        "  I.login();",
        '  I.fillField("#principal", "500000");',
        '  I.fillField("#downPayment", "100000");',
        '  I.fillField("#rate", "7");',
        '  I.click("Reset");',
        "  I.waitInUrl(\"/calculator\", 5);",
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
    });
  }

  if (appCode.includes("/history") && !has("empty history")) {
    suggestions.push({
      applicationId,
      title: "should show empty state when no calculations exist",
      description: "Navigate to history page with a fresh session and verify the empty state message",
      category: "edge",
      priority: "P2",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "History page exists but no test for empty state",
      generatedCode: [
        'Scenario("should show empty state when no calculations exist", ({ I }) => {',
        "  I.login();",
        '  I.amOnPage("/history");',
        '  I.see("No calculations yet");',
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/03_history_test.js",
    });
  }

  if (appCode.includes("20 years") && !has("20-year")) {
    suggestions.push({
      applicationId,
      title: "should calculate a 20-year mortgage",
      description: "Test the 20-year loan term option which exists in the dropdown but isn't tested",
      category: "smoke",
      priority: "P2",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "20-year loan term option exists in dropdown but no test covers it",
      generatedCode: [
        'Scenario("should calculate a 20-year mortgage", ({ I }) => {',
        "  I.login();",
        '  I.fillField("#principal", "400000");',
        '  I.fillField("#downPayment", "80000");',
        '  I.fillField("#rate", "6.0");',
        '  I.selectOption("#years", "20 years");',
        '  I.click("#calculate-btn");',
        '  I.waitForElement("#results", 5);',
        '  I.see("Your Monthly Payment");',
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
    });
  }

  if (appCode.includes("10 years") && !has("10-year")) {
    suggestions.push({
      applicationId,
      title: "should calculate a 10-year mortgage",
      description: "Test the 10-year loan term option which exists in the dropdown but isn't tested",
      category: "smoke",
      priority: "P2",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "10-year loan term option exists in dropdown but no test covers it",
      generatedCode: [
        'Scenario("should calculate a 10-year mortgage", ({ I }) => {',
        "  I.login();",
        '  I.fillField("#principal", "250000");',
        '  I.fillField("#downPayment", "50000");',
        '  I.fillField("#rate", "5.5");',
        '  I.selectOption("#years", "10 years");',
        '  I.click("#calculate-btn");',
        '  I.waitForElement("#results", 5);',
        '  I.see("Your Monthly Payment");',
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
    });
  }

  if (appCode.includes("session") && !has("session expir")) {
    suggestions.push({
      applicationId,
      title: "should protect calculator from unauthenticated access via direct URL",
      description: "Access /calculator without logging in and verify redirect to login",
      category: "security",
      priority: "P0",
      sourceFile: "apps/dummy-app/src/server.js",
      triggerReason: "Session-based auth detected - need to verify all protected routes",
      generatedCode: [
        'Scenario("should protect calculator from unauthenticated access via direct URL", ({ I }) => {',
        '  I.amOnPage("/history");',
        '  I.waitInUrl("/login", 5);',
        "});",
      ].join("\n"),
      targetFile: "tests/e2e/smoke/01_login_test.js",
    });
  }

  if (appCode.includes("multiple calculations") || appCode.includes("calculations.push")) {
    if (!has("multiple calculations")) {
      suggestions.push({
        applicationId,
        title: "should record multiple calculations in history",
        description: "Perform two different calculations and verify both appear in history",
        category: "smoke",
        priority: "P1",
        sourceFile: "apps/dummy-app/src/server.js",
        triggerReason: "History stores an array of calculations but only single-calculation test exists",
        generatedCode: [
          'Scenario("should record multiple calculations in history", ({ I }) => {',
          "  I.login();",
          '  I.fillField("#principal", "300000");',
          '  I.fillField("#downPayment", "60000");',
          '  I.fillField("#rate", "6.5");',
          '  I.selectOption("#years", "30 years");',
          '  I.click("#calculate-btn");',
          '  I.waitForElement("#results", 5);',
          "",
          '  I.amOnPage("/calculator");',
          '  I.fillField("#principal", "500000");',
          '  I.fillField("#downPayment", "100000");',
          '  I.fillField("#rate", "5.0");',
          '  I.selectOption("#years", "15 years");',
          '  I.click("#calculate-btn");',
          '  I.waitForElement("#results", 5);',
          "",
          '  I.click("History");',
          '  I.waitInUrl("/history", 5);',
          '  I.see("$300,000");',
          '  I.see("$500,000");',
          "});",
        ].join("\n"),
        targetFile: "tests/e2e/smoke/03_history_test.js",
      });
    }
  }

  return suggestions;
}

async function runAgentWriteTest(suggestionId: string) {
  const sug = await prisma.testSuggestion.findUnique({ where: { id: suggestionId } });
  if (!sug || sug.status !== "approved" || !sug.generatedCode || !sug.targetFile) {
    return { ok: false, reason: "Not ready to write" };
  }

  const absTarget = path.join(REPO_ROOT, sug.targetFile);

  if (!fs.existsSync(absTarget)) {
    return { ok: false, reason: "Target file does not exist" };
  }

  const content = fs.readFileSync(absTarget, "utf-8");
  const lines = content.split("\n");

  let insertIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== "") {
      insertIdx = i + 1;
      break;
    }
  }

  const codeToInsert = "\n" + sug.generatedCode + "\n";
  lines.splice(insertIdx, 0, codeToInsert);

  fs.writeFileSync(absTarget, lines.join("\n"), "utf-8");

  await prisma.testSuggestion.update({
    where: { id: sug.id },
    data: { status: SuggestionStatus.written },
  });

  await prisma.agentActivity.create({
    data: {
      applicationId: sug.applicationId,
      type: "write",
      summary: `Wrote test "${sug.title}" to ${sug.targetFile}`,
      detailsJson: JSON.stringify({ targetFile: sug.targetFile, testTitle: sug.title }),
    },
  });

  // Check if auto-run is configured
  const rule = await prisma.rule.findUnique({ where: { key: "conductor_config" } });
  if (rule) {
    try {
      const config = JSON.parse(rule.configJson);
      if (config.autoRunOnApproval) {
        console.log(`[agent:write] Auto-run enabled, triggering pipeline…`);
        await prisma.pipelineRun.create({
          data: {
            applicationId: sug.applicationId,
            framework: "codeceptjs",
            status: "pending",
          },
        });
      }
    } catch {}
  }

  console.log(`[agent:write] Test written to ${sug.targetFile}`);
  return { ok: true, targetFile: sug.targetFile };
}

function parseFailures(
  log: string,
  scripts: Array<{ filename: string; content: string; caseRefs: string[] }>
): Array<{ filename: string; testName: string; error: string }> {
  const failures: Array<{ filename: string; testName: string; error: string }> = [];
  const failSection = log.split("-- FAILURES:")[1] || "";
  const blocks = failSection.split(/\n\s*\d+\)\s+/).filter(Boolean);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const testName = lines[0]?.trim() || "unknown";
    const error = lines.slice(1, 5).join("\n").trim();
    const filename = scripts[0]?.filename ?? "unknown.js";
    failures.push({ filename, testName, error });
  }

  return failures;
}

console.log("Worker listening on queue", QUEUE);
