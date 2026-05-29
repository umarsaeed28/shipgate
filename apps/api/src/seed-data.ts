import type { Store } from "./data-types.js";

export function createSeedData(): Store {
  return {
    jenkinsBuilds: [],
    testRuns: [],
    testFailures: [],
    runSummaries: [],
    bugs: [],

    agentState: {
      id: crypto.randomUUID(),
      name: "regression-analyzer",
      status: "idle",
      lastWakeAt: null,
      lastRunAt: null,
      lastProcessedBuild: null,
      notes: "Ready. Use Demo Tools to inject a bug and run the regression suite.",
    },

    schedulerConfig: {
      id: crypto.randomUUID(),
      mode: "polling",
      cronExpression: "*/5 * * * *",
      pollIntervalMinutes: 5,
      enabled: false,
    },

    settings: {
      jenkinsUrl: "http://127.0.0.1:8080",
      jenkinsJobName: "shipgate-regression",
      allureResultsPath: "./allure-results",
      allureReportPath: "./allure-report",
      appUrl: "http://localhost:3099",
      gitRepoUrl: "",
      analysisThresholds: {
        minConfidence: 0.6,
        autoClassifyAbove: 0.85,
      },
    },

    agentJobs: [],
    agentFindings: [],
    agentLogs: [],
  };
}
