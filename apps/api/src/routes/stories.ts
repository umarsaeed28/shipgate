import type { FastifyPluginAsync } from "fastify";
import { Queue } from "bullmq";
import { z } from "zod";
import { prisma } from "@shipgate/database";
import type { ScenarioGenerationPayload } from "../queues.js";

const createStory = z.object({
  projectId: z.string(),
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

export function registerStoriesRoutes(queue: Queue): FastifyPluginAsync {
  return async (app) => {
    app.get("/stories", async () => {
      const stories = await prisma.userStory.findMany({
        include: {
          _count: { select: { acceptanceCriteria: true, scenarios: true } },
        },
        orderBy: { key: "asc" },
      });
      return stories.map((s) => ({
        id: s.id,
        key: s.key,
        title: s.title,
        status: s.status,
        criteriaCount: s._count.acceptanceCriteria,
        scenarioCount: s._count.scenarios,
      }));
    });

    app.post("/stories", async (req, reply) => {
      const body = createStory.parse(req.body);
      const project = await prisma.project.findUnique({ where: { id: body.projectId } });
      if (!project) return reply.status(404).send({ error: "Project not found" });
      const story = await prisma.userStory.create({
        data: {
          projectId: body.projectId,
          key: body.key,
          title: body.title,
          description: body.description,
        },
        include: { _count: { select: { acceptanceCriteria: true, scenarios: true } } },
      });
      return {
        id: story.id,
        key: story.key,
        title: story.title,
        status: story.status,
        criteriaCount: story._count.acceptanceCriteria,
        scenarioCount: story._count.scenarios,
      };
    });

    app.post<{ Params: { id: string } }>("/stories/:id/generate", async (req, reply) => {
      const story = await prisma.userStory.findUnique({
        where: { id: req.params.id },
        include: { acceptanceCriteria: true },
      });
      if (!story) return reply.status(404).send({ error: "Story not found" });
      await queue.add(
        "scenario_generation",
        { storyId: story.id } satisfies ScenarioGenerationPayload,
        { removeOnComplete: 100 }
      );
      return { queued: true, storyId: story.id };
    });
  };
}
