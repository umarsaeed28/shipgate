import type { AgentContext, AgentResult } from "./types.js";

export type RiskLevel = "low" | "medium" | "high";

export interface SuiteVisualizerInput {
  suiteId: string;
  recentRunIds: string[];
}

export interface SuiteVisualizerOutput {
  passRate: number;
  flakyRate: number;
  riskLevel: RiskLevel;
  releaseSummary: string;
}

/** Aggregates runs/suites/scenarios into health and release-facing metrics */
export interface SuiteVisualizer {
  summarize(
    ctx: AgentContext,
    input: SuiteVisualizerInput
  ): Promise<AgentResult<SuiteVisualizerOutput>>;
}
