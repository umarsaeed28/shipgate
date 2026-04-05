import type { FastifyPluginAsync } from "fastify";
import { Queue } from "bullmq";
import { IntegrationType, WebhookDeliveryStatus } from "@prisma/client";
import { prisma } from "@shipgate/database";
import { normalizeJiraWebhookPayload, normalizeJenkinsWebhookPayload } from "@shipgate/integrations";
import { env } from "../env.js";
import type { WebhookPayload } from "../queues.js";

export function registerWebhookRoutes(queue: Queue): FastifyPluginAsync {
  return async (app) => {
    app.post("/webhooks/jira", async (req, reply) => {
      const secret = req.headers["x-shipgate-secret"];
      if (secret !== env.WEBHOOK_SECRET) {
        return reply.status(401).send({ error: "Invalid secret" });
      }
      const payload = req.body;
      const normalized = normalizeJiraWebhookPayload(payload);
      const event = await prisma.webhookEvent.create({
        data: {
          source: IntegrationType.jira,
          payloadJson: JSON.stringify(payload),
          normalizedJson: JSON.stringify(normalized),
          deliveryStatus: WebhookDeliveryStatus.received,
        },
      });
      await queue.add(
        "webhook_processing",
        { source: "jira", raw: payload, eventId: event.id } satisfies WebhookPayload,
        { removeOnComplete: 200 }
      );
      return { received: true, id: event.id };
    });

    app.post("/webhooks/jenkins", async (req, reply) => {
      const secret = req.headers["x-shipgate-secret"];
      if (secret !== env.WEBHOOK_SECRET) {
        return reply.status(401).send({ error: "Invalid secret" });
      }
      const payload = req.body;
      const normalized = normalizeJenkinsWebhookPayload(payload);
      const event = await prisma.webhookEvent.create({
        data: {
          source: IntegrationType.jenkins,
          payloadJson: JSON.stringify(payload),
          normalizedJson: JSON.stringify(normalized),
          deliveryStatus: WebhookDeliveryStatus.received,
        },
      });
      await queue.add(
        "webhook_processing",
        { source: "jenkins", raw: payload, eventId: event.id } satisfies WebhookPayload,
        { removeOnComplete: 200 }
      );
      return { received: true, id: event.id };
    });

    app.get("/webhooks/events", async () => {
      const events = await prisma.webhookEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return events.map((e) => ({
        id: e.id,
        source: e.source,
        deliveryStatus: e.deliveryStatus,
        createdAt: e.createdAt.toISOString(),
        errorMessage: e.errorMessage,
      }));
    });
  };
}
