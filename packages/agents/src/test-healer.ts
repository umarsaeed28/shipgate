import type { AgentContext, AgentResult } from "./types.js";

export interface HealerInput {
  pipelineRunId: string;
  scripts: Array<{ filename: string; content: string }>;
  executionLog: string;
  failures: Array<{
    filename: string;
    testName: string;
    error: string;
    screenshot?: string;
  }>;
  /** Max number of heal iterations before giving up */
  maxAttempts?: number;
}

export interface HealAction {
  filename: string;
  testName: string;
  originalError: string;
  fix: string;
  patchedContent: string;
  confidence: number;
}

export interface HealerOutput {
  healed: HealAction[];
  unresolved: Array<{ filename: string; testName: string; reason: string }>;
  attempts: number;
  allPassing: boolean;
}

/** Executes scripts, debugs failures, and auto-fixes without human intervention */
export interface TestHealer {
  heal(ctx: AgentContext, input: HealerInput): Promise<AgentResult<HealerOutput>>;
}
