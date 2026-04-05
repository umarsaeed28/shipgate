import type { AgentContext, AgentResult } from "./types.js";
import type { PlannedTestCase } from "./test-planner.js";

export interface GeneratorInput {
  applicationId: string;
  baseUrl: string;
  framework: "playwright" | "codeceptjs";
  testPlanMarkdown: string;
  plannedCases: PlannedTestCase[];
  /** DOM observations from Playwright MCP exploration */
  observations?: Array<{ url: string; selectors: string[]; notes: string }>;
}

export interface GeneratedScript {
  filename: string;
  content: string;
  caseRefs: string[];
}

export interface GeneratorOutput {
  scripts: GeneratedScript[];
  configFile?: { filename: string; content: string };
  stepsFile?: { filename: string; content: string };
  totalScenarios: number;
}

/** Takes the test plan + exploratory observations and generates automation scripts */
export interface TestGenerator {
  generate(ctx: AgentContext, input: GeneratorInput): Promise<AgentResult<GeneratorOutput>>;
}
