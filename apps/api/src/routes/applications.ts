import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "@shipgate/database";

const createBody = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  jiraProjectKey: z.string().optional(),
  jenkinsJobName: z.string().optional(),
  credentialsJson: z.string().optional(),
});

export const applicationsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/applications", async () => {
    const apps = await prisma.testApplication.findMany({
      include: {
        _count: { select: { environments: true, suites: true } },
      },
      orderBy: { name: "asc" },
    });
    return apps.map((a) => ({
      id: a.id,
      name: a.name,
      baseUrl: a.baseUrl,
      jiraProjectKey: a.jiraProjectKey,
      jenkinsJobName: a.jenkinsJobName,
      environmentCount: a._count.environments,
      suiteCount: a._count.suites,
    }));
  });

  app.get<{ Params: { id: string } }>("/applications/:id", async (req, reply) => {
    const a = await prisma.testApplication.findUnique({
      where: { id: req.params.id },
      include: {
        environments: true,
        suites: { select: { id: true, name: true, tags: true, owner: true } },
      },
    });
    if (!a) return reply.status(404).send({ error: "Not found" });
    return {
      id: a.id,
      name: a.name,
      baseUrl: a.baseUrl,
      credentialsJson: a.credentialsJson,
      jiraProjectKey: a.jiraProjectKey,
      jenkinsJobName: a.jenkinsJobName,
      environments: a.environments.map((e) => ({
        id: e.id,
        name: e.name,
        baseUrl: e.baseUrl,
      })),
      suites: a.suites,
    };
  });

  app.post("/applications", async (req, reply) => {
    const body = createBody.parse(req.body);
    const workspace =
      body.workspaceId != null
        ? await prisma.workspace.findUnique({ where: { id: body.workspaceId } })
        : await prisma.workspace.findFirst();
    if (!workspace) {
      return reply.status(400).send({ error: "No workspace found; seed the database first." });
    }
    const created = await prisma.testApplication.create({
      data: {
        workspaceId: workspace.id,
        projectId: body.projectId,
        name: body.name,
        baseUrl: body.baseUrl,
        jiraProjectKey: body.jiraProjectKey,
        jenkinsJobName: body.jenkinsJobName,
        credentialsJson: body.credentialsJson ?? "{}",
      },
      include: { _count: { select: { environments: true, suites: true } } },
    });
    return {
      id: created.id,
      name: created.name,
      baseUrl: created.baseUrl,
      jiraProjectKey: created.jiraProjectKey,
      jenkinsJobName: created.jenkinsJobName,
      environmentCount: created._count.environments,
      suiteCount: created._count.suites,
    };
  });
};
