import Anthropic from "@anthropic-ai/sdk";
import type { CompleteRequest, LlmProvider } from "../types";
import { resolveModel } from "../model";

/** Real Claude provider. ALL production Claude calls flow through here. */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async complete(req: CompleteRequest): Promise<string> {
    const msg = await this.client.messages.create({
      model: resolveModel(),
      max_tokens: req.maxTokens ?? 2048,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });

    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
}
