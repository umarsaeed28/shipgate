import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: join(root, ".env") });
config({ path: join(root, ".env.local") });

const schema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WEBHOOK_SECRET: z.string().default("dev-webhook-secret"),
});

export const env = schema.parse(process.env);
