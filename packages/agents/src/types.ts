/** Classification output for regression analysis */
export type FailureClassification =
  | "REAL_BUG"
  | "BROKEN_TEST"
  | "ENVIRONMENT"
  | "NEEDS_REVIEW";

export interface AgentContext {
  workspaceId: string;
  traceId?: string;
}

export interface AgentResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
