import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { spawn, type ChildProcess } from "node:child_process";
import { getStore, saveStore } from "../store.js";
import { E2E_DIR, generateAllureReportForBuild } from "../lib/e2e-allure.js";
import type {
  JenkinsBuildRecord,
  TestRunRecord,
  TestFailureRecord,
  RunSummaryRecord,
} from "../data-types.js";
import { defaultStore } from "../store.js";
import { classifyFromLog } from "../lib/classify-failure.js";

// ── In-memory demo state ────────────────────────────────────────────

interface DemoSettings {
  simulateBug: boolean;
  simulateDelay: boolean;
}

interface RunSession {
  token: string;
  status: "running" | "passed" | "failed";
  log: string;
  startedAt: number;
  finishedAt: number | null;
  exitCode: number | null;
  buildId: string | null;
  runId: string | null;
  process: ChildProcess | null;
}

let demoSettings: DemoSettings = { simulateBug: false, simulateDelay: false };
const runSessions = new Map<string, RunSession>();

// ── Routes ──────────────────────────────────────────────────────────

export const demoRoutes: FastifyPluginAsync = async (app) => {
  // GET /settings - current demo injection state
  app.get("/settings", async () => {
    return demoSettings;
  });

  // POST /inject-bug - toggle bug/delay flags and create/resolve bug records
  const injectBody = z.object({
    simulateBug: z.boolean(),
    simulateDelay: z.boolean(),
  });

  app.post("/inject-bug", async (req) => {
    const body = injectBody.parse(req.body);
    const prev = { ...demoSettings };
    demoSettings = { simulateBug: body.simulateBug, simulateDelay: body.simulateDelay };

    const store = getStore();
    if (!store.bugs) store.bugs = [];
    const now = new Date().toISOString();

    // Calculation bug toggled ON
    if (body.simulateBug && !prev.simulateBug) {
      store.bugs.push({
        id: crypto.randomUUID(),
        title: "Incorrect P&I Calculation (+$50 offset)",
        description:
          "An arithmetic bug adds $50 to the monthly Principal & Interest amount in calculateMortgage(). " +
          "This causes the displayed P&I to be ~$50 higher than the correct value, breaking the 'Standard 30yr mortgage' test.",
        component: "Mortgage Calculator - calculateMortgage()",
        severity: "critical",
        status: "open",
        injectedAt: now,
        resolvedAt: null,
        relatedRunIds: [],
        relatedFailureIds: [],
      });
    }

    // Calculation bug toggled OFF → resolve the open bug
    if (!body.simulateBug && prev.simulateBug) {
      for (const bug of store.bugs) {
        if (bug.title.includes("P&I Calculation") && bug.status === "open") {
          bug.status = "resolved";
          bug.resolvedAt = now;
        }
      }
    }

    // Delay bug toggled ON
    if (body.simulateDelay && !prev.simulateDelay) {
      store.bugs.push({
        id: crypto.randomUUID(),
        title: "5-Second Calculation Delay",
        description:
          "A simulated performance regression adds a 5-second delay before the mortgage calculation result is displayed. " +
          "This causes timeout failures in tests that wait for the results panel.",
        component: "Mortgage Calculator - handleCalculate()",
        severity: "major",
        status: "open",
        injectedAt: now,
        resolvedAt: null,
        relatedRunIds: [],
        relatedFailureIds: [],
      });
    }

    // Delay bug toggled OFF → resolve the open bug
    if (!body.simulateDelay && prev.simulateDelay) {
      for (const bug of store.bugs) {
        if (bug.title.includes("Delay") && bug.status === "open") {
          bug.status = "resolved";
          bug.resolvedAt = now;
        }
      }
    }

    saveStore(store);
    return { ok: true, settings: demoSettings };
  });

  // POST /run-regression - spawn CodeceptJS headless
  app.post("/run-regression", async (_req, reply) => {
    // Prevent concurrent runs
    for (const s of runSessions.values()) {
      if (s.status === "running") {
        return reply.status(409).send({
          error: "A regression run is already in progress",
          token: s.token,
        });
      }
    }

    const token = crypto.randomUUID();
    const session: RunSession = {
      token,
      status: "running",
      log: "",
      startedAt: Date.now(),
      finishedAt: null,
      exitCode: null,
      buildId: null,
      runId: null,
      process: null,
    };

    runSessions.set(token, session);

    // Clean previous allure results
    try {
      const { execSync } = await import("node:child_process");
      execSync("rm -rf allure-results output", { cwd: E2E_DIR, stdio: "ignore" });
    } catch { /* ignore */ }

    const child = spawn(
      "npx",
      ["codeceptjs", "run", "--steps", "--plugins", "allure"],
      {
        cwd: E2E_DIR,
        env: {
          ...process.env,
          HEADLESS: "true",
          MORTGAGE_APP_URL: "http://localhost:3099",
          NODE_ENV: "test",
        },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      },
    );

    session.process = child;

    const append = (chunk: Buffer) => {
      session.log += chunk.toString();
      // Cap log at 500KB
      if (session.log.length > 512_000) {
        session.log = session.log.slice(-256_000);
      }
    };

    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    child.on("close", (code) => {
      session.exitCode = code ?? 1;
      session.status = code === 0 ? "passed" : "failed";
      session.finishedAt = Date.now();
      session.process = null;

      // Auto-analyze: create a build + run analysis
      try {
        const store = getStore();
        const nextBuild =
          store.jenkinsBuilds.length > 0
            ? Math.max(...store.jenkinsBuilds.map((b) => b.buildNumber)) + 1
            : 1;

        const now = new Date().toISOString();
        const build: JenkinsBuildRecord = {
          id: crypto.randomUUID(),
          buildNumber: nextBuild,
          jobName: "demo-regression-run",
          status: code === 0 ? "SUCCESS" : "FAILURE",
          startedAt: new Date(session.startedAt).toISOString(),
          finishedAt: now,
          duration: (session.finishedAt ?? Date.now()) - session.startedAt,
          artifactPaths: [],
          processed: false,
        };
        store.jenkinsBuilds.push(build);
        session.buildId = build.id;

        store.agentState.status = "running";
        store.agentState.lastWakeAt = now;
        saveStore(store);

        const { url: allureUrl, logLines } = generateAllureReportForBuild(nextBuild);
        for (const line of logLines) session.log += line;

        const result = runDemoAnalysis(store, build, session.log, {
          allureReportUrl: allureUrl,
        });
        session.runId = result.runId;
        saveStore(store);
      } catch (err) {
        session.log += `\n[shipgate] Analysis error: ${err}\n`;
      }
    });

    child.on("error", (err) => {
      session.log += `\n[shipgate] Process error: ${err.message}\n`;
      session.status = "failed";
      session.finishedAt = Date.now();
      session.exitCode = 1;
      session.process = null;
    });

    return { ok: true, token };
  });

  // GET /run-status/:token - poll for progress
  app.get<{ Params: { token: string } }>("/run-status/:token", async (req, reply) => {
    const session = runSessions.get(req.params.token);
    if (!session) {
      return reply.status(404).send({ error: "Run session not found" });
    }

    const store = getStore();
    const run = session.runId
      ? store.testRuns.find((r) => r.id === session.runId)
      : undefined;

    return {
      token: session.token,
      status: session.status,
      log: session.log,
      elapsed: (session.finishedAt ?? Date.now()) - session.startedAt,
      exitCode: session.exitCode,
      buildId: session.buildId,
      runId: session.runId,
      allureReportUrl: run?.allureReportUrl ?? null,
    };
  });

  // POST /reset - full clean slate: wipe store, sessions, and demo flags
  app.post("/reset", async () => {
    demoSettings = { simulateBug: false, simulateDelay: false };
    // Kill any running sessions
    for (const s of runSessions.values()) {
      if (s.process) {
        s.process.kill("SIGTERM");
      }
    }
    runSessions.clear();
    // Wipe the entire data store back to factory defaults
    const fresh = defaultStore();
    saveStore(fresh);
    return { ok: true };
  });
};

