/** Mock Jenkins adapter — connect, ingest runs, webhook normalization */

export interface JenkinsConfig {
  baseUrl: string;
  jobName: string;
}

export interface NormalizedJenkinsWebhook {
  buildNumber: string;
  status: string;
  jobName: string;
}

export async function mockVerifyJenkinsConnection(_config: JenkinsConfig): Promise<boolean> {
  return true;
}

export function normalizeJenkinsWebhookPayload(raw: unknown): NormalizedJenkinsWebhook {
  const o = raw as Record<string, unknown>;
  const build = o.build as Record<string, unknown> | undefined;
  const job = o.job as Record<string, unknown> | undefined;
  return {
    buildNumber: String(o.number ?? build?.number ?? "1"),
    status: String(o.status ?? o.result ?? "SUCCESS"),
    jobName: String(o.name ?? job?.name ?? "mock-job"),
  };
}
