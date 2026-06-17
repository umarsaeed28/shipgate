/** Resolve the model id from env. Never hardcoded in agent logic. */
export function resolveModel(): string {
  return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
}

/** Whether a real Anthropic key is configured (vs. a local/dev placeholder). */
export function hasRealKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!key) return false;
  if (key.includes("placeholder") || key.includes("local")) return false;
  return key.startsWith("sk-ant-");
}
