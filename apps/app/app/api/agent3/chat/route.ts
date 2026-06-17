import { NextResponse } from "next/server";
import { requireRole, ForbiddenError, UnauthorizedError } from "@qa/auth";
import { answer } from "@qa/trend-analyzer";
import { getSession } from "../../../../lib/session";

/**
 * Agent 3 chat endpoint contract: question -> query history -> answer ONLY from
 * the returned rows. Read-only; available to anyone who can view dashboards
 * (clients included).
 */
export async function POST(req: Request) {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { question } = (await req.json().catch(() => ({}))) as {
    question?: string;
  };
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  return NextResponse.json(await answer(question));
}
