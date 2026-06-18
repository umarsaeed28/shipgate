"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError, UnauthorizedError } from "@qa/auth";
import { recordEvent, prisma } from "@qa/store";
import { enqueue } from "@qa/queue";
import { getSession } from "../../lib/session";
import { DEMO_MODE, DEMO_MESSAGE } from "../../lib/demo";

export interface ActionResult {
  ok: boolean;
  message: string;
}

async function ensureReviewer(): Promise<ActionResult | null> {
  const session = await getSession();
  try {
    requireRole(session, { capability: "reviewScenarios" });
    return null;
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return { ok: false, message: err.message };
    }
    throw err;
  }
}

export async function requestScenarios(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (DEMO_MODE) return { ok: false, message: DEMO_MESSAGE };
  const denied = await ensureReviewer();
  if (denied) return denied;

  const storyKey = String(formData.get("storyKey") ?? "").trim();
  if (!storyKey) return { ok: false, message: "Story key is required." };
  const prRaw = String(formData.get("prId") ?? "").trim();
  const maxRaw = String(formData.get("maxScenarios") ?? "").trim();

  const job = await enqueue("draft_scenarios", {
    storyKey,
    ...(prRaw ? { prId: Number(prRaw) } : {}),
    ...(maxRaw ? { maxScenarios: Number(maxRaw) } : {}),
  });
  await recordEvent({
    type: "draft_requested",
    entityRef: storyKey,
    payload: { jobId: job.id, prId: prRaw || null },
  });

  revalidatePath("/review");
  return {
    ok: true,
    message: `Queued scenario drafting for ${storyKey}. Refresh in a moment.`,
  };
}

export async function decideScenario(formData: FormData): Promise<void> {
  if (DEMO_MODE) return;
  const session = await getSession();
  requireRole(session, { capability: "reviewScenarios" });

  const id = String(formData.get("scenarioId"));
  const decision = String(formData.get("decision")); // keep | automate | discard

  if (decision === "discard") {
    await prisma.scenario.update({
      where: { id },
      data: {
        status: "discarded",
        decisionBy: session.email,
        decisionReason: "Discarded in review",
        decidedAt: new Date(),
      },
    });
    await recordEvent({
      type: "scenario_decided",
      entityRef: id,
      payload: { decision: "discarded", by: session.email },
    });
  } else {
    // keep or automate -> mark kept + record decision
    await prisma.scenario.update({
      where: { id },
      data: {
        status: "kept",
        decisionBy: session.email,
        decisionReason: decision === "automate" ? "Approved for automation" : "Kept",
        decidedAt: new Date(),
      },
    });
    await recordEvent({
      type: "scenario_decided",
      entityRef: id,
      payload: { decision, by: session.email },
    });

    if (decision === "automate") {
      const job = await enqueue("generate_test", { scenarioId: id });
      await recordEvent({
        type: "automation_requested",
        entityRef: id,
        payload: { jobId: job.id },
      });
    }
  }

  revalidatePath("/review");
}
