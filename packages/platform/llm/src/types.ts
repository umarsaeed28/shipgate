export interface CompleteRequest {
  system?: string;
  user: string;
  maxTokens?: number;
  /** Identifies the versioned prompt template; used by the mock provider. */
  promptId?: string;
  /** Structured input the prompt was built from; used by the mock provider. */
  input?: unknown;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: CompleteRequest): Promise<string>;
}
