import type { z } from "zod";
import type { CompleteRequest, LlmProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { BedrockProvider } from "./providers/bedrock";
import { MockProvider } from "./providers/mock";
import { hasRealKey, resolveModel, resolveProvider, resolveRegion } from "./model";

/**
 * Select the provider from LLM_PROVIDER. Both real providers expose the same
 * complete()/completeStructured() surface, so no agent code changes.
 *
 * - "bedrock" (default for deployment): Claude via Amazon Bedrock, IAM auth, no
 *   model provider API key. If AWS_REGION is not configured (e.g. an offline
 *   local demo), fall back to the deterministic mock so the pipeline stays
 *   runnable; in deployment the region is always set.
 * - "anthropic" (local development): direct API when a real key is present,
 *   otherwise the deterministic mock.
 */
function pickProvider(): LlmProvider {
  if (resolveProvider() === "bedrock") {
    if (!resolveRegion()) {
      console.warn(
        "[llm] LLM_PROVIDER=bedrock but AWS_REGION is unset; using mock provider. " +
          "Set AWS_REGION and BEDROCK_MODEL_ID for real Bedrock inference.",
      );
      return new MockProvider();
    }
    return new BedrockProvider();
  }
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
