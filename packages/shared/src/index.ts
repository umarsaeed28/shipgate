/** API DTOs shared between web and api */

export type NavId =
  | "overview"
  | "applications"
  | "suites"
  | "cases"
  | "runs"
  | "run-center"
  | "stories"
  | "pipelines"
  | "integrations"
  | "admin";

export interface ApplicationDto {
  id: string;
  name: string;
  baseUrl: string;
  jiraProjectKey: string | null;
  jenkinsJobName: string | null;
  environmentCount: number;
  suiteCount: number;
}

export interface SuiteDto {
  id: string;
  name: string;
  applicationId: string;
  applicationName: string;
  owner: string | null;
  tags: string[];
  passRate: number | null;
  flakyRate: number | null;
}

export interface TestCaseDto {
  id: string;
  name: string;
  suiteId: string;
  suiteName: string;
  priority: string;
  status: string;
  lastResult: "passed" | "failed" | "skipped" | "unknown";
}

export interface TestRunDto {
  id: string;
  suiteId: string;
  suiteName: string;
  applicationId: string;
  status: string;
  environmentName: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  failureCount: number;
}

export interface OverviewMetricsDto {
  passRate: number;
  failureRate: number;
  flakyRate: number;
  activeRuns: number;
  releaseRisk: "low" | "medium" | "high";
}

export interface StoryDto {
  id: string;
  key: string;
  title: string;
  status: string;
  criteriaCount: number;
  scenarioCount: number;
}

export interface ChatMessageDto {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessageDto[];
  context?: {
    runId?: string;
    suiteId?: string;
  };
}
