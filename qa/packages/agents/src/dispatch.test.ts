import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Tool, ToolContext } from "@qa/types";
import { createToolDispatcher } from "./dispatch.js";

const ctx: ToolContext = { trajectoryId: "traj-1" };

function makeClickTool(execute = vi.fn(async () => ({ clicked: true }))): Tool<
  { selector: string },
  { clicked: boolean }
> {
  return {
    name: "browser_click",
    destructive: false,
    inputSchema: z.object({ selector: z.string() }),
    outputSchema: z.object({ clicked: z.boolean() }),
    execute,
  };
}

describe("invariant 6: an agent cannot invoke a tool outside its allowlist", () => {
  it("rejects a tool not in the allowlist even if it is registered", async () => {
    const click = makeClickTool();
    const tools = new Map<string, Tool>([[click.name, click as Tool]]);
    // Agent's allowlist deliberately EXCLUDES the registered click tool.
    const dispatcher = createToolDispatcher(["browser_snapshot"], tools);

    const result = await dispatcher.invoke("browser_click", { selector: "#x" }, ctx);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.reason).toBe("tool-not-in-allowlist");
    expect(click.execute).not.toHaveBeenCalled();
  });

  it("rejects an allowed-but-unregistered tool", async () => {
    const dispatcher = createToolDispatcher(["browser_click"], new Map());
    const result = await dispatcher.invoke("browser_click", { selector: "#x" }, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.reason).toBe("tool-not-registered");
  });

  it("invokes a tool that is both allowed and registered, validating I/O", async () => {
    const click = makeClickTool();
    const tools = new Map<string, Tool>([[click.name, click as Tool]]);
    const dispatcher = createToolDispatcher(["browser_click"], tools);

    const result = await dispatcher.invoke("browser_click", { selector: "#x" }, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ clicked: true });
    expect(click.execute).toHaveBeenCalledWith({ selector: "#x" }, ctx);
  });

  it("rejects input that fails the tool's schema", async () => {
    const click = makeClickTool();
    const tools = new Map<string, Tool>([[click.name, click as Tool]]);
    const dispatcher = createToolDispatcher(["browser_click"], tools);

    const result = await dispatcher.invoke("browser_click", { selector: 123 }, ctx);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.reason).toBe("input-validation-failed");
  });
});
