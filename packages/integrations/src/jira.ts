/** Mock Jira adapter — connect, import stories, webhook normalization */

export interface JiraConfig {
  baseUrl: string;
  projectKey: string;
}

export interface NormalizedJiraWebhook {
  issueKey: string;
  eventType: string;
  summary?: string;
}

export async function mockVerifyJiraConnection(_config: JiraConfig): Promise<boolean> {
  return true;
}

export function normalizeJiraWebhookPayload(raw: unknown): NormalizedJiraWebhook {
  const o = raw as Record<string, unknown>;
  return {
    issueKey: String(o.issueKey ?? o.key ?? "MOCK-1"),
    eventType: String(o.webhookEvent ?? "jira:issue_updated"),
    summary: o.summary ? String(o.summary) : undefined,
  };
}
