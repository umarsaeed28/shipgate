import fs from "node:fs";
import path from "node:path";
import type { Store } from "./data-types.js";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

export function defaultStore(): Store {
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
      notes: "",
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
  };
}

let cached: Store | null = null;

export function loadStore(): Store {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const store = defaultStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
    return store;
  }
  const raw = fs.readFileSync(STORE_FILE, "utf-8");
  const store = JSON.parse(raw) as Store;
  if (typeof store.settings.gitRepoUrl !== "string") {
    store.settings.gitRepoUrl = "";
  }
  return store;
}

export function saveStore(store: Store): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  cached = store;
}

export function getStore(): Store {
  if (!cached) {
    cached = loadStore();
  }
  return cached;
}

export function isStoreEmpty(): boolean {
  const store = getStore();
  return store.jenkinsBuilds.length === 0 && store.testRuns.length === 0;
}
