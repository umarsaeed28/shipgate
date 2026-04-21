import type { AgentContext, AgentResult } from "./types.js";

export interface AcceptanceInput {
  storyTitle: string;
  acceptanceCriteria: string[];
}

export interface GeneratedScenario {
  title: string;
  steps: string;
  kind: "happy_path" | "negative" | "edge";
}

export interface ScenarioWriterOutput {
  scenarios: GeneratedScenario[];
  coverageNotes: string;
}

/** Generates structured scenarios from a user story - happy, negative, edge; deduped */
export interface TestScenarioWriter {
  generate(
    ctx: AgentContext,
    input: AcceptanceInput
  ): Promise<AgentResult<ScenarioWriterOutput>>;
}
