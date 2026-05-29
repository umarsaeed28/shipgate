import type { Agent, AgentDeps, JobKey, RunOutcome, Runner } from "@qa/types";

/**
 * @qa/runner — typed, idempotent in-process orchestration.
 *
 * The full implementation (a content-addressed idempotency cache keyed by
 * (app_version, input_hash, agent_version, prompt_version) per invariant 4, and
 * a Temporal adapter behind this same `Runner` interface) lands alongside the
 * agents. This stub fixes the seam.
 */
export const MILESTONE = "M0-seam" as const;

export class NotImplementedRunner implements Runner {
  async run<I, O>(
    _agent: Agent<I, O>,
    _input: I,
    _key: JobKey,
    _deps: AgentDeps,
  ): Promise<RunOutcome<O>> {
    throw new Error("@qa/runner is implemented alongside the agents (idempotency cache TODO)");
  }
}
