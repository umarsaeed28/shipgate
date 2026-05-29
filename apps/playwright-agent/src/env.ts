import { z } from "zod";

const envSchema = z.object({
  SHIPGATE_API_URL: z.string().url().default("http://localhost:4000"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_BASE_URL: z.string().url().optional(),
  AGENT_MODEL: z.string().default("gpt-4o-mini"),
  POLL_INTERVAL_MS: z.coerce.number().min(1000).default(4000),
  MAX_AGENT_STEPS: z.coerce.number().min(3).max(60).default(18),
});

export type AgentEnv = z.infer<typeof envSchema>;

export function loadEnv(): AgentEnv {
  return envSchema.parse({
    SHIPGATE_API_URL: process.env.SHIPGATE_API_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    AGENT_MODEL: process.env.AGENT_MODEL,
    POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
    MAX_AGENT_STEPS: process.env.MAX_AGENT_STEPS,
  });
}
