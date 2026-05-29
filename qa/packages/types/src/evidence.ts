import { z } from "zod";

export const ArtifactKind = z.enum([
  "trace",
  "video",
  "screenshot",
  "dom",
  "console-log",
  "network-log",
]);
export type ArtifactKind = z.infer<typeof ArtifactKind>;

/** A reference to a content-addressed blob in the ObjectStore. */
export const ArtifactRef = z.object({
  kind: ArtifactKind,
  /** Content hash (the ObjectStore key). Identical artifacts dedup. */
  hash: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type ArtifactRef = z.infer<typeof ArtifactRef>;

export const RetryOutcome = z.enum(["no-retry", "retry-passed", "retry-failed"]);
export type RetryOutcome = z.infer<typeof RetryOutcome>;

export const NetworkError = z.object({
  url: z.string(),
  status: z.number().int(),
});
export type NetworkError = z.infer<typeof NetworkError>;

/** Typed bundle of everything we know about one run, for triage/healing. */
export const EvidenceBundle = z.object({
  id: z.string(),
  runId: z.string(),
  artifacts: z.array(ArtifactRef),
  consoleErrors: z.array(z.string()),
  networkErrors: z.array(NetworkError),
  retryOutcome: RetryOutcome,
  /** Content hashes of diffs vs last-green, when computed. */
  domDiffHash: z.string().optional(),
  screenshotDiffHash: z.string().optional(),
});
export type EvidenceBundle = z.infer<typeof EvidenceBundle>;
