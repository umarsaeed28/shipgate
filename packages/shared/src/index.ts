/** API DTOs shared between web and api */

export type NavId =
  | "overview"
  | "applications"
  | "suites"
  | "cases"
  | "runs"
  | "run-center"
  | "stories"
  | "conductor"
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

// === Regression Analyzer Types ===

export type FailureClassificationType =
  | 'BUG'
  | 'TEST_SCRIPT_ISSUE'
  | 'TIMEOUT'
  | 'INFRASTRUCTURE_OR_ENVIRONMENT'
  | 'UNKNOWN_NEEDS_REVIEW';

export type AgentStatus = 'idle' | 'running' | 'error' | 'dormant';

export interface JenkinsBuildDto {
  id: string;
  buildNumber: number;
  jobName: string;
  status: 'SUCCESS' | 'FAILURE' | 'UNSTABLE' | 'ABORTED';
  startedAt: string;
  finishedAt: string;
  duration: number;
  artifactPaths: string[];
  processed: boolean;
}

export interface NormalizedTestResult {
  id: string;
  buildId: string;
  suiteName: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'broken';
  duration: number;
  error?: string;
  stackTrace?: string;
  screenshotPath?: string;
  steps?: TestStep[];
}

export interface TestStep {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
}

export interface FailureAnalysisResult {
  failureId: string;
  testName: string;
  suiteName: string;
  classification: FailureClassificationType;
  confidence: number;
  evidenceList: string[];
  shortExplanation: string;
  suggestedNextAction: string;
}

export interface RunSummaryDto {
  id: string;
  runId: string;
  buildNumber: number;
  overallStatus: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  classificationBreakdown: Record<FailureClassificationType, number>;
  keyFailures: FailureAnalysisResult[];
  likelyRootCauses: string[];
  recommendations: string[];
  markdown: string;
  shortSummary: string;
  createdAt: string;
}

export interface AgentStateDto {
  id: string;
  name: string;
  status: AgentStatus;
  lastWakeAt: string | null;
  lastRunAt: string | null;
  lastProcessedBuild: number | null;
  notes: string;
}

export interface SchedulerConfigDto {
  id: string;
  mode: 'polling' | 'webhook' | 'hybrid';
  cronExpression: string;
  pollIntervalMinutes: number;
  enabled: boolean;
}

export interface SettingsDto {
  jenkinsUrl: string;
  jenkinsJobName: string;
  allureResultsPath: string;
  allureReportPath: string;
  appUrl: string;
  analysisThresholds: {
    minConfidence: number;
    autoClassifyAbove: number;
  };
  scheduler: SchedulerConfigDto;
}

export interface OverviewStatsDto {
  latestBuild: JenkinsBuildDto | null;
  recentRuns: RunSummaryDto[];
  classificationTrend: { date: string; counts: Record<FailureClassificationType, number> }[];
  agentState: AgentStateDto;
  schedulerState: SchedulerConfigDto;
  passFailTrend: { date: string; passed: number; failed: number; total: number }[];
}
