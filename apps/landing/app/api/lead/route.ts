import { NextResponse } from "next/server";
import { prisma } from "@qa/store";

/** Capture a lead from the landing page. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    company?: string;
    message?: string;
  };

  const email = (body.email ?? "").trim();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      email,
      company: body.company?.trim() || null,
      message: body.message?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
