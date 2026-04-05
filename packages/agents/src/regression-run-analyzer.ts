import type { AgentContext, AgentResult, FailureClassification } from "./types.js";

export interface RunAnalysisInput {
  runId: string;
  logs: string | null;
  failures: Array<{ message: string; stack?: string | null }>;
}

export interface RunAnalysisOutput {
  classification: FailureClassification;
  confidence: number;
  summary: string;
  suggestedAction: string;
}

/** Classifies failures: REAL_BUG, BROKEN_TEST, ENVIRONMENT, NEEDS_REVIEW */
export interface RegressionRunAnalyzer {
  analyze(
    ctx: AgentContext,
    input: RunAnalysisInput
  ): Promise<AgentResult<RunAnalysisOutput>>;
}
