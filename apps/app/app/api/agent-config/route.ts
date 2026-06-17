import { NextResponse } from "next/server";
import { requireRole, ForbiddenError, UnauthorizedError } from "@qa/auth";
import { getSession } from "../../../lib/session";

/**
 * Demonstrates server-side enforcement: only admins may mutate agent config.
 * A client (or anyone) hand-crafting this request gets 403 — the guard does not
 * depend on the UI hiding a button. The real persistence lands in Step 2.
 */
export async function POST() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "editAgentConfig" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, note: "Agent config mutation accepted (stub)." });
}
