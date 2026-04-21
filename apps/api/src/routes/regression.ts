import fs from "node:fs";
import path from "node:path";
import type { FastifyPluginAsync } from "fastify";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import { getStore, saveStore } from "../store.js";
import type { JenkinsBuildRecord, Store, TestRunRecord } from "../data-types.js";
import { E2E_DIR } from "../lib/e2e-allure.js";
import { env } from "../env.js";
import {
  fetchJenkinsJobJsonWithFallbacks,
  type JenkinsBuildEntry,
  type JenkinsJobRemote,
} from "../lib/jenkins-api.js";
import { runBuildAnalysis } from "../lib/regression-agent-analysis.js";

/** When Jenkins is unreachable, mirror ingested analyzer/demo runs so the pipeline UI still works. */
function looksLikeJenkinsUnreachable(error: string): boolean {
  const m = error.toLowerCase();
  if (m.includes("jenkins returned ")) return false;
  return (
    m.includes("connection refused") ||
    m.includes("econnrefused") ||
    m.includes("network unreachable") ||
    m.includes("timed out") ||
    m.includes("request timed out") ||
    m.includes("nothing is accepting") ||
    m.includes("host not found") ||
    m.includes("dns") ||
    m.includes("- tried:")
  );
}

function localAnalyzerJobFromStore(store: Store, configuredJobName: string): JenkinsJobRemote {
  const rows = store.jenkinsBuilds
    .filter(
      (b) => b.jobName === configuredJobName || b.jobName === "demo-regression-run",
    )
    .sort((a, b) => b.buildNumber - a.buildNumber)
    .slice(0, 25);

  const builds: JenkinsBuildEntry[] = rows.map((b) => ({
    number: b.buildNumber,
    url: b.jenkinsBuildUrl || "#",
    building: false,
    result: b.status,
    duration: b.duration,
    timestamp: Date.parse(b.finishedAt) || Date.parse(b.startedAt) || Date.now(),
  }));

  const name =
    rows.length > 0 && rows.every((r) => r.jobName === rows[0]!.jobName)
      ? rows[0]!.jobName
      : configuredJobName;

  return {
    name,
    url: "#/analyzer-pipeline",
    builds,
  };
}

/** UI shape for Analysis UI - regression agent + scheduler + activity derived from test runs. */
function buildAgentStatusPayload(store: Store) {
  const { agentState, schedulerConfig, testRuns, jenkinsBuilds } = store;
  const pendingBuilds = jenkinsBuilds.filter((b) => !b.processed).length;

  const statusUi: "idle" | "running" | "error" | "disabled" =
    agentState.status === "dormant"
      ? "disabled"
      : agentState.status === "running"
        ? "running"
        : agentState.status === "error"
          ? "error"
          : "idle";

  const agents = [
    {
      name: agentState.name,
      status: statusUi,
      lastWake: agentState.lastWakeAt ?? undefined,
      lastRun: agentState.lastRunAt ?? undefined,
      lastProcessedBuild: agentState.lastProcessedBuild ?? undefined,
      notes: agentState.notes || undefined,
      mode: schedulerConfig.mode,
      cron: schedulerConfig.cronExpression,
      pollIntervalMinutes: schedulerConfig.pollIntervalMinutes,
      enabled: schedulerConfig.enabled,
    },
  ];

  const activityLog = [...testRuns]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40)
    .map((run: TestRunRecord) => ({
      id: `activity-run-${run.id}`,
      runId: run.id,
      timestamp: run.createdAt,
      agent: agentState.name,
      action: "Analyzed test run",
      details: `Build #${run.buildNumber} · ${run.suiteName} (${run.passed}/${run.total} passed, ${run.failed} failed)`,
      status: (run.failed > 0 ? "error" : "success") as "success" | "error",
    }));

  return { agents, activityLog, pendingBuilds };
}

