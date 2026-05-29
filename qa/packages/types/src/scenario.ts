import { z } from "zod";

export const ScenarioStep = z.object({
  index: z.number().int().nonnegative(),
  description: z.string(),
  intentTags: z.array(z.string()),
});
export type ScenarioStep = z.infer<typeof ScenarioStep>;

/**
 * A human-readable scenario. The Scenario Author (stubbed) turns requirements
 * into these; they compile down to executable Tests.
 */
export const Scenario = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  appVersionId: z.string(),
  steps: z.array(ScenarioStep),
});
export type Scenario = z.infer<typeof Scenario>;
