/**
 * Option A: In-process MCP-shaped browser tools for {@link @shipgate/agents#McpBrowser}.
 * Same tool names as the Cursor Playwright MCP server; runs against a real Playwright Page.
 */
import type { Page } from "playwright";

export type McpCallFn = (
  server: string,
  tool: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

const KNOWN_SERVERS = new Set(["cursor-ide-browser", "playwright"]);

async function tagInteractiveNodes(page: Page): Promise<void> {
  await page.evaluate(() => {
    let n = 0;
    const sel =
      'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="textbox"]';
    document.querySelectorAll(sel).forEach((el: Element) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.closest("[data-pw-mcp-ref]")) return;
      n += 1;
      el.setAttribute("data-pw-mcp-ref", `e${n}`);
    });
  });
}

function buildAccessibilityLines(page: Page): Promise<string> {
  return page.$$eval("[data-pw-mcp-ref]", (nodes) => {
    const lines: string[] = [];
    for (const el of nodes) {
      const ref = el.getAttribute("data-pw-mcp-ref") ?? "";
      const tag = el.tagName.toLowerCase();
      let role = tag;
      if (tag === "a") role = "link";
      if (tag === "input") role = (el as HTMLInputElement).type || "textbox";
      const name =
        (el as HTMLInputElement).ariaLabel ||
        (el as HTMLInputElement).placeholder ||
        (el as HTMLInputElement).name ||
        el.textContent?.trim()?.slice(0, 120) ||
        tag;
      const safeName = String(name).replace(/"/g, "'");
      let line = `[ref=${ref}] ${role} "${safeName}"`;
      if (tag === "input" || tag === "textarea") {
        const v = (el as HTMLInputElement).value;
        if (v) line += ` value="${v.slice(0, 80)}"`;
      }
      lines.push(line);
    }
    return lines.join("\n");
  });
}

export function createPlaywrightMcpCallFn(page: Page): McpCallFn {
  return async (server, tool, args) => {
    if (!KNOWN_SERVERS.has(server)) {
      return { error: `Unsupported MCP server: ${server}` };
    }

    switch (tool) {
      case "browser_navigate": {
        const url = String(args.url ?? "");
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        return { url: page.url(), title: await page.title() };
      }
      case "browser_snapshot": {
        await tagInteractiveNodes(page);
        const url = page.url();
        const title = await page.title();
        const lines = await buildAccessibilityLines(page);
        const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 14_000) ?? "");
        return {
          url,
          title,
          tree: `${lines}\n\n--- page text ---\n${bodyText}`,
        };
      }
      case "browser_click": {
        const ref = String(args.ref ?? "");
        const loc = page.locator(`[data-pw-mcp-ref="${ref}"]`);
        await loc.click({ timeout: 15_000 });
        return { ok: true };
      }
      case "browser_fill": {
        const ref = String(args.ref ?? "");
        const value = String(args.value ?? "");
        await page.locator(`[data-pw-mcp-ref="${ref}"]`).fill(value, { timeout: 15_000 });
        return { ok: true };
      }
      case "browser_select_option": {
        const ref = String(args.ref ?? "");
        const values = (args.values as string[]) ?? [];
        await page.locator(`[data-pw-mcp-ref="${ref}"]`).selectOption(values, { timeout: 15_000 });
        return { ok: true };
      }
      case "browser_take_screenshot": {
        const filename = String(args.filename ?? "shot.png");
        const buf = await page.screenshot({ fullPage: true });
        return { filename, base64: buf.toString("base64") };
      }
      case "browser_wait_for": {
        if (args.text != null) {
          const text = String(args.text);
          const timeout = Number(args.timeout ?? 10_000);
          await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout });
          return { ok: true };
        }
        const seconds = Number(args.time ?? 1);
        await page.waitForTimeout(Math.min(60, Math.max(0, seconds)) * 1000);
        return { ok: true };
      }
      case "browser_press_key": {
        const key = String(args.key ?? "Enter");
        await page.keyboard.press(key);
        return { ok: true };
      }
      default:
        return { error: `Unknown tool: ${tool}` };
    }
  };
}
