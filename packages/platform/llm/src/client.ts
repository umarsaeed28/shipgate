import type { z } from "zod";
import type { CompleteRequest, LlmProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { MockProvider } from "./providers/mock";
import { hasRealKey, resolveModel } from "./model";

function pickProvider(): LlmProvider {
  return hasRealKey() ? new AnthropicProvider() : new MockProvider();
}

/** Extract the first JSON value from a model response (handles code fences). */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model output");
  // Walk to the matching closing bracket.
  const open = cleaned[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === open) depth++;
    else if (cleaned[i] === close) {
      depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }
  }
  throw new Error("Unbalanced JSON in model output");
}

export class Llm {
  private provider: LlmProvider;

  constructor(provider?: LlmProvider) {
    this.provider = provider ?? pickProvider();
  }

  get providerName(): string {
    return this.provider.name;
  }

  get model(): string {
    return resolveModel();
  }

  async complete(req: CompleteRequest): Promise<string> {
    return this.provider.complete(req);
  }

  /**
   * Complete and validate against a Zod schema, retrying with corrective
   * feedback on invalid output (reject + retry per qa-platform.mdc).
   */
  async completeStructured<T>(
    schema: z.ZodType<T>,
    req: CompleteRequest & { retries?: number },
  ): Promise<T> {
    const retries = req.retries ?? 2;
    let lastErr = "";
    let user = req.user;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const raw = await this.provider.complete({ ...req, user });
      try {
        const parsed = schema.parse(extractJson(raw));
        return parsed;
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
        user = `${req.user}\n\nYour previous response was invalid: ${lastErr}\nReturn ONLY valid JSON that matches the required shape.`;
      }
    }

    throw new Error(
      `LLM structured output failed schema validation after ${retries + 1} attempts: ${lastErr}`,
    );
  }
}

/** Shared instance. Provider is chosen from env at construction. */
export const llm = new Llm();