/**
 * Parse real CodeceptJS output to extract test results and individual failure details.
 *
 * CodeceptJS output format:
 *   OK  | 28 passed              (all passed)
 *   FAIL | 25 passed, 3 failed   (some failed)
 *
 *   -- FAILURES:
 *
 *   1) Feature: Scenario Name
 *      Error: ...
 *      at ...
 */
function runDemoAnalysis(
  store: ReturnType<typeof getStore>,
  build: JenkinsBuildRecord,
  testLog: string,
  opts?: { allureReportUrl?: string | null },
): { runId: string; summaryId: string | null; failureCount: number } {
  const now = new Date().toISOString();

  // ── Parse summary line: "OK  | N passed" or "FAIL | N passed, M failed" ──
  const summaryMatch = testLog.match(
    /(?:OK|FAIL)\s*\|\s*(\d+)\s*passed(?:.*?(\d+)\s*failed)?/i,
  );
  let passed = summaryMatch ? parseInt(summaryMatch[1], 10) : 0;
  let failed = summaryMatch && summaryMatch[2] ? parseInt(summaryMatch[2], 10) : 0;
  const total = passed + failed;

  const run: TestRunRecord = {
    id: crypto.randomUUID(),
    buildId: build.id,
    buildNumber: build.buildNumber,
    suiteName: "Mortgage Calculator Regression",
    total: total || 0,
    passed: passed || 0,
    failed: failed || 0,
    skipped: 0,
    status: build.status === "SUCCESS" ? "passed" : "failed",
    reportPath: `allure-report/${build.buildNumber}`,
    allureReportUrl: opts?.allureReportUrl ?? null,
    createdAt: now,
  };

  // ── Extract individual failures from "-- FAILURES:" section ──
  const failures: TestFailureRecord[] = [];
  const failureSection = testLog.split(/--\s*FAILURES\s*:?\s*-*/i)[1];

  if (failureSection) {
    // Split on numbered failure headings: "  1) Feature: Scenario"
    const failBlocks = failureSection.split(/\n\s*\d+\)\s+/).filter(Boolean);

    for (const block of failBlocks) {
      const lines = block.split("\n").filter((l) => l.trim());
      if (lines.length === 0) continue;

      // First line is "Feature: Scenario Name" or just the scenario name
      const headerLine = lines[0].trim();
      const featureScenario = headerLine.replace(/^[\w\s]+:\s*/, "");
      const testName = featureScenario || headerLine;

      // Collect error lines (lines starting with "Error:", containing "at", etc.)
      const errorLines: string[] = [];
      for (const line of lines.slice(1)) {
        const trimmed = line.trim();
        if (
          trimmed.startsWith("Error:") ||
          trimmed.startsWith("AssertionError:") ||
          trimmed.startsWith("TimeoutError:") ||
          (errorLines.length > 0 && !trimmed.startsWith("at ") && !trimmed.startsWith("Scenario") && trimmed.length > 0)
        ) {
          errorLines.push(trimmed);
        }
        if (errorLines.length > 0 && trimmed.startsWith("at ")) break;
      }

      const rawError = errorLines.length > 0
        ? errorLines.join("\n")
        : `Test "${testName}" failed - see full log for details`;

      const { classification, confidence, evidence, action } = classifyFromLog(rawError, block, {
        gitRepoUrl: store.settings.gitRepoUrl,
      });

      failures.push({
        id: crypto.randomUUID(),
        runId: run.id,
        buildNumber: build.buildNumber,
        testName,
        suiteName: "Mortgage Calculator Regression",
        rawError,
        screenshotPath: "",
        tracePath: "",
        classification,
        confidence,
        summary: `${testName}: ${rawError.split("\n")[0]}`,
        evidence,
        suggestedAction: action,
        createdAt: now,
      });
    }
  }

  // Also try to extract failures from inline "✖ FAILED" markers if we didn't find the FAILURES section
  if (failures.length === 0 && failed > 0) {
    const failedScenarios = testLog.matchAll(
      /Scenario.*?["""](.+?)["""].*?✖\s*FAILED/g,
    );
    for (const m of failedScenarios) {
      const testName = m[1].trim();
      const rawError = `Test "${testName}" failed during regression run`;
      const { classification, confidence, evidence, action } = classifyFromLog(testLog, testLog, {
        gitRepoUrl: store.settings.gitRepoUrl,
      });
      failures.push({
        id: crypto.randomUUID(),
        runId: run.id,
        buildNumber: build.buildNumber,
        testName,
        suiteName: "Mortgage Calculator Regression",
        rawError,
        screenshotPath: "",
        tracePath: "",
        classification,
        confidence,
        summary: rawError,
        evidence,
        suggestedAction: action,
        createdAt: now,
      });
    }
  }

  // Update counts from parsed failures
  if (failures.length > 0) {
    run.failed = failures.length;
    if (total > 0) {
      run.passed = total - run.failed;
    }
  }

  store.testRuns.push(run);
  for (const f of failures) store.testFailures.push(f);

  // Link failures and run to any open bugs
  if (!store.bugs) store.bugs = [];
  for (const bug of store.bugs) {
    if (bug.status !== "open") continue;
    if (bug.title.includes("P&I Calculation")) {
      const related = failures.filter((f) => f.classification === "product_bug");
      bug.relatedRunIds.push(run.id);
      bug.relatedFailureIds.push(...related.map((f) => f.id));
    }
    if (bug.title.includes("Delay")) {
      const related = failures.filter((f) => f.classification === "environment");
      bug.relatedRunIds.push(run.id);
      bug.relatedFailureIds.push(...related.map((f) => f.id));
    }
  }

  let summaryId: string | null = null;

  if (failures.length > 0) {
    const classBreakdown: Record<string, number> = {};
    for (const f of failures) {
      classBreakdown[f.classification] = (classBreakdown[f.classification] || 0) + 1;
    }

    const summary: RunSummaryRecord = {
      id: crypto.randomUUID(),
      runId: run.id,
      buildNumber: build.buildNumber,
      allureReportUrl: opts?.allureReportUrl ?? null,
      markdown: [
        `# Build #${build.buildNumber} - Regression Analysis`,
        "",
        `**${run.total} tests executed**: ${run.passed} passed, ${failures.length} failed.`,
        "",
        "## Failures",
        "",
        ...failures.map(
          (f) =>
            `### ${f.testName}\n- **Classification**: ${f.classification} (${(f.confidence * 100).toFixed(0)}% confidence)\n- **Error**: ${f.rawError.split("\n")[0]}\n- **Action**: ${f.suggestedAction}`,
        ),
        "",
        "## Recommendations",
        ...failures.map((f) => `- ${f.suggestedAction}`),
      ].join("\n"),
      shortSummary: `${failures.length} failure(s) in build #${build.buildNumber}: ${failures.map((f) => f.testName).join(", ")}`,
      overallStatus: run.status,
      totalTests: run.total,
      passed: run.passed,
      failed: run.failed,
      skipped: run.skipped,
      classificationBreakdown: classBreakdown,
      keyFailures: failures.map((f) => ({
        testName: f.testName,
        classification: f.classification,
        confidence: f.confidence,
      })),
      likelyRootCauses: failures.map((f) => f.rawError.split("\n")[0]),
      recommendations: failures.map((f) => f.suggestedAction),
      createdAt: now,
    };
    store.runSummaries.push(summary);
    summaryId = summary.id;
  }

  build.processed = true;
  store.agentState.status = "idle";
  store.agentState.lastRunAt = now;
  store.agentState.lastProcessedBuild = build.buildNumber;
  store.agentState.notes = `Build #${build.buildNumber}: ${run.passed} passed, ${failures.length} failed.`;

  return { runId: run.id, summaryId, failureCount: failures.length };
}
