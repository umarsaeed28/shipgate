/** Metadata about a single model call, used to line our Events up with AWS audit tooling. */
export interface LlmCallMeta {
  /** Which provider served the call: "bedrock" | "anthropic" | "mock". */
  provider: string;
  /** Our correlation id for the agent run, echoed back for the caller. */
  correlationId?: string;
  /**
   * The provider request id. For Bedrock this is the AWS request id recorded in
   * CloudTrail, so an Event carrying { correlationId, requestId } can be matched
   * to the exact CloudTrail entry for that InvokeModel call.
   */
  requestId?: string;
}

export interface CompleteRequest {
  system?: string;
  user: string;
  maxTokens?: number;
  /** Identifies the versioned prompt template; used by the mock provider. */
  promptId?: string;
  /** Structured input the prompt was built from; used by the mock provider. */
  input?: unknown;
  /**
   * Correlation id for the agent run. Threaded onto each model call so our
   * history-store Events line up with AWS CloudTrail entries. Optional, so
   * existing callers compile unchanged.
   */
  correlationId?: string;
  /** Optional hook invoked once per model call with provider/request metadata. */
  onMeta?: (meta: LlmCallMeta) => void;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: CompleteRequest): Promise<string>;
}
