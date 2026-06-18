import { NextResponse } from "next/server";
import { requireRole, ForbiddenError, UnauthorizedError } from "@qa/auth";
import { getSession } from "../../../lib/session";
import { getAgentConfig, setAgentConfig } from "../../../lib/agent-config";
import { DEMO_MODE, DEMO_MESSAGE } from "../../../lib/demo";

/**
 * Server-side enforcement: only admins may read-write agent config mutations.
 * A client (or anyone) hand-crafting this POST gets 403 — the guard does not
 * depend on the UI hiding a button.
 */
export async function POST(req: Request) {
  if (DEMO_MODE) {
    return NextResponse.json({ error: DEMO_MESSAGE }, { status: 403 });
  }
  const session = await getSession();
  try {
    requireRole(session, { capability: "editAgentConfig" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const patch = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const next = await setAgentConfig(patch, session.email);
  return NextResponse.json({ ok: true, config: next });
}

export async function GET() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewAgentConfig" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
  return NextResponse.json({ config: await getAgentConfig() });
}
