/**
 * Per-instance client configuration.
 *
 * One deployed instance serves exactly one client (tenant isolation by
 * construction). Everything here is derived from environment variables set at
 * deploy time. Never write a query that spans clients.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface ClientConfig {
  /** The client this instance is dedicated to, e.g. "acme". */
  slug: string;
  /** Base path the app is served from, e.g. "/app-acme". */
  basePath: string;
  /** Anthropic model id — configurable, never hardcoded in agent logic. */
  anthropicModel: string;
  /** Atlassian remote MCP endpoint. */
  atlassianMcpUrl: string;
}

export const clientConfig: ClientConfig = {
  slug: required("CLIENT_SLUG"),
  basePath: process.env.APP_BASE_PATH ?? `/app-${process.env.CLIENT_SLUG ?? ""}`,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  atlassianMcpUrl:
    process.env.ATLASSIAN_MCP_URL ?? "https://mcp.atlassian.com/v1/mcp",
};

export const CLIENT_SLUG = clientConfig.slug;

/**
 * Model provider + AWS security configuration.
 *
 * The provider is swappable: "bedrock" (default, deployment) runs Claude through
 * Amazon Bedrock with the AWS credential chain (an IAM role in deployment); no
 * model provider API key is used on the deployed path. "anthropic" calls the
 * direct API and is intended for local development only.
 *
 * Nothing here is hardcoded in agent logic. Region, model id, the optional VPC
 * endpoint, and the KMS key are all read from the environment so they can be
 * verified against the live AWS Bedrock and Anthropic docs before pinning. See
 * docs/bedrock.md.
 */
export type LlmProviderName = "bedrock" | "anthropic";

export interface PlatformConfig {
  /** Selected model provider. Defaults to "bedrock" for deployment. */
  provider: LlmProviderName;
  /** AWS region for Bedrock (and other AWS calls), e.g. "us-east-1". */
  awsRegion?: string;
  /**
   * Bedrock model or inference profile id, e.g. "anthropic.claude-sonnet-4-6"
   * or a cross-region profile like "us.anthropic.claude-sonnet-4-6". Verify the
   * current value in the AWS Bedrock console before pinning; ids change.
   */
  bedrockModelId?: string;
  /**
   * Optional VPC endpoint so Bedrock traffic stays off the public internet.
   * When unset, the AWS SDK uses the default regional endpoint.
   */
  bedrockVpcEndpoint?: string;
  /**
   * Customer managed AWS KMS key id/ARN used to encrypt the database and any
   * artifact storage at rest. Provisioned in infrastructure; surfaced here so
   * the chosen key is documented and discoverable in config.
   */
  kmsKeyId?: string;
  /** Direct Anthropic API model id (local development path only). */
  anthropicModel: string;
}

export const platformConfig: PlatformConfig = {
  provider: (process.env.LLM_PROVIDER as LlmProviderName) || "bedrock",
  awsRegion: process.env.AWS_REGION || undefined,
  bedrockModelId: process.env.BEDROCK_MODEL_ID || undefined,
  bedrockVpcEndpoint: process.env.BEDROCK_VPC_ENDPOINT || undefined,
  kmsKeyId: process.env.KMS_KEY_ID || undefined,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
};
