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
