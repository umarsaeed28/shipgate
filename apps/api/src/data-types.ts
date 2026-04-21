export interface JenkinsBuildRecord {
  id: string;
  buildNumber: number;
  jobName: string;
  status: "SUCCESS" | "FAILURE" | "UNSTABLE" | "ABORTED";
  startedAt: string;
  finishedAt: string;
  duration: number;
  artifactPaths: string[];
  processed: boolean;
  /** Jenkins job build page (e.g. BUILD_URL from CI) */
  jenkinsBuildUrl?: string | null;
  /** Allure report URL when published by Jenkins plugin or Shipgate API */
  allureReportUrl?: string | null;
}

export interface TestRunRecord {
  id: string;
  buildId: string;
  buildNumber: number;
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  status: string;
  reportPath: string;
  /** Link to Allure HTML report (Jenkins or Shipgate-served static files) */
  allureReportUrl?: string | null;
  createdAt: string;
}

export interface TestFailureRecord {
  id: string;
  runId: string;
  buildNumber: number;
  testName: string;
  suiteName: string;
  rawError: string;
  screenshotPath: string;
  tracePath: string;
  classification: string;
  confidence: number;
  summary: string;
  evidence: string[];
  suggestedAction: string;
  createdAt: string;
}

export interface RunSummaryRecord {
  id: string;
  runId: string;
  buildNumber: number;
  markdown: string;
  shortSummary: string;
  allureReportUrl?: string | null;
  overallStatus: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  classificationBreakdown: Record<string, number>;
  keyFailures: any[];
  likelyRootCauses: string[];
  recommendations: string[];
  createdAt: string;
}

export interface AgentStateRecord {
  id: string;
  name: string;
  status: "idle" | "running" | "error" | "dormant";
  lastWakeAt: string | null;
  lastRunAt: string | null;
  lastProcessedBuild: number | null;
  notes: string;
}

export interface SchedulerConfigRecord {
  id: string;
  mode: "polling" | "webhook" | "hybrid";
  cronExpression: string;
  pollIntervalMinutes: number;
  enabled: boolean;
}

export interface SettingsRecord {
  jenkinsUrl: string;
  jenkinsJobName: string;
  allureResultsPath: string;
  allureReportPath: string;
  appUrl: string;
  /** Git remote URL - analyzer uses this to relate Playwright/Allure behavior to application source (logic vs runtime). */
  gitRepoUrl: string;
  analysisThresholds: {
    minConfidence: number;
    autoClassifyAbove: number;
  };
}

export interface BugRecord {
  id: string;
  title: string;
  description: string;
  component: string;
  severity: "critical" | "major" | "minor";
  status: "open" | "resolved";
  injectedAt: string;
  resolvedAt: string | null;
  relatedRunIds: string[];
  relatedFailureIds: string[];
}

export interface Store {
  jenkinsBuilds: JenkinsBuildRecord[];
  testRuns: TestRunRecord[];
  testFailures: TestFailureRecord[];
  runSummaries: RunSummaryRecord[];
  bugs: BugRecord[];
  agentState: AgentStateRecord;
  schedulerConfig: SchedulerConfigRecord;
  settings: SettingsRecord;
}
