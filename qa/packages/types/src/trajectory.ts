import { z } from "zod";

/**
 * INVARIANT 3 — record everything. Every LLM call and tool call is appended to
 * a Trajectory with enough metadata to replay it deterministically.
 */

export const LlmCallEvent = z.object({
  kind: z.literal("llm_call"),
  at: z.string().datetime(),
  promptVersionId: z.string(),
  model: z.string(),
  temperature: z.number(),
  /** Trusted instructions. */
  system: z.string(),
  /** Untrusted data (page/snapshot content lives here, never in `system`). */
  input: z.string(),
  rawOutput: z.string(),
  /** Whether rawOutput passed the response zod schema. */
  parsedOk: z.boolean(),
  cacheHit: z.boolean(),
});
export type LlmCallEvent = z.infer<typeof LlmCallEvent>;

export const ToolCallEvent = z.object({
  kind: z.literal("tool_call"),
  at: z.string().datetime(),
  tool: z.string(),
  input: z.unknown(),
  output: z.unknown(),
});
export type ToolCallEvent = z.infer<typeof ToolCallEvent>;

export const TrajectoryEvent = z.discriminatedUnion("kind", [
  LlmCallEvent,
  ToolCallEvent,
]);
export type TrajectoryEvent = z.infer<typeof TrajectoryEvent>;

export const Trajectory = z.object({
  id: z.string(),
  agentVersion: z.string(),
  promptVersion: z.string(),
  appVersionId: z.string(),
  inputHash: z.string(),
  events: z.array(TrajectoryEvent),
  createdAt: z.string().datetime(),
});
export type Trajectory = z.infer<typeof Trajectory>;
