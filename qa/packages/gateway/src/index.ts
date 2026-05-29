import type { ModelCallRequest, ModelCallResult, ModelGateway, ToolContext } from "@qa/types";

/**
 * @qa/gateway — provider-agnostic model gateway (Milestone 6).
 *
 * Planned: pinned model snapshots, zod-typed structured outputs, model tiering
 * (cheap model for pre-triage/summary, frontier for ambiguous heals/authoring),
 * a content-hash response cache, and trajectory recording of every call.
 * Untrusted page content always goes in `input`, never in `system` (invariant 6).
 */
export const MILESTONE = "M6" as const;

export class NotImplementedGateway implements ModelGateway {
  async call<T>(
    _req: ModelCallRequest<T>,
    _ctx: ToolContext,
  ): Promise<ModelCallResult<T>> {
    throw new Error("@qa/gateway is implemented in Milestone 6");
  }
}