/** UI-aligned settings bundle (Jenkins, Allure, SUT, analysis thresholds, scheduler). */
export function regressionSettingsView(store: Store) {
  const { settings, schedulerConfig } = store;
  return {
    jenkins: { url: settings.jenkinsUrl, jobName: settings.jenkinsJobName },
    allure: { resultsDir: settings.allureResultsPath, reportDir: settings.allureReportPath },
    application: { url: settings.appUrl },
    repository: { url: settings.gitRepoUrl ?? "" },
    analysis: {
      minConfidence: settings.analysisThresholds.minConfidence,
      autoClassifyThreshold: settings.analysisThresholds.autoClassifyAbove,
    },
    scheduler: {
      mode: schedulerConfig.mode,
      cronExpression: schedulerConfig.cronExpression,
      pollIntervalMinutes: schedulerConfig.pollIntervalMinutes,
      enabled: schedulerConfig.enabled,
    },
  };
}

const settingsPatchBody = z.object({
  jenkins: z
    .object({
      url: z.string().optional(),
      jobName: z.string().optional(),
    })
    .optional(),
  allure: z
    .object({
      resultsDir: z.string().optional(),
      reportDir: z.string().optional(),
    })
    .optional(),
  application: z.object({ url: z.string().optional() }).optional(),
  repository: z.object({ url: z.string().optional() }).optional(),
  analysis: z
    .object({
      minConfidence: z.number().min(0).max(1).optional(),
      autoClassifyThreshold: z.number().min(0).max(1).optional(),
    })
    .optional(),
  scheduler: z
    .object({
      mode: z.enum(["polling", "webhook", "hybrid"]).optional(),
      cronExpression: z.string().optional(),
      pollIntervalMinutes: z.number().min(1).max(10080).optional(),
      enabled: z.boolean().optional(),
    })
    .optional(),
});

function applyRegressionSettingsPatch(store: Store, body: z.infer<typeof settingsPatchBody>): void {
  if (body.jenkins) {
    if (body.jenkins.url !== undefined) store.settings.jenkinsUrl = body.jenkins.url.trim();
    if (body.jenkins.jobName !== undefined) store.settings.jenkinsJobName = body.jenkins.jobName.trim();
  }
  if (body.allure) {
    if (body.allure.resultsDir !== undefined) store.settings.allureResultsPath = body.allure.resultsDir.trim();
    if (body.allure.reportDir !== undefined) store.settings.allureReportPath = body.allure.reportDir.trim();
  }
  if (body.application?.url !== undefined) store.settings.appUrl = body.application.url.trim();
  if (body.repository?.url !== undefined) store.settings.gitRepoUrl = body.repository.url.trim();
  if (body.analysis) {
    if (body.analysis.minConfidence !== undefined)
      store.settings.analysisThresholds.minConfidence = body.analysis.minConfidence;
    if (body.analysis.autoClassifyThreshold !== undefined)
      store.settings.analysisThresholds.autoClassifyAbove = body.analysis.autoClassifyThreshold;
  }
  if (body.scheduler) {
    if (body.scheduler.mode !== undefined) store.schedulerConfig.mode = body.scheduler.mode;
    if (body.scheduler.cronExpression !== undefined)
      store.schedulerConfig.cronExpression = body.scheduler.cronExpression.trim();
    if (body.scheduler.pollIntervalMinutes !== undefined)
      store.schedulerConfig.pollIntervalMinutes = body.scheduler.pollIntervalMinutes;
    if (body.scheduler.enabled !== undefined) store.schedulerConfig.enabled = body.scheduler.enabled;
  }
}

