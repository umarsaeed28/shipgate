import { Queue } from "bullmq";
import { createRedis } from "./redis.js";

export const QUEUE_NAMES = {
  default: "shipgate-jobs",
} as const;

export type JobName =
  | "scenario_generation"
  | "run_analysis"
  | "suite_aggregation"
  | "webhook_processing"
  | "mock_run_execution";

export interface ScenarioGenerationPayload {
  storyId: string;
}

export interface RunAnalysisPayload {
  runId: string;
}

export interface WebhookPayload {
  source: "jira" | "jenkins";
  raw: unknown;
  eventId: string;
}

export interface MockRunPayload {
  runId: string;
}

export function createJobQueue(): Queue {
  const connection = createRedis();
  return new Queue(QUEUE_NAMES.default, { connection });
}
