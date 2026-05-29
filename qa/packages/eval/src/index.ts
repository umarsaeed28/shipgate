/**
 * @qa/eval — the gate (Milestone 6).
 *
 * Replays committed golden trajectories against a candidate agent/prompt/model
 * version and scores it (triage precision/recall + calibration, heal precision,
 * abstention correctness). A regression vs the golden baseline FAILS the run —
 * repeatability is gated, not assumed (invariant 7). Golden cases live in
 * `fixtures/` and are committed.
 */
export const MILESTONE = "M6" as const;
