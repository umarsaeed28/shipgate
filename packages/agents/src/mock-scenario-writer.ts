import type { AcceptanceInput, ScenarioWriterOutput } from "./test-scenario-writer.js";

/** Deterministic mock generation for local MVP */
export function generateMockScenarios(input: AcceptanceInput): ScenarioWriterOutput {
  const scenarios = [
    {
      title: `Happy path - ${input.storyTitle.slice(0, 40)}`,
      steps: "1. Preconditions\n2. Execute main flow\n3. Assert success",
      kind: "happy_path" as const,
    },
    {
      title: "Negative - invalid input",
      steps: "1. Provide invalid data\n2. Expect validation error",
      kind: "negative" as const,
    },
    {
      title: "Edge - boundary values",
      steps: "1. Use min/max limits\n2. Assert stable behavior",
      kind: "edge" as const,
    },
  ];
  return {
    scenarios,
    coverageNotes: `Mapped to ${input.acceptanceCriteria.length} acceptance criteria (deduplicated).`,
  };
}
