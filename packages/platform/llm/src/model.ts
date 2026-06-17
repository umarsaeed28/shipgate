import { platformConfig } from "@qa/config/client";

/**
 * Resolve the active model id for display/logging. Never hardcoded in agent
 * logic: Bedrock reads BEDROCK_MODEL_ID, the direct API reads ANTHROPIC_MODEL.
 */
export function resolveModel(): string {
  if (platformConfig.provider === "bedrock") {
    return platformConfig.bedrockModelId ?? "(BEDROCK_MODEL_ID unset)";
  }
  return platformConfig.anthropicModel;
}

/** The configured provider name ("bedrock" by default for deployment). */
export function resolveProvider(): "bedrock" | "anthropic" {
  return platformConfig.provider;
}

/** AWS region for Bedrock. Comes from AWS_REGION; never hardcoded. */
export function resolveRegion(): string | undefined {
  return platformConfig.awsRegion;
}

/** Bedrock model or inference profile id, from BEDROCK_MODEL_ID. */
export function resolveBedrockModelId(): string | undefined {
  return platformConfig.bedrockModelId;
}

/**
 * Optional Bedrock VPC endpoint (BEDROCK_VPC_ENDPOINT). When set, calls route
 * through it so traffic stays off the public internet; when unset, the SDK uses
 * the default regional endpoint.
 */
export function resolveBedrockEndpoint(): string | undefined {
  return platformConfig.bedrockVpcEndpoint;
}

/** Whether a real Anthropic key is configured (vs. a local/dev placeholder). */
export function hasRealKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  if (!key) return false;
  if (key.includes("placeholder") || key.includes("local")) return false;
  return key.startsWith("sk-ant-");
}
