import { z } from "zod";

/**
 * Structured agent output contracts. Agents must validate Claude output against
 * these and reject + retry on invalid output (see qa-platform.mdc).
 */

export const ScenarioKind = z.enum(["story_driven", "code_deviation"]);
export type ScenarioKind = z.infer<typeof ScenarioKind>;

export const ScenarioDraft = z.object({
  title: z.string().min(3),
  kind: ScenarioKind,
  steps: z.array(z.string().min(1)).min(1),
  rationale: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});
export type ScenarioDraft = z.infer<typeof ScenarioDraft>;

export const ScenarioDraftList = z.object({
  scenarios: z.array(ScenarioDraft).min(1),
});
export type ScenarioDraftList = z.infer<typeof ScenarioDraftList>;

/** Generated CodeceptJS test (web layer, Playwright helper). */
export const GeneratedTest = z.object({
  filename: z
    .string()
    .regex(/^[A-Za-z0-9._-]+_test\.js$/, "must end with _test.js"),
  code: z.string().min(20),
  summary: z.string().optional(),
});
export type GeneratedTest = z.infer<typeof GeneratedTest>;

/** Agent 2 failure classification. */
export const Classification = z.object({
  class: z.enum(["real_bug", "test_issue", "flaky"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  evidenceUrls: z.array(z.string()).default([]),
});
export type Classification = z.infer<typeof Classification>;

/** Helper: stringify a Zod schema's shape for prompting the model. */
export type AnyZod = z.ZodTypeAny;
export { z };
