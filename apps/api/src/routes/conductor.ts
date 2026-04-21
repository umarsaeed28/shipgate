import type { FastifyPluginAsync } from "fastify";
import { Queue } from "bullmq";
import { z } from "zod";
import { prisma } from "@shipgate/database";
import { SuggestionStatus } from "@prisma/client";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = process.env.REPO_ROOT || "/Users/umarsaeed/shipgate";
const TEST_DIR = path.join(REPO_ROOT, "tests/e2e/smoke");
const APP_DIR = path.join(REPO_ROOT, "apps/dummy-app/src");

export function registerConductorRoutes(queue: Queue): FastifyPluginAsync {
  return async (app) => {

    // ── Git status & recent changes ──────────────────────────
    app.get("/conductor/git/status", async () => {
      try {
        const status = execSync("git status --porcelain", {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        }).trim();
        const branch = execSync("git branch --show-current", {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        }).trim();
        const lastCommit = execSync("git log -1 --pretty=format:%H|%s|%ci", {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        }).trim();
        const [hash, message, date] = lastCommit.split("|");
        return {
          branch,
          lastCommit: { hash, message, date },
          changedFiles: status
            ? status.split("\n").map((l) => ({
                status: l.substring(0, 2).trim(),
                file: l.substring(3),
              }))
            : [],
          clean: status === "",
        };
      } catch {
        return { branch: "unknown", lastCommit: null, changedFiles: [], clean: true };
      }
    });

    app.get("/conductor/git/log", async () => {
      try {
        const log = execSync('git log --oneline -20 --pretty=format:"%H|%s|%cr|%an"', {
          cwd: REPO_ROOT,
          encoding: "utf-8",
        }).trim();
        return log.split("\n").filter(Boolean).map((line) => {
          const clean = line.replace(/^"|"$/g, "");
          const [hash, message, relTime, author] = clean.split("|");
          return { hash, message, relTime, author };
        });
      } catch {
        return [];
      }
    });

    // ── File tree (test repo + app source) ───────────────────
    app.get("/conductor/files", async () => {
      const testFiles = listFiles(TEST_DIR, REPO_ROOT);
      const appFiles = listFiles(APP_DIR, REPO_ROOT);
      return { testFiles, appFiles };
    });

    // ── Test explorer: parse test files for scenarios ────────
    app.get("/conductor/tests", async () => {
      const files = listFiles(TEST_DIR, REPO_ROOT);
      const tests: Array<{
        file: string;
        feature: string;
        scenarios: Array<{ name: string; line: number }>;
      }> = [];

      for (const f of files) {
        if (!f.path.endsWith("_test.js")) continue;
        const abs = path.join(REPO_ROOT, f.path);
        const content = fs.readFileSync(abs, "utf-8");
        const lines = content.split("\n");

        let currentFeature = f.name;
        const scenarios: Array<{ name: string; line: number }> = [];

        for (let i = 0; i < lines.length; i++) {
          const featureMatch = lines[i].match(/Feature\(["'](.+?)["']/);
          if (featureMatch) currentFeature = featureMatch[1];
          const scenarioMatch = lines[i].match(/Scenario\(["'](.+?)["']/);
          if (scenarioMatch) {
            scenarios.push({ name: scenarioMatch[1], line: i + 1 });
          }
        }

        tests.push({ file: f.path, feature: currentFeature, scenarios });
      }

      return tests;
    });

    // ── Read file content ────────────────────────────────────
    app.get<{ Params: { "*": string } }>("/conductor/file/*", async (req, reply) => {
      const relPath = (req.params as any)["*"];
      const absPath = path.join(REPO_ROOT, relPath);
      if (!absPath.startsWith(REPO_ROOT)) return reply.status(403).send({ error: "Forbidden" });
      try {
        const content = fs.readFileSync(absPath, "utf-8");
        return { path: relPath, content, lines: content.split("\n").length };
      } catch {
        return reply.status(404).send({ error: "File not found" });
      }
    });

    // ── Suggestions CRUD ─────────────────────────────────────
    app.get("/conductor/suggestions", async (req) => {
      const status = (req.query as any).status as string | undefined;
      const where = status ? { status: status as SuggestionStatus } : {};
      return prisma.testSuggestion.findMany({
        where,
        include: { application: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    });

    const createSuggestionsBody = z.object({
      applicationId: z.string(),
      suggestions: z.array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          category: z.string().default("smoke"),
          priority: z.string().default("P1"),
          generatedCode: z.string().optional(),
          targetFile: z.string().optional(),
          triggerReason: z.string().optional(),
        })
      ),
    });

    app.post("/conductor/suggestions", async (req, reply) => {
      const body = createSuggestionsBody.parse(req.body);
      const appExists = await prisma.testApplication.findUnique({
        where: { id: body.applicationId },
      });
      if (!appExists) return reply.status(404).send({ error: "Application not found" });

      const data = body.suggestions.map((s) => ({
        applicationId: body.applicationId,
        title: s.title,
        description: s.description ?? null,
        category: s.category,
        priority: s.priority,
        generatedCode: s.generatedCode ?? null,
        targetFile: s.targetFile ?? null,
        triggerReason: s.triggerReason ?? null,
        status: SuggestionStatus.pending,
      }));

      const result = await prisma.testSuggestion.createMany({ data });
      await logActivity(
        body.applicationId,
        "suggest",
        `Agent created ${result.count} test scenario suggestions`
      );
      return { created: result.count };
    });

    const approveBody = z.object({
      targetFile: z.string().optional(),
    });

    app.post<{ Params: { id: string } }>("/conductor/suggestions/:id/approve", async (req, reply) => {
      const body = approveBody.safeParse(req.body ?? {});
      const sug = await prisma.testSuggestion.findUnique({ where: { id: req.params.id } });
      if (!sug) return reply.status(404).send({ error: "Suggestion not found" });

      const updated = await prisma.testSuggestion.update({
        where: { id: sug.id },
        data: {
          status: SuggestionStatus.approved,
          reviewedAt: new Date(),
          reviewedBy: "admin",
          targetFile: body.success ? body.data.targetFile ?? sug.targetFile : sug.targetFile,
        },
      });

      await queue.add("agent_write_test", { suggestionId: sug.id }, { removeOnComplete: 50 });
      await logActivity(sug.applicationId, "suggest", `Approved: ${sug.title}`);

      return updated;
    });

    app.post<{ Params: { id: string } }>("/conductor/suggestions/:id/reject", async (req, reply) => {
      const sug = await prisma.testSuggestion.findUnique({ where: { id: req.params.id } });
      if (!sug) return reply.status(404).send({ error: "Suggestion not found" });

      const updated = await prisma.testSuggestion.update({
        where: { id: sug.id },
        data: {
          status: SuggestionStatus.rejected,
          reviewedAt: new Date(),
          reviewedBy: "admin",
        },
      });

      await logActivity(sug.applicationId, "suggest", `Rejected: ${sug.title}`);
      return updated;
    });

    // ── Trigger agent scan ───────────────────────────────────
    app.post("/conductor/scan", async (req) => {
      const body = z.object({ applicationId: z.string() }).parse(req.body);
      await queue.add("agent_scan", { applicationId: body.applicationId }, { removeOnComplete: 50 });
      await logActivity(body.applicationId, "scan", "Manual scan triggered");
      return { queued: true };
    });

    // ── Trigger pipeline from conductor ──────────────────────
    app.post("/conductor/run-pipeline", async (req) => {
      const body = z.object({ applicationId: z.string() }).parse(req.body);
      const run = await prisma.pipelineRun.create({
        data: {
          applicationId: body.applicationId,
          framework: "codeceptjs",
          status: "pending",
        },
      });
      await queue.add("pipeline_orchestrate", { pipelineRunId: run.id }, { removeOnComplete: 50 });
      await logActivity(body.applicationId, "execute", "Pipeline triggered from conductor");
      return { pipelineRunId: run.id, status: "pending" };
    });

    // ── Activity feed ────────────────────────────────────────
    app.get("/conductor/activity", async (req) => {
      const appId = (req.query as any).applicationId as string | undefined;
      return prisma.agentActivity.findMany({
        where: appId ? { applicationId: appId } : {},
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    // ── Config: watch settings ───────────────────────────────
    app.get("/conductor/config", async () => {
      const rule = await prisma.rule.findUnique({ where: { key: "conductor_config" } });
      const defaults = {
        autoScanEnabled: false,
        autoRunOnApproval: false,
        watchPaths: ["apps/dummy-app/src", "tests/e2e/smoke"],
        scanIntervalMs: 30000,
      };
      if (!rule) return defaults;
      try {
        return { ...defaults, ...JSON.parse(rule.configJson) };
      } catch {
        return defaults;
      }
    });

    app.put("/conductor/config", async (req) => {
      const body = z
        .object({
          autoScanEnabled: z.boolean().optional(),
          autoRunOnApproval: z.boolean().optional(),
          watchPaths: z.array(z.string()).optional(),
          scanIntervalMs: z.number().optional(),
        })
        .parse(req.body);

      await prisma.rule.upsert({
        where: { key: "conductor_config" },
        create: {
          key: "conductor_config",
          name: "Test Conductor Config",
          description: "Auto-scan and auto-run settings",
          configJson: JSON.stringify(body),
          isEnabled: true,
        },
        update: { configJson: JSON.stringify(body) },
      });
      return body;
    });
  };
}

function listFiles(
  dir: string,
  repoRoot: string
): Array<{ name: string; path: string; size: number; modified: string }> {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: Array<{ name: string; path: string; size: number; modified: string }> = [];
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isFile()) {
      const stat = fs.statSync(abs);
      files.push({
        name: e.name,
        path: path.relative(repoRoot, abs),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    }
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function logActivity(applicationId: string | null, type: string, summary: string) {
  await prisma.agentActivity.create({
    data: {
      applicationId,
      type: type as any,
      summary,
    },
  });
}
