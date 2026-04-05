import type { AgentContext, AgentResult } from "./types.js";

export interface PlannerInput {
  applicationId: string;
  baseUrl: string;
  userStories: Array<{ key: string; title: string; criteria: string[] }>;
  promptInstructions?: string;
  /** Observations captured during exploratory testing (screenshots, DOM snapshots) */
  observations?: Array<{ url: string; screenshot?: string; notes: string }>;
}

export interface PlannedTestCase {
  title: string;
  category: "happy_path" | "negative" | "edge" | "accessibility" | "security";
  priority: "P0" | "P1" | "P2" | "P3";
  storyRef?: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
}

export interface TestPlanOutput {
  planMarkdown: string;
  cases: PlannedTestCase[];
  coverageSummary: string;
}

/** Explores the SUT based on user stories and creates a comprehensive test plan */
export interface TestPlanner {
  plan(ctx: AgentContext, input: PlannerInput): Promise<AgentResult<TestPlanOutput>>;
}
