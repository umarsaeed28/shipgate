import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { CompleteRequest, LlmProvider } from "../types";
import {
  resolveBedrockEndpoint,
  resolveBedrockModelId,
  resolveRegion,
} from "../model";

/**
 * Claude through Amazon Bedrock. This is the deployed path.
 *
 * Authentication uses the standard AWS credential chain (an IAM role in
 * deployment, a local profile in development). There is NO model provider API
 * key here or in env for the deployed path — see qa-platform.mdc.
 *
 * Region (AWS_REGION), model id (BEDROCK_MODEL_ID), and the optional VPC
 * endpoint (BEDROCK_VPC_ENDPOINT) are all read from config; nothing is
 * hardcoded. Verify the current Claude model ids and region availability
 * against the live AWS Bedrock docs before pinning (see docs/bedrock.md).
 */
export class BedrockProvider implements LlmProvider {
  readonly name = "bedrock";
  private client: BedrockRuntimeClient;

  constructor() {
    const region = resolveRegion();
    const endpoint = resolveBedrockEndpoint();
    // No credentials are passed: the SDK resolves them from the AWS credential
    // chain (IAM role in deployment, local profile in development).
    this.client = new BedrockRuntimeClient({
      ...(region ? { region } : {}),
      // When set, route through the VPC endpoint so traffic stays off the
      // public internet; otherwise the SDK uses the default regional endpoint.
      ...(endpoint ? { endpoint } : {}),
    });
  }

  async complete(req: CompleteRequest): Promise<string> {
    const modelId = resolveBedrockModelId();
    if (!modelId) {
      throw new Error(
        "BEDROCK_MODEL_ID is not set. Set it to a current Claude model or " +
          "inference profile id (verify in the AWS Bedrock console).",
      );
    }

    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: req.maxTokens ?? 2048,
      ...(req.system ? { system: req.system } : {}),
      messages: [{ role: "user", content: req.user }],
    });

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body,
    });

    const response = await this.client.send(command);

    // The AWS request id is recorded in CloudTrail for this InvokeModel call.
    // Report it alongside our correlation id so Event records can be matched to
    // the exact CloudTrail entry.
    const requestId = response.$metadata?.requestId;
    if (req.correlationId || requestId) {
      // eslint-disable-next-line no-console
      console.log(
        `[bedrock] correlationId=${req.correlationId ?? "-"} requestId=${requestId ?? "-"} model=${modelId}`,
      );
    }
    req.onMeta?.({
      provider: this.name,
      correlationId: req.correlationId,
      requestId,
    });

    const decoded = JSON.parse(new TextDecoder().decode(response.body)) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    return (decoded.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n");
  }
}
