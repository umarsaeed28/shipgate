import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@shipgate/database";

/** Expose projects for story forms and run center */
export const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects", async () => {
    const projects = await prisma.project.findMany({
      include: { workspace: { select: { name: true, slug: true } } },
    });
    return projects.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      workspaceId: p.workspaceId,
      workspaceSlug: p.workspace.slug,
    }));
  });
};
