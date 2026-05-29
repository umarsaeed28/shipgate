import { z } from "zod";
import { Locator } from "./element.js";

export const RunStatus = z.enum(["passed", "failed", "flaky", "skipped"]);
export type RunStatus = z.infer<typeof RunStatus>;

/** The deterministic, machine-extracted shape of a failure. */
export const FailureErrorType = z.enum([
  "assertion",
  "locator-not-found",
  "timeout",
  "network",
  "navigation",
  "unknown",
]);
export type FailureErrorType = z.infer<typeof FailureErrorType>;

export const FailureSignal = z.object({
  errorType: FailureErrorType,
  errorMessage: z.string(),
  stack: z.string().optional(),
  /** Present for locator-not-found. */
  failedLocator: Locator.optional(),
  /** Present for assertion mismatches (oracle side). */
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
  /** Present for network failures. */
  statusCode: z.number().int().optional(),
});
export type FailureSignal = z.infer<typeof FailureSignal>;

export const Failure = z.object({
  id: z.string(),
  testId: z.string(),
  runId: z.string(),
  signal: FailureSignal,
  /** True if a retry of the same test/version subsequently passed. */
  retriedAndPassed: z.boolean(),
});
export type Failure = z.infer<typeof Failure>;

export const Run = z.object({
  id: z.string(),
  testId: z.string(),
  appVersionId: z.string(),
  status: RunStatus,
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  attempts: z.number().int().positive(),
  /** Content-addressed hash of the EvidenceBundle for this run. */
  evidenceBundleHash: z.string().optional(),
});
export type Run = z.infer<typeof Run>;
