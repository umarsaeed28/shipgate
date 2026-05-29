import { type Result, type Tool, type ToolContext, err, ok } from "@qa/types";

/**
 * Tool dispatch with allowlist enforcement (invariant 6 / agent pattern).
 *
 * An agent cannot call a tool that is not in its allowlist — the allowlist is
 * checked BEFORE the tool registry, so even a globally-registered tool is
 * unreachable unless the agent explicitly allows it. Input and output are
 * zod-validated; unvalidated tool I/O never flows through.
 */

export type DispatchError =
  | { reason: "tool-not-in-allowlist"; tool: string }
  | { reason: "tool-not-registered"; tool: string }
  | { reason: "input-validation-failed"; tool: string; detail: string }
  | { reason: "output-validation-failed"; tool: string; detail: string };

export interface ToolDispatcher {
  invoke(
    tool: string,
    input: unknown,
    ctx: ToolContext,
  ): Promise<Result<unknown, DispatchError>>;
}

export function createToolDispatcher(
  allowlist: readonly string[],
  tools: ReadonlyMap<string, Tool>,
): ToolDispatcher {
  const allow = new Set(allowlist);

  return {
    async invoke(toolName, input, ctx) {
      if (!allow.has(toolName)) {
        return err({ reason: "tool-not-in-allowlist", tool: toolName });
      }
      const tool = tools.get(toolName);
      if (tool === undefined) {
        return err({ reason: "tool-not-registered", tool: toolName });
      }

      const parsedInput = tool.inputSchema.safeParse(input);
      if (!parsedInput.success) {
        return err({
          reason: "input-validation-failed",
          tool: toolName,
          detail: parsedInput.error.message,
        });
      }

      const rawOutput = await tool.execute(parsedInput.data, ctx);

      const parsedOutput = tool.outputSchema.safeParse(rawOutput);
      if (!parsedOutput.success) {
        return err({
          reason: "output-validation-failed",
          tool: toolName,
          detail: parsedOutput.error.message,
        });
      }

      return ok(parsedOutput.data);
    },
  };
}
