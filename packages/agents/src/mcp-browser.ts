/**
 * MCP Browser Client — abstraction over the Playwright MCP server tools.
 *
 * This module provides a typed interface for calling the cursor-ide-browser MCP
 * tools. In production the callMcp function is injected by the orchestrator
 * (worker or API), allowing the agents to remain transport-agnostic.
 */

export type McpCallFn = (
  server: string,
  tool: string,
  args: Record<string, unknown>
) => Promise<unknown>;

export interface PageSnapshot {
  url: string;
  title: string;
  tree: string;
  interactive: InteractiveElement[];
}

export interface InteractiveElement {
  ref: string;
  role: string;
  name: string;
  type?: string;
  value?: string;
  options?: string[];
}

export interface ScreenshotResult {
  filename: string;
}

const MCP_SERVER = "cursor-ide-browser";

export class McpBrowser {
  constructor(private callMcp: McpCallFn) {}

  async navigate(url: string): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_navigate", { url });
  }

  async snapshot(opts?: {
    interactive?: boolean;
    selector?: string;
  }): Promise<PageSnapshot> {
    const raw = (await this.callMcp(MCP_SERVER, "browser_snapshot", {
      interactive: opts?.interactive ?? false,
      compact: true,
      ...( opts?.selector ? { selector: opts.selector } : {}),
    })) as any;

    const elements = this.parseInteractiveElements(raw);
    return {
      url: raw?.url ?? "",
      title: raw?.title ?? "",
      tree: typeof raw === "string" ? raw : JSON.stringify(raw, null, 2),
      interactive: elements,
    };
  }

  async interactiveSnapshot(): Promise<PageSnapshot> {
    return this.snapshot({ interactive: true });
  }

  async screenshot(filename?: string): Promise<ScreenshotResult> {
    const result = (await this.callMcp(MCP_SERVER, "browser_take_screenshot", {
      fullPage: true,
      ...(filename ? { filename } : {}),
    })) as any;
    return { filename: result?.filename ?? filename ?? "screenshot.png" };
  }

  async click(element: string, ref: string): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_click", { element, ref });
  }

  async fill(element: string, ref: string, value: string): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_fill", { element, ref, value });
  }

  async selectOption(
    element: string,
    ref: string,
    values: string[]
  ): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_select_option", {
      element,
      ref,
      values,
    });
  }

  async waitForText(text: string, timeoutMs = 10000): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_wait_for", {
      text,
      timeout: timeoutMs,
    });
  }

  async wait(seconds: number): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_wait_for", { time: seconds });
  }

  async pressKey(key: string): Promise<void> {
    await this.callMcp(MCP_SERVER, "browser_press_key", { key });
  }

  /**
   * High-level: navigate to a URL and return the interactive snapshot,
   * giving us both the page content and a list of actionable elements.
   */
  async explore(url: string): Promise<PageSnapshot> {
    await this.navigate(url);
    await this.wait(1);
    return this.interactiveSnapshot();
  }

  private parseInteractiveElements(raw: unknown): InteractiveElement[] {
    if (!raw || typeof raw !== "object") return [];

    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const elements: InteractiveElement[] = [];

    const refPattern = /\[ref=([\w-]+)\]\s*(\w+)\s+"([^"]*)"/g;
    let match: RegExpExecArray | null;
    while ((match = refPattern.exec(text)) !== null) {
      elements.push({
        ref: match[1],
        role: match[2],
        name: match[3],
      });
    }

    return elements;
  }
}
