import type { AgentContext, AgentResult } from "./types.js";

export type ConductorTrigger =
  | { kind: "webhook_jira"; payload: unknown }
  | { kind: "webhook_jenkins"; payload: unknown }
  | { kind: "manual_run"; suiteId: string; environmentId?: string }
  | { kind: "analyze_run"; runId: string }
  | { kind: "generate_scenarios"; storyId: string };

export type ConductorTask =
  | "scenario_generation"
  | "run_analysis"
  | "suite_aggregation"
  | "webhook_processing"
  | "mock_run_execution";

export interface TestConductor {
  /** Route incoming triggers, load context, enqueue or invoke downstream work */
  dispatch(
    ctx: AgentContext,
    trigger: ConductorTrigger
  ): Promise<AgentResult<{ task: ConductorTask; jobId: string }>>;
}
