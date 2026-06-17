import type { IngestInput } from "./ingest";

/**
 * Jenkins ingestion entry points (Agent 2 scaffold).
 *
 * Primary path: a Jenkins post-build step POSTs to /api/jenkins/webhook with the
 * build URL (and optionally the JUnit XML inline). The webhook enqueues an
 * ingest job for the worker.
 *
 * Fallback path: pollJenkins() pulls the latest build's JUnit report + console
 * log when no webhook is configured. We fetch references (URLs) and the JUnit
 * body; large logs/screenshots are referenced by URL, not stored.
 */
export interface JenkinsWebhookPayload {
  buildUrl: string;
  commitSha?: string;
  trigger?: string;
  /** Optional inline JUnit XML; if absent, the worker polls buildUrl. */
  junitXml?: string;
}

export async function fetchJUnitFromBuild(
  buildUrl: string,
): Promise<{ junitXml: string; consoleLogUrl: string }> {
  const base = buildUrl.replace(/\/$/, "");
  // Jenkins exposes JUnit results as XML via the test report API.
  const res = await fetch(`${base}/testReport/api/xml`);
  if (!res.ok) {
    throw new Error(`Jenkins testReport ${res.status} for ${buildUrl}`);
  }
  return { junitXml: await res.text(), consoleLogUrl: `${base}/consoleText` };
}

/** Polling fallback: returns an IngestInput ready for ingestJUnit(). */
export async function pollJenkins(
  buildUrl: string,
  opts: { commitSha?: string; trigger?: string } = {},
): Promise<IngestInput> {
  const { junitXml, consoleLogUrl } = await fetchJUnitFromBuild(buildUrl);
  return {
    junitXml,
    consoleLogUrl,
    commitSha: opts.commitSha,
    trigger: opts.trigger ?? "jenkins-poll",
  };
}
