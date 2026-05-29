export type BuildStatus = 'SUCCESS' | 'FAILURE' | 'UNSTABLE' | 'ABORTED';

export type Classification =
  | 'BUG'
  | 'TEST_SCRIPT_ISSUE'
  | 'TIMEOUT'
  | 'INFRASTRUCTURE_OR_ENVIRONMENT'
  | 'UNKNOWN_NEEDS_REVIEW';

export interface OverviewPassFailPoint {
  buildNumber: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
}

export interface OverviewRecentSummary {
  id: string;
  buildNumber: number;
  shortSummary: string;
  overallStatus: string;
  totalTests: number;
  passed: number;
  failed: number;
  createdAt: string;
}

export interface OverviewLatestBuild {
  id: string;
  buildNumber: number;
  jobName: string;
  status: BuildStatus;
  startedAt: string;
  finishedAt: string;
  duration: number;
  artifactPaths: string[];
  processed: boolean;
  jenkinsBuildUrl?: string | null;
  allureReportUrl?: string | null;
}

export interface OverviewAgentState {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'error' | 'dormant';
  lastWakeAt: string | null;
  lastRunAt: string | null;
  lastProcessedBuild: number | null;
  notes: string;
}

export interface OverviewSchedulerConfig {
  id: string;
  mode: 'polling' | 'webhook' | 'hybrid';
  cronExpression: string;
  pollIntervalMinutes: number;
  enabled: boolean;
}

/** GET /api/regression/overview */
export interface OverviewResponse {
  latestBuild: OverviewLatestBuild | null;
  recentSummaries: OverviewRecentSummary[];
  passFailTrend: OverviewPassFailPoint[];
  classificationBreakdown: Record<string, number>;
  totals: { tests: number; passed: number; failed: number };
  agentState: OverviewAgentState;
  schedulerConfig: OverviewSchedulerConfig;
}

export interface TrendPoint {
  buildNumber: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  passRate: number;
}

export interface Run {
  id: string;
  buildNumber: number;
  status: BuildStatus;
  startedAt: string;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  url?: string;
  /** Allure HTML report (Jenkins plugin URL or Shipgate API static path) */
  allureReportUrl?: string | null;
}

export interface RunDetail extends Run {
  failures: TestFailure[];
  classificationBreakdown: Record<Classification, number>;
  summary?: RunSummary;
}

export interface TestFailure {
  id: string;
  testName: string;
  suiteName: string;
  classification: Classification;
  confidence: number;
  errorMessage: string;
  stackTrace?: string;
  action?: string;
  evidence?: string[];
  buildNumber?: number;
}

export interface RunSummary {
  id: string;
  runId: string;
  buildNumber: number;
  status: BuildStatus;
  createdAt: string;
  summary: string;
  allureReportUrl?: string;
}

export interface AgentInfo {
  name: string;
  status: 'idle' | 'running' | 'error' | 'disabled';
  lastWake?: string;
  /** ISO time of last completed analysis */
  lastRun?: string;
  lastProcessedBuild?: number;
  notes?: string;
  mode?: string;
  cron?: string;
  pollIntervalMinutes?: number;
  enabled?: boolean;
  nextScheduled?: string;
}

export interface AgentStatusData {
  agents: AgentInfo[];
  activityLog: AgentActivity[];
  /** Jenkins/analyzer builds waiting for analysis */
  pendingBuilds?: number;
}

export interface AgentActivity {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  details?: string;
  status: 'success' | 'error' | 'info';
  /** When this row is a completed test run analysis */
  runId?: string;
}

export interface Settings {
  jenkins: {
    url: string;
    jobName: string;
  };
  allure: {
    resultsDir: string;
    reportDir: string;
  };
  /** Application under test (e.g. mortgage app for e2e). */
  application: {
    url: string;
  };
  /** Git remote - analyzer ties Playwright/Codecept behavior to source logic in summaries and classifications. */
  repository: {
    url: string;
  };
  analysis: {
    minConfidence: number;
    /** Stored server-side as autoClassifyAbove - confidence at or above this auto-assigns a label when applicable. */
    autoClassifyThreshold: number;
  };
  /** Persisted scheduler config (worker + agent status read this). */
  scheduler: {
    mode: 'polling' | 'webhook' | 'hybrid';
    cronExpression: string;
    pollIntervalMinutes: number;
    enabled: boolean;
  };
}

export interface Build {
  number: number;
  status: BuildStatus;
  timestamp: string;
  duration: number;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  component: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'open' | 'resolved';
  injectedAt: string;
  resolvedAt: string | null;
  relatedRunIds: string[];
  relatedFailureIds: string[];
}

export interface DemoSettings {
  simulateBug: boolean;
  simulateDelay: boolean;
}

export interface JenkinsRemoteBuild {
  number: number;
  url: string;
  building: boolean;
  result: string | null;
  duration: number;
  timestamp: number;
}

export interface JenkinsPipelineData {
  jenkinsUrl: string;
  /** When set, the API uses this base URL to reach Jenkins (JENKINS_INTERNAL_URL); UI links still use jenkinsUrl. */
  jenkinsFetchBase?: string;
  /** live = polled Jenkins; local = Jenkins unreachable, data from analyzer / Demo Tools runs */
  pipelineMode: 'jenkins' | 'local';
  /** Present when pipelineMode is local - why live Jenkins was not used */
  liveJenkinsError?: string;
  jobName: string;
  jobUiUrl: string;
  remote:
    | { ok: true; job: { name: string; url: string; builds: JenkinsRemoteBuild[] } }
    | { ok: false; error: string };
  recorded: Array<{
    id: string;
    buildNumber: number;
    jobName: string;
    status: string;
    processed: boolean;
    jenkinsBuildUrl?: string | null;
    allureReportUrl?: string | null;
    duration: number;
  }>;
}

/** Work for the Playwright + LLM agent (operator view in Analysis UI). */
export interface AgentJob {
  id: string;
  kind: 'explore' | 'failure_followup';
  status: 'pending' | 'running' | 'completed' | 'failed';
  sutUrl: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  relatedFailureId: string | null;
  error: string | null;
  trace?: Array<{ step: number; action: string; detail: string }>;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    llmCalls: number;
  };
}

/** Output posted by the agent after a job; primary artifact in the agent UI. */
export interface AgentFinding {
  id: string;
  jobId: string;
  title: string;
  summary: string;
  classification: string;
  confidence: number;
  steps: Array<{ step: number; action: string; detail: string }>;
  createdAt: string;
}

/** Streamed lines from the Playwright intelligence agent (Console tab). */
export interface AgentLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  jobId: string | null;
}

export interface RunTokenResponse {
  ok: boolean;
  token: string;
}

export interface RunStatusResponse {
  token: string;
  status: 'running' | 'passed' | 'failed';
  log: string;
  elapsed: number;
  exitCode: number | null;
  buildId: string | null;
  runId: string | null;
  allureReportUrl?: string | null;
}
