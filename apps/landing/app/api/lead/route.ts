import { NextResponse } from "next/server";
import { prisma } from "@qa/store";
import { sanitizeAnswers, deriveReadiness, answeredCount } from "../../onboarding";

/** Capture a qualified lead from the landing page questionnaire. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    company?: string;
    message?: string;
    answers?: unknown;
  };

  const email = (body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const answers = sanitizeAnswers(body.answers);
  const hasAnswers = answeredCount(answers) > 0;
  const readiness = hasAnswers ? deriveReadiness(answers) : null;

  const lead = await prisma.lead.create({
    data: {
      email,
      company: body.company?.trim() || null,
      message: body.message?.trim() || null,
      answers: hasAnswers ? (answers as never) : undefined,
      readiness: readiness ? (readiness as never) : undefined,
    },
  });

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
