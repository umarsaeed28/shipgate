import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@shipgate/database";
import { mockRegressionAnalyzer } from "../services/mock-agents.js";
import { FailureClassification, TestRunStatus } from "@prisma/client";

export const runsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/runs", async () => {
    const runs = await prisma.testRun.findMany({
      include: {
        suite: { select: { name: true } },
        environment: { select: { name: true } },
        failureEvents: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return runs.map((r) => ({
      id: r.id,
      suiteId: r.suiteId,
      suiteName: r.suite.name,
      applicationId: r.applicationId,
      status: r.status,
      environmentName: r.environment?.name ?? null,
      startedAt: r.startedAt?.toISOString() ?? null,
      finishedAt: r.finishedAt?.toISOString() ?? null,
      durationMs: r.durationMs,
      failureCount: r.failureEvents.length,
    }));
  });

  app.get<{ Params: { id: string } }>("/runs/:id", async (req, reply) => {
    const run = await prisma.testRun.findUnique({
      where: { id: req.params.id },
      include: {
        suite: true,
        environment: true,
        failureEvents: { include: { testCase: true } },
        analyses: true,
      },
    });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    return {
      id: run.id,
      status: run.status,
      suite: { id: run.suite.id, name: run.suite.name },
      environment: run.environment ? { id: run.environment.id, name: run.environment.name } : null,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      durationMs: run.durationMs,
      logs: run.logs,
      triggeredBy: run.triggeredBy,
      jenkinsBuildId: run.jenkinsBuildId,
      failures: run.failureEvents.map((f) => ({
        id: f.id,
        message: f.message,
        stack: f.stack,
        caseName: f.testCase?.name ?? null,
      })),
      analyses: run.analyses.map((a) => ({
        id: a.id,
        classification: a.classification,
        confidence: a.confidence,
        summary: a.summary,
        suggestedAction: a.suggestedAction,
      })),
    };
  });

  const patchBody = z.object({
    status: z.enum(["queued", "running", "passed", "failed", "cancelled", "error"]).optional(),
    durationMs: z.number().optional(),
    logs: z.string().optional(),
  });

  app.patch<{ Params: { id: string } }>("/runs/:id", async (req, reply) => {
    const run = await prisma.testRun.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    const body = patchBody.parse(req.body);
    const now = new Date();
    const updated = await prisma.testRun.update({
      where: { id: run.id },
      data: {
        ...(body.status ? { status: body.status as TestRunStatus } : {}),
        ...(body.status === "running" ? { startedAt: run.startedAt ?? now } : {}),
        ...(body.status === "passed" || body.status === "failed" || body.status === "error"
          ? { finishedAt: now }
          : {}),
        ...(body.durationMs != null ? { durationMs: body.durationMs } : {}),
        ...(body.logs ? { logs: body.logs } : {}),
      },
    });
    return { id: updated.id, status: updated.status };
  });

  const failureBody = z.object({
    message: z.string(),
    stack: z.string().optional(),
    caseName: z.string().optional(),
  });

  app.post<{ Params: { id: string } }>("/runs/:id/failure", async (req, reply) => {
    const run = await prisma.testRun.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    const body = failureBody.parse(req.body);
    const ev = await prisma.failureEvent.create({
      data: {
        runId: run.id,
        message: body.message,
        stack: body.stack,
      },
    });
    return { id: ev.id };
  });

  app.post<{ Params: { id: string } }>("/runs/:id/analyze", async (req, reply) => {
    const run = await prisma.testRun.findUnique({
      where: { id: req.params.id },
      include: { failureEvents: true },
    });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    const result = await mockRegressionAnalyzer.analyze(ctx(), {
      runId: run.id,
      logs: run.logs,
      failures: run.failureEvents.map((f) => ({ message: f.message, stack: f.stack })),
    });
    if (!result.ok || !result.data) {
      return reply.status(500).send({ error: result.error ?? "Analysis failed" });
    }
    const analysis = await prisma.failureAnalysis.create({
      data: {
        runId: run.id,
        failureEventId: run.failureEvents[0]?.id,
        classification: result.data.classification as FailureClassification,
        confidence: result.data.confidence,
        summary: result.data.summary,
        suggestedAction: result.data.suggestedAction,
        rawOutput: JSON.stringify(result.data),
      },
    });
    return {
      id: analysis.id,
      classification: analysis.classification,
      confidence: analysis.confidence,
      summary: analysis.summary,
      suggestedAction: analysis.suggestedAction,
    };
  });
};

function ctx() {
  return { workspaceId: "default" };
}
