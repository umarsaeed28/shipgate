import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@shipgate/database";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/rules", async () => {
    const rules = await prisma.rule.findMany({ orderBy: { name: "asc" } });
    return rules.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description,
      isEnabled: r.isEnabled,
      configJson: r.configJson,
    }));
  });

  app.get("/admin/prompts", async () => {
    const prompts = await prisma.promptTemplate.findMany({ orderBy: { title: "asc" } });
    return prompts.map((p) => ({
      id: p.id,
      key: p.key,
      title: p.title,
      body: p.body,
      version: p.version,
    }));
  });

  app.get("/admin/audit", async () => {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return logs.map((l) => ({
      id: l.id,
      actor: l.actor,
      action: l.action,
      resource: l.resource,
      createdAt: l.createdAt.toISOString(),
      detailsJson: l.detailsJson,
    }));
  });

  app.get("/admin/tools", async () => {
    const mcpServers = await prisma.mcpServerConfig.findMany({ orderBy: { name: "asc" } });
    const builtIn = [
      { id: "cursor", name: "Cursor", status: "ready", description: "IDE agent context", type: "built-in" },
    ];
    const mcp = mcpServers.map((s) => ({
      id: s.key,
      name: s.name,
      status: s.isEnabled ? "active" : "disabled",
      description: `${s.type} MCP server${s.endpoint ? ` (${s.endpoint})` : ""}`,
      type: "mcp",
    }));
    return { tools: [...builtIn, ...mcp] };
  });
};
