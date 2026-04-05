import type { FastifyPluginAsync } from "fastify";
import { Queue } from "bullmq";
import { z } from "zod";
import { prisma } from "@shipgate/database";
import { PipelineStatus } from "@prisma/client";

const createBody = z.object({
  applicationId: z.string(),
  framework: z.enum(["playwright", "codeceptjs"]).default("codeceptjs"),
  promptMarkdown: z.string().optional(),
  useMcp: z.boolean().default(false),
  stories: z
    .array(
      z.object({
        key: z.string(),
        title: z.string(),
        criteria: z.array(z.string()).default([]),
      })
    )
    .optional(),
});

export function registerPipelineRoutes(queue: Queue): FastifyPluginAsync {
  return async (app) => {
    app.get("/pipelines", async () => {
      const runs = await prisma.pipelineRun.findMany({
        include: { application: { select: { name: true, baseUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return runs.map((r) => ({
        id: r.id,
        applicationId: r.applicationId,
        applicationName: r.application.name,
        baseUrl: r.application.baseUrl,
        status: r.status,
        framework: r.framework,
        totalPlanned: r.totalPlanned,
        totalGenerated: r.totalGenerated,
        totalPassed: r.totalPassed,
        totalFailed: r.totalFailed,
        totalHealed: r.totalHealed,
        startedAt: r.startedAt?.toISOString() ?? null,
        finishedAt: r.finishedAt?.toISOString() ?? null,
        durationMs: r.durationMs,
        createdAt: r.createdAt.toISOString(),
      }));
    });

    app.get<{ Params: { id: string } }>("/pipelines/:id", async (req, reply) => {
      const run = await prisma.pipelineRun.findUnique({
        where: { id: req.params.id },
        include: { application: { select: { name: true, baseUrl: true } } },
      });
      if (!run) return reply.status(404).send({ error: "Pipeline run not found" });
      return {
        id: run.id,
        applicationId: run.applicationId,
        applicationName: run.application.name,
        baseUrl: run.application.baseUrl,
        status: run.status,
        framework: run.framework,
        promptMarkdown: run.promptMarkdown,
        storiesJson: run.storiesJson,
        testPlan: run.testPlan,
        planCasesJson: run.planCasesJson,
        coverageSummary: run.coverageSummary,
        generatedScriptsJson: run.generatedScriptsJson,
        generatedConfigJson: run.generatedConfigJson,
        executionLog: run.executionLog,
        executionStatus: run.executionStatus,
        healerLog: run.healerLog,
        healActionsJson: run.healActionsJson,
        reportMarkdown: run.reportMarkdown,
        totalPlanned: run.totalPlanned,
        totalGenerated: run.totalGenerated,
        totalPassed: run.totalPassed,
        totalFailed: run.totalFailed,
        totalHealed: run.totalHealed,
        startedAt: run.startedAt?.toISOString() ?? null,
        finishedAt: run.finishedAt?.toISOString() ?? null,
        durationMs: run.durationMs,
        createdAt: run.createdAt.toISOString(),
      };
    });

    app.post("/pipelines", async (req, reply) => {
      const body = createBody.parse(req.body);
      const appRow = await prisma.testApplication.findUnique({
        where: { id: body.applicationId },
      });
      if (!appRow) return reply.status(404).send({ error: "Application not found" });

      let storiesJson: string | null = null;
      if (body.stories?.length) {
        storiesJson = JSON.stringify(body.stories);
      } else {
        const project = await prisma.project.findFirst({
          where: { testApplications: { some: { id: appRow.id } } },
          include: {
            userStories: { include: { acceptanceCriteria: true } },
          },
        });
        if (project?.userStories.length) {
          storiesJson = JSON.stringify(
            project.userStories.map((s) => ({
              key: s.key,
              title: s.title,
              criteria: s.acceptanceCriteria.map((c) => c.text),
            }))
          );
        }
      }

      const run = await prisma.pipelineRun.create({
        data: {
          applicationId: appRow.id,
          framework: body.framework,
          promptMarkdown: body.promptMarkdown ?? null,
          storiesJson,
          status: PipelineStatus.pending,
        },
      });

      const jobName = body.useMcp ? "pipeline_orchestrate_mcp" : "pipeline_orchestrate";
      await queue.add(
        jobName,
        { pipelineRunId: run.id },
        { removeOnComplete: 50 }
      );

      return { id: run.id, status: run.status };
    });

    app.get("/mcp/servers", async () => {
      const servers = await prisma.mcpServerConfig.findMany({ orderBy: { name: "asc" } });
      return servers.map((s) => ({
        id: s.id,
        key: s.key,
        name: s.name,
        type: s.type,
        endpoint: s.endpoint,
        isEnabled: s.isEnabled,
      }));
    });
  };
}
