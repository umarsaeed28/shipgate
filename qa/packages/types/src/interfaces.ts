import type { z } from "zod";
import type { Trajectory, TrajectoryEvent } from "./trajectory.js";

/**
 * Injected side-effect interfaces. Everything that touches the outside world
 * (db, network, MCP, LLM, object storage) hides behind one of these so it can
 * be faked in tests (TS conventions + invariant: deterministic, replayable).
 */

export interface ToolContext {
  readonly trajectoryId: string;
}

/**
 * A tool the agents may call. `destructive` is pinned to `false` at the type
 * level (invariant 6: no destructive tool can exist in any allowlist).
 */
export interface Tool<I = unknown, O = unknown> {
  readonly name: string;
  readonly inputSchema: z.ZodType<I>;
  readonly outputSchema: z.ZodType<O>;
  readonly destructive: false;
  execute(input: I, ctx: ToolContext): Promise<O>;
}

/** Anything an agent needs injected at run time. */
export interface AgentDeps {
  readonly gateway: ModelGateway;
  readonly trajectories: TrajectoryStore;
  /** Only tools whose names are in the agent's allowlist are dispatchable. */
  readonly tools: ReadonlyMap<string, Tool>;
}

export interface Agent<I = unknown, O = unknown> {
  readonly name: string;
  readonly version: string;
  /** The CLOSED set of tool names this agent may invoke (invariant 6). */
  readonly toolAllowlist: readonly string[];
  run(input: I, deps: AgentDeps): Promise<O>;
}

/** Provider-agnostic model gateway. The only path to an LLM call (invariant 2). */
export interface ModelCallRequest<T> {
  readonly promptVersionId: string;
  /** Pinned model snapshot id. */
  readonly model: string;
  readonly temperature: number;
  /** Trusted instructions. */
  readonly system: string;
  /** Untrusted data (app/page content) — never placed in `system`. */
  readonly input: string;
  readonly responseSchema: z.ZodType<T>;
}

export interface ModelCallResult<T> {
  readonly output: T;
  readonly raw: string;
  readonly usage: { readonly inputTokens: number; readonly outputTokens: number };
  readonly cacheHit: boolean;
}

export interface ModelGateway {
  call<T>(
    req: ModelCallRequest<T>,
    ctx: ToolContext,
  ): Promise<ModelCallResult<T>>;
}

export interface TrajectoryMeta {
  readonly agentVersion: string;
  readonly promptVersion: string;
  readonly appVersionId: string;
  readonly inputHash: string;
}

export interface TrajectoryStore {
  create(meta: TrajectoryMeta): Promise<string>;
  append(trajectoryId: string, event: TrajectoryEvent): Promise<void>;
  load(trajectoryId: string): Promise<Trajectory>;
}

/** Content-addressed object storage (S3/MinIO). Identical content dedups. */
export interface PutResult {
  readonly hash: string;
  readonly deduped: boolean;
}

export interface ObjectStore {
  put(content: Uint8Array | string): Promise<PutResult>;
  get(hash: string): Promise<Uint8Array | null>;
  exists(hash: string): Promise<boolean>;
}

/**
 * Idempotent, typed in-process orchestration. Jobs are keyed by
 * (app_version, input_hash, agent_version, prompt_version) — invariant 4. The
 * Temporal adapter is a future seam behind this same interface.
 */
export interface JobKey {
  readonly appVersionId: string;
  readonly inputHash: string;
  readonly agentVersion: string;
  readonly promptVersion: string;
}

export interface RunOutcome<O> {
  readonly output: O;
  readonly cacheHit: boolean;
}

export interface Runner {
  run<I, O>(
    agent: Agent<I, O>,
    input: I,
    key: JobKey,
    deps: AgentDeps,
  ): Promise<RunOutcome<O>>;
}
