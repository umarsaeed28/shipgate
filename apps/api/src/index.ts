import cors from "@fastify/cors";
import Fastify from "fastify";
import { createJobQueue } from "./queues.js";
import { env } from "./env.js";
import { applicationsRoutes } from "./routes/applications.js";
import { registerSuitesRoutes } from "./routes/suites.js";
import { runsRoutes } from "./routes/runs.js";
import { registerStoriesRoutes } from "./routes/stories.js";
import { integrationsRoutes } from "./routes/integrations.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";
import { overviewRoutes } from "./routes/overview.js";
import { aiRoutes } from "./routes/ai.js";
import { casesRoutes } from "./routes/cases.js";
import { projectsRoutes } from "./routes/projects.js";
import { adminRoutes } from "./routes/admin.js";
import { registerPipelineRoutes } from "./routes/pipeline.js";

async function main() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const queue = createJobQueue();

  await app.register(overviewRoutes);
  await app.register(applicationsRoutes);
  await app.register(registerSuitesRoutes(queue));
  await app.register(runsRoutes);
  await app.register(registerStoriesRoutes(queue));
  await app.register(integrationsRoutes);
  await app.register(registerWebhookRoutes(queue));
  await app.register(aiRoutes);
  await app.register(casesRoutes);
  await app.register(projectsRoutes);
  await app.register(adminRoutes);
  await app.register(registerPipelineRoutes(queue));

  app.get("/health", async () => ({ ok: true }));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
