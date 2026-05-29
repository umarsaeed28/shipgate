import { z } from "zod";

/**
 * Pinned, content-identifiable versions. Jobs are keyed by
 * (app_version, input_hash, agent_version, prompt_version) — invariant 4.
 */
export const PromptVersion = z.object({
  id: z.string(),
  agent: z.string(),
  /** The instruction template. Untrusted page content is NEVER inlined here. */
  template: z.string(),
  /** Pinned model snapshot id this prompt was authored/evaluated against. */
  model: z.string(),
  temperature: z.number().min(0).max(2),
  createdAt: z.string().datetime(),
});
export type PromptVersion = z.infer<typeof PromptVersion>;

export const AgentVersion = z.object({
  name: z.string(),
  version: z.string(),
  promptVersionId: z.string(),
  /** Pinned model snapshot. */
  model: z.string(),
});
export type AgentVersion = z.infer<typeof AgentVersion>;
