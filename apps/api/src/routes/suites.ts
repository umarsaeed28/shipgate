import type { FastifyPluginAsync } from "fastify";
import { Queue } from "bullmq";
import { z } from "zod";
import { prisma } from "@shipgate/database";
import { TestRunStatus } from "@prisma/client";
import type { MockRunPayload } from "../queues.js";

const createBody = z.object({
  name: z.string().min(1),
  applicationId: z.string(),
  description: z.string().optional(),
  owner: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export function registerSuitesRoutes(queue: Queue): FastifyPluginAsync {
  return async (app) => {
    app.get("/suites", async () => {
      const suites = await prisma.testSuite.findMany({
        include: {
          application: { select: { name: true } },
          healthSnapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
        },
        orderBy: { name: "asc" },
      });
      return suites.map((s) => {
        const h = s.healthSnapshots[0];
        return {
          id: s.id,
          name: s.name,
          applicationId: s.applicationId,
          applicationName: s.application.name,
          owner: s.owner,
          tags: s.tags,
          passRate: h?.passRate ?? null,
          flakyRate: h?.flakyRate ?? null,
        };
      });
    });

    app.post("/suites", async (req, reply) => {
      const body = createBody.parse(req.body);
      const appRow = await prisma.testApplication.findUnique({ where: { id: body.applicationId } });
      if (!appRow) return reply.status(404).send({ error: "Application not found" });
      const suite = await prisma.testSuite.create({
        data: {
          applicationId: body.applicationId,
          name: body.name,
          description: body.description,
          owner: body.owner,
          tags: body.tags ?? [],
        },
        include: { application: { select: { name: true } }, healthSnapshots: true },
      });
      return {
        id: suite.id,
        name: suite.name,
        applicationId: suite.applicationId,
        applicationName: suite.application.name,
        owner: suite.owner,
        tags: suite.tags,
        passRate: null,
        flakyRate: null,
      };
    });

    app.post<{ Params: { id: string } }>("/suites/:id/run", async (req, reply) => {
      const suite = await prisma.testSuite.findUnique({ where: { id: req.params.id } });
      if (!suite) return reply.status(404).send({ error: "Suite not found" });
      const run = await prisma.testRun.create({
        data: {
          suiteId: suite.id,
          applicationId: suite.applicationId,
          status: TestRunStatus.queued,
          triggeredBy: "api",
        },
      });
      await queue.add(
        "mock_run_execution",
        { runId: run.id } satisfies MockRunPayload,
        { removeOnComplete: 100 }
      );
      return { runId: run.id, status: run.status };
    });
  };
}
