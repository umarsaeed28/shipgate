import { NextResponse } from "next/server";
import { enqueue } from "@qa/queue";
import { recordEvent } from "@qa/store";

/**
 * Agent 2 ingestion entry point (webhook). A Jenkins post-build step POSTs the
 * build URL (and optionally inline JUnit XML). We enqueue an ingest job for the
 * worker; the route stays light and does not block the CI callback.
 *
 * Unauthenticated by design for CI callers — secure in production with a shared
 * secret header (left as a documented stub for the MVP).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    buildUrl?: string;
    junitXml?: string;
    commitSha?: string;
    trigger?: string;
    consoleLogUrl?: string;
    screenshots?: string[];
  };

  if (!body.buildUrl && !body.junitXml) {
    return NextResponse.json(
      { error: "buildUrl or junitXml is required" },
      { status: 400 },
    );
  }

  const job = await enqueue("ingest_jenkins", { ...body });
  await recordEvent({
    type: "jenkins_webhook",
    entityRef: body.buildUrl ?? "inline-junit",
    payload: { jobId: job.id, hasInlineJunit: Boolean(body.junitXml) },
  });

  return NextResponse.json({ ok: true, jobId: job.id }, { status: 202 });
}
