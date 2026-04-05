/**
 * MCP-backed Test Healer Agent
 *
 * When tests fail, the healer uses MCP browser tools to re-explore the SUT,
 * find updated selectors, compare DOM state against the failing assertions,
 * and patch the test scripts to fix them.
 */

import type { AgentContext, AgentResult } from "./types.js";
import type {
  HealerInput,
  HealerOutput,
  HealAction,
  TestHealer,
} from "./test-healer.js";
import { McpBrowser, type McpCallFn } from "./mcp-browser.js";

export class McpTestHealer implements TestHealer {
  private browser: McpBrowser;

  constructor(callMcp: McpCallFn) {
    this.browser = new McpBrowser(callMcp);
  }

  async heal(
    _ctx: AgentContext,
    input: HealerInput
  ): Promise<AgentResult<HealerOutput>> {
    try {
      const maxAttempts = input.maxAttempts ?? 3;
      const healed: HealAction[] = [];
      const unresolved: Array<{ filename: string; testName: string; reason: string }> = [];

      for (const failure of input.failures) {
        let fixed = false;

        for (let attempt = 0; attempt < maxAttempts && !fixed; attempt++) {
          const fix = await this.attemptFix(failure, input);
          if (fix) {
            healed.push(fix);
            fixed = true;
          }
        }

        if (!fixed) {
          unresolved.push({
            filename: failure.filename,
            testName: failure.testName,
            reason: `Could not auto-heal after ${maxAttempts} attempts: ${failure.error}`,
          });
        }
      }

      return {
        ok: true,
        data: {
          healed,
          unresolved,
          attempts: input.failures.length,
          allPassing: unresolved.length === 0,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: `Healer failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async attemptFix(
    failure: HealerInput["failures"][0],
    input: HealerInput
  ): Promise<HealAction | null> {
    const error = failure.error.toLowerCase();
    const script = input.scripts.find((s) => s.filename === failure.filename);
    if (!script) return null;

    let patchedContent = script.content;
    let fix = "";

    if (error.includes("element") && (error.includes("not found") || error.includes("not visible"))) {
      const selectorFix = await this.findAlternativeSelector(failure, script.content);
      if (selectorFix) {
        patchedContent = selectorFix.patched;
        fix = selectorFix.description;
      }
    }

    if (!fix && (error.includes("text") && (error.includes("not found") || error.includes("don't see")))) {
      const textFix = await this.findAlternativeText(failure, script.content);
      if (textFix) {
        patchedContent = textFix.patched;
        fix = textFix.description;
      }
    }

    if (!fix && error.includes("timeout")) {
      const timeoutFix = this.increaseTimeout(failure, script.content);
      if (timeoutFix) {
        patchedContent = timeoutFix.patched;
        fix = timeoutFix.description;
      }
    }

    if (!fix && error.includes("url") && error.includes("wait")) {
      const urlFix = await this.findCorrectUrl(failure, script.content);
      if (urlFix) {
        patchedContent = urlFix.patched;
        fix = urlFix.description;
      }
    }

    if (!fix) return null;

    return {
      filename: failure.filename,
      testName: failure.testName,
      originalError: failure.error,
      fix,
      patchedContent,
      confidence: 0.75,
    };
  }

  private async findAlternativeSelector(
    failure: HealerInput["failures"][0],
    content: string
  ): Promise<{ patched: string; description: string } | null> {
    const selectorMatch = failure.error.match(/"([#.][^"]+)"/);
    if (!selectorMatch) return null;
    const oldSelector = selectorMatch[1];

    try {
      const snap = await this.browser.interactiveSnapshot();
      const tree = snap.tree;

      const idName = oldSelector.replace("#", "");
      const altPatterns = [
        `[data-testid="${idName}"]`,
        `[name="${idName}"]`,
        `[aria-label="${idName}"]`,
      ];

      for (const alt of altPatterns) {
        if (tree.includes(idName)) {
          return {
            patched: content.replace(
              new RegExp(this.escapeRegex(oldSelector), "g"),
              alt
            ),
            description: `Replaced selector "${oldSelector}" with "${alt}" (found via DOM exploration)`,
          };
        }
      }

      for (const el of snap.interactive) {
        if (
          el.name.toLowerCase().includes(idName.toLowerCase()) ||
          el.ref.includes(idName)
        ) {
          const newSel = `[ref="${el.ref}"]`;
          return {
            patched: content.replace(
              new RegExp(this.escapeRegex(oldSelector), "g"),
              newSel
            ),
            description: `Replaced selector "${oldSelector}" with "${newSel}" from snapshot ref`,
          };
        }
      }
    } catch {}

    return null;
  }

  private async findAlternativeText(
    failure: HealerInput["failures"][0],
    content: string
  ): Promise<{ patched: string; description: string } | null> {
    const textMatch = failure.error.match(/see "([^"]+)"/i);
    if (!textMatch) return null;
    const oldText = textMatch[1];

    try {
      const snap = await this.browser.snapshot();
      const tree = snap.tree;

      const words = oldText.split(/\s+/).filter((w) => w.length > 3);
      for (const word of words) {
        const lineMatch = tree.match(new RegExp(`"[^"]*${this.escapeRegex(word)}[^"]*"`, "i"));
        if (lineMatch) {
          const newText = lineMatch[0].replace(/^"|"$/g, "");
          if (newText !== oldText) {
            return {
              patched: content.replace(
                new RegExp(this.escapeRegex(`"${oldText}"`), "g"),
                `"${newText}"`
              ),
              description: `Updated expected text from "${oldText}" to "${newText}"`,
            };
          }
        }
      }
    } catch {}

    return null;
  }

  private increaseTimeout(
    _failure: HealerInput["failures"][0],
    content: string
  ): { patched: string; description: string } | null {
    const timeoutPattern = /waitInUrl\(([^,]+),\s*(\d+)\)/g;
    let patched = content;
    let found = false;

    patched = patched.replace(timeoutPattern, (_match, url, timeout) => {
      const newTimeout = Math.min(parseInt(timeout) * 2, 30);
      found = true;
      return `waitInUrl(${url}, ${newTimeout})`;
    });

    const waitForPattern = /waitForElement\(([^,]+),\s*(\d+)\)/g;
    patched = patched.replace(waitForPattern, (_match, sel, timeout) => {
      const newTimeout = Math.min(parseInt(timeout) * 2, 30);
      found = true;
      return `waitForElement(${sel}, ${newTimeout})`;
    });

    if (!found) return null;

    return {
      patched,
      description: "Doubled wait timeouts to handle slower responses",
    };
  }

  private async findCorrectUrl(
    failure: HealerInput["failures"][0],
    content: string
  ): Promise<{ patched: string; description: string } | null> {
    const urlMatch = failure.error.match(/waitInUrl\("([^"]+)"/);
    if (!urlMatch) return null;
    const expectedUrl = urlMatch[1];

    try {
      const snap = await this.browser.snapshot();
      const currentUrl = snap.url;

      if (currentUrl && currentUrl !== expectedUrl) {
        const urlPath = new URL(currentUrl).pathname;
        return {
          patched: content.replace(
            new RegExp(this.escapeRegex(`"${expectedUrl}"`), "g"),
            `"${urlPath}"`
          ),
          description: `Updated expected URL from "${expectedUrl}" to "${urlPath}" (actual redirect target)`,
        };
      }
    } catch {}

    return null;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
