import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { IntegrationType } from "@prisma/client";
import { prisma } from "@shipgate/database";
import { mockVerifyJiraConnection, mockVerifyJenkinsConnection } from "@shipgate/integrations";

const jiraBody = z.object({
  workspaceId: z.string().optional(),
  name: z.string().default("Jira"),
  baseUrl: z.string().url(),
  projectKey: z.string().min(1),
});

const jenkinsBody = z.object({
  workspaceId: z.string().optional(),
  name: z.string().default("Jenkins"),
  baseUrl: z.string().url(),
  jobName: z.string().min(1),
});

export const integrationsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/integrations/jira", async (req, reply) => {
    const body = jiraBody.parse(req.body);
    const ok = await mockVerifyJiraConnection({ baseUrl: body.baseUrl, projectKey: body.projectKey });
    if (!ok) return reply.status(400).send({ error: "Connection failed (mock)" });
    const workspace =
      body.workspaceId != null
        ? await prisma.workspace.findUnique({ where: { id: body.workspaceId } })
        : await prisma.workspace.findFirst();
    if (!workspace) return reply.status(400).send({ error: "No workspace" });
    const conn = await prisma.integrationConnection.upsert({
      where: { workspaceId_type: { workspaceId: workspace.id, type: IntegrationType.jira } },
      create: {
        workspaceId: workspace.id,
        type: IntegrationType.jira,
        name: body.name,
        baseUrl: body.baseUrl,
        configJson: JSON.stringify({ projectKey: body.projectKey }),
      },
      update: {
        name: body.name,
        baseUrl: body.baseUrl,
        configJson: JSON.stringify({ projectKey: body.projectKey }),
        isActive: true,
      },
    });
    return { id: conn.id, type: conn.type, baseUrl: conn.baseUrl };
  });

  app.post("/integrations/jenkins", async (req, reply) => {
    const body = jenkinsBody.parse(req.body);
    const ok = await mockVerifyJenkinsConnection({ baseUrl: body.baseUrl, jobName: body.jobName });
    if (!ok) return reply.status(400).send({ error: "Connection failed (mock)" });
    const workspace =
      body.workspaceId != null
        ? await prisma.workspace.findUnique({ where: { id: body.workspaceId } })
        : await prisma.workspace.findFirst();
    if (!workspace) return reply.status(400).send({ error: "No workspace" });
    const conn = await prisma.integrationConnection.upsert({
      where: { workspaceId_type: { workspaceId: workspace.id, type: IntegrationType.jenkins } },
      create: {
        workspaceId: workspace.id,
        type: IntegrationType.jenkins,
        name: body.name,
        baseUrl: body.baseUrl,
        configJson: JSON.stringify({ jobName: body.jobName }),
      },
      update: {
        name: body.name,
        baseUrl: body.baseUrl,
        configJson: JSON.stringify({ jobName: body.jobName }),
        isActive: true,
      },
    });
    return { id: conn.id, type: conn.type, baseUrl: conn.baseUrl };
  });

  app.get("/integrations", async () => {
    const list = await prisma.integrationConnection.findMany({ orderBy: { type: "asc" } });
    return list.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      baseUrl: c.baseUrl,
      isActive: c.isActive,
    }));
  });
};