export const regressionRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /overview ────────────────────────────────────────────────
  app.get("/overview", async () => {
    const store = getStore();
    const { jenkinsBuilds, testRuns, testFailures, runSummaries, agentState, schedulerConfig } = store;

    const latestBuild = jenkinsBuilds.length
      ? jenkinsBuilds.reduce((a, b) => (a.buildNumber > b.buildNumber ? a : b))
      : null;

    const recentSummaries = [...runSummaries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const passFailTrend = [...testRuns]
      .sort((a, b) => a.buildNumber - b.buildNumber)
      .map((r) => ({
        buildNumber: r.buildNumber,
        total: r.total,
        passed: r.passed,
        failed: r.failed,
        skipped: r.skipped,
        passRate: r.total > 0 ? r.passed / r.total : 0,
      }));

    const classificationBreakdown: Record<string, number> = {};
    for (const f of testFailures) {
      classificationBreakdown[f.classification] = (classificationBreakdown[f.classification] || 0) + 1;
    }

    const totalTests = testRuns.reduce((s, r) => s + r.total, 0);
    const totalPassed = testRuns.reduce((s, r) => s + r.passed, 0);
    const totalFailed = testRuns.reduce((s, r) => s + r.failed, 0);

    return {
      latestBuild,
      recentSummaries: recentSummaries.map((s) => ({
        id: s.id,
        buildNumber: s.buildNumber,
        shortSummary: s.shortSummary,
        overallStatus: s.overallStatus,
        totalTests: s.totalTests,
        passed: s.passed,
        failed: s.failed,
        createdAt: s.createdAt,
      })),
      passFailTrend,
      classificationBreakdown,
      totals: { tests: totalTests, passed: totalPassed, failed: totalFailed },
      agentState,
      schedulerConfig,
    };
  });

  // ── GET /bugs ───────────────────────────────────────────────────
  app.get("/bugs", async () => {
    const store = getStore();
    const bugs = store.bugs ?? [];
    const sorted = [...bugs].sort(
      (a, b) => new Date(b.injectedAt).getTime() - new Date(a.injectedAt).getTime(),
    );
    return { items: sorted, total: sorted.length };
  });

  // ── GET /runs ────────────────────────────────────────────────────
  app.get("/runs", async (req) => {
    const store = getStore();
    const query = req.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));

    const sorted = [...store.testRuns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const total = sorted.length;
    const items = sorted.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  });

  // ── GET /runs/:id ────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>("/runs/:id", async (req, reply) => {
    const store = getStore();
    const run = store.testRuns.find((r) => r.id === req.params.id);
    if (!run) return reply.status(404).send({ error: "Run not found" });

    const failures = store.testFailures.filter((f) => f.runId === run.id);
    const summary = store.runSummaries.find((s) => s.runId === run.id) ?? null;
    const build = store.jenkinsBuilds.find((b) => b.id === run.buildId) ?? null;

    return { run, failures, summary, build };
  });

  // ── GET /failures ────────────────────────────────────────────────
  app.get("/failures", async (req) => {
    const store = getStore();
    const query = req.query as {
      classification?: string;
      confidence?: string;
      buildNumber?: string;
    };

    let results = [...store.testFailures];

    if (query.classification) {
      results = results.filter((f) => f.classification === query.classification);
    }
    if (query.confidence) {
      const minConf = parseFloat(query.confidence);
      if (!isNaN(minConf)) {
        results = results.filter((f) => f.confidence >= minConf);
      }
    }
    if (query.buildNumber) {
      const bn = parseInt(query.buildNumber, 10);
      if (!isNaN(bn)) {
        results = results.filter((f) => f.buildNumber === bn);
      }
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { items: results, total: results.length };
  });

  // ── GET /summaries ───────────────────────────────────────────────
  app.get("/summaries", async () => {
    const store = getStore();
    const sorted = [...store.runSummaries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return { items: sorted, total: sorted.length };
  });

  // ── GET /summaries/:runId ────────────────────────────────────────
  app.get<{ Params: { runId: string } }>("/summaries/:runId", async (req, reply) => {
    const store = getStore();
    const summary = store.runSummaries.find((s) => s.runId === req.params.runId);
    if (!summary) return reply.status(404).send({ error: "Summary not found" });
    return summary;
  });

  // ── GET /agent-status ────────────────────────────────────────────
  app.get("/agent-status", async () => {
    return buildAgentStatusPayload(getStore());
  });

  // ── GET /settings - nested shape for Analysis UI (Jenkins, Allure, SUT, analysis, scheduler) ──
  app.get("/settings", async () => {
    return regressionSettingsView(getStore());
  });

  // ── POST /settings - partial nested patch (same shape as GET) ────
  app.post("/settings", async (req) => {
    const body = settingsPatchBody.parse(req.body);
    const store = getStore();
    applyRegressionSettingsPatch(store, body);
    saveStore(store);
    return { ok: true, ...regressionSettingsView(store) };
  });

  // ── POST /webhooks/jenkins ───────────────────────────────────────
  const webhookBody = z.object({
    buildNumber: z.number(),
    jobName: z.string(),
    status: z.enum(["SUCCESS", "FAILURE", "UNSTABLE", "ABORTED"]),
    duration: z.number().optional(),
    artifactPaths: z.array(z.string()).optional(),
    /** Jenkins build page URL (e.g. BUILD_URL) */
    jenkinsBuildUrl: z.string().optional(),
    /** Allure report URL from Jenkins Allure plugin (e.g. BUILD_URL + "allure/") */
    allureReportUrl: z.string().optional(),
    /** If true, run inline analysis immediately. Default false - use "Run Analysis" in the app. */
    autoAnalyze: z.boolean().optional(),
  });

  app.post("/webhooks/jenkins", async (req, reply) => {
    try {
      const body = webhookBody.parse(req.body);
      const store = getStore();

      const existing = store.jenkinsBuilds.find(
        (b) => b.buildNumber === body.buildNumber && b.jobName === body.jobName,
      );
      if (existing) {
        return reply.status(409).send({ error: "Build already recorded", buildId: existing.id });
      }

      const now = new Date().toISOString();
      const build: JenkinsBuildRecord = {
        id: crypto.randomUUID(),
        buildNumber: body.buildNumber,
        jobName: body.jobName,
        status: body.status,
        startedAt: now,
        finishedAt: now,
        duration: body.duration ?? 0,
        artifactPaths: body.artifactPaths ?? [],
        processed: false,
        jenkinsBuildUrl: body.jenkinsBuildUrl?.trim() || null,
        allureReportUrl: body.allureReportUrl?.trim() || null,
      };
      store.jenkinsBuilds.push(build);

      const autoAnalyze = body.autoAnalyze === true;

      if (autoAnalyze) {
        store.agentState.status = "running";
        store.agentState.lastWakeAt = now;
        saveStore(store);

        const analysisResult = await runBuildAnalysis(store, build);
        saveStore(store);

        return {
          ok: true,
          buildId: build.id,
          analyzed: true,
          analysis: analysisResult,
        };
      }

      store.agentState.status = "idle";
      store.agentState.notes =
        `Jenkins build #${body.buildNumber} (${body.jobName}) recorded - open Shipgate and click "Run Analysis Now".`;
      saveStore(store);

      return {
        ok: true,
        buildId: build.id,
        analyzed: false,
        message: "Build recorded. Run analysis from the Shipgate Overview or Jenkins page.",
      };
    } catch (err: any) {
      const store = getStore();
      store.agentState.status = "error";
      store.agentState.notes = `Error processing webhook: ${err.message}`;
      saveStore(store);
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── POST /analyze/:buildId - analyze a specific Jenkins build record ──
  app.post<{ Params: { buildId: string } }>("/analyze/:buildId", async (req, reply) => {
    try {
      const store = getStore();
      const build = store.jenkinsBuilds.find((b) => b.id === req.params.buildId);
      if (!build) return reply.status(404).send({ error: "Build not found" });
      if (build.processed) {
        return reply.status(400).send({ error: "Build already analyzed", buildId: build.id });
      }

      store.agentState.status = "running";
      store.agentState.lastWakeAt = new Date().toISOString();
      saveStore(store);

      const analysisResult = await runBuildAnalysis(store, build);
      saveStore(store);

      return {
        ok: true,
        buildId: build.id,
        buildNumber: build.buildNumber,
        analysis: analysisResult,
      };
    } catch (err: any) {
      const store = getStore();
      store.agentState.status = "error";
      store.agentState.notes = `Error analyzing build: ${err.message}`;
      saveStore(store);
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── POST /analyze-latest ─────────────────────────────────────────
  app.post("/analyze-latest", async (_req, reply) => {
    try {
      const store = getStore();

      const unprocessed = store.jenkinsBuilds
        .filter((b) => !b.processed)
        .sort((a, b) => b.buildNumber - a.buildNumber);

      if (unprocessed.length === 0) {
        return reply.status(404).send({ error: "No unprocessed builds found" });
      }

      const build = unprocessed[0];

      store.agentState.status = "running";
      store.agentState.lastWakeAt = new Date().toISOString();
      saveStore(store);

      const analysisResult = await runBuildAnalysis(store, build);
      saveStore(store);

      return {
        ok: true,
        buildId: build.id,
        buildNumber: build.buildNumber,
        analysis: analysisResult,
      };
    } catch (err: any) {
      const store = getStore();
      store.agentState.status = "error";
      store.agentState.notes = `Error analyzing build: ${err.message}`;
      saveStore(store);
      return reply.status(500).send({ error: err.message });
    }
  });

  // ── GET /builds ──────────────────────────────────────────────────
  app.get("/builds", async () => {
    const store = getStore();
    const sorted = [...store.jenkinsBuilds].sort((a, b) => b.buildNumber - a.buildNumber);
    return { items: sorted, total: sorted.length };
  });

  // ── GET /jenkins/pipeline - live job + Shipgate-ingested builds (regression job) ──
  app.get("/jenkins/pipeline", async () => {
    const store = getStore();
    const { jenkinsUrl, jenkinsJobName } = store.settings;
    const displayBase = jenkinsUrl.replace(/\/$/, "");
    const result = await fetchJenkinsJobJsonWithFallbacks(jenkinsUrl, jenkinsJobName);

    const internal = env.JENKINS_INTERNAL_URL?.trim()?.replace(/\/$/, "");
    let jenkinsFetchBase: string | undefined;
    let pipelineMode: "jenkins" | "local" = "jenkins";
    let liveJenkinsError: string | undefined;

    let remote:
      | { ok: true; job: JenkinsJobRemote }
      | { ok: false; error: string };

    if (result.ok) {
      remote = { ok: true, job: result.job };
      if (result.usedBase !== displayBase) jenkinsFetchBase = result.usedBase;
    } else if (looksLikeJenkinsUnreachable(result.error)) {
      pipelineMode = "local";
      liveJenkinsError = result.error;
      remote = { ok: true, job: localAnalyzerJobFromStore(store, jenkinsJobName) };
      if (internal) jenkinsFetchBase = internal;
    } else {
      remote = { ok: false, error: result.error };
    }

    const recorded = [...store.jenkinsBuilds]
      .sort((a, b) => b.buildNumber - a.buildNumber)
      .slice(0, 50);

    const segments = jenkinsJobName.split("/").filter(Boolean);
    const jobPath = segments.map((s) => `job/${encodeURIComponent(s)}`).join("/");
    const jobUiUrl = `${displayBase}/${jobPath}`;

    return {
      jenkinsUrl,
      jenkinsFetchBase,
      jobName: jenkinsJobName,
      jobUiUrl,
      pipelineMode,
      liveJenkinsError,
      remote,
      recorded,
    };
  });

  // ── Static Allure HTML (demo runs: tests/e2e/allure-reports/build-{n}/) ──
  const allureRoot = path.join(E2E_DIR, "allure-reports");
  try {
    fs.mkdirSync(allureRoot, { recursive: true });
  } catch {
    /* ignore */
  }
  await app.register(fastifyStatic, {
    root: allureRoot,
    prefix: "/allure/build/",
    decorateReply: false,
  });
};
