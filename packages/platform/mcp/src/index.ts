import type { AtlassianClient, AtlassianCredentials } from "./types";
import { RestAtlassianClient } from "./rest";
import { MockAtlassianClient } from "./mock";

export * from "./types";
export { RestAtlassianClient } from "./rest";
export { MockAtlassianClient } from "./mock";

/** The Atlassian remote MCP endpoint (used by the in-app OAuth 2.1 flow). */
export const ATLASSIAN_MCP_URL =
  process.env.ATLASSIAN_MCP_URL ?? "https://mcp.atlassian.com/v1/mcp";

/**
 * Build an Atlassian client. With headless credentials it talks to Jira/
 * Confluence directly; otherwise it returns deterministic mock data so the
 * agent pipeline is runnable locally.
 */
export function createAtlassianClient(
  creds?: AtlassianCredentials | null,
): AtlassianClient {
  if (creds?.siteUrl && creds.email && creds.token) {
    return new RestAtlassianClient(creds);
  }
  return new MockAtlassianClient();
}
