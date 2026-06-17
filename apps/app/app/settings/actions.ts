"use server";

import { revalidatePath } from "next/cache";
import { requireRole, ForbiddenError, UnauthorizedError } from "@qa/auth";
import type { ConnectionType } from "@qa/store";
import { getSession } from "../../lib/session";
import {
  setStagingUrl,
  upsertConnection,
} from "../../lib/connections";
import { setAgentConfig, type AgentConfigValue } from "../../lib/agent-config";

export interface ActionResult {
  ok: boolean;
  message: string;
}

function guard(
  fn: () => void,
): { error: ActionResult } | null {
  try {
    fn();
    return null;
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      return { error: { ok: false, message: err.message } };
    }
    throw err;
  }
}

export async function saveConnection(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  const denied = guard(() =>
    requireRole(session, { capability: "editConnections" }),
  );
  if (denied) return denied.error;

  const type = String(formData.get("type")) as ConnectionType;
  const token = (formData.get("token") as string) || undefined;

  const metadata: Record<string, unknown> = {};
  for (const field of ["siteUrl", "email", "workspace", "repo"]) {
    const v = formData.get(field);
    if (typeof v === "string" && v.length > 0) metadata[field] = v;
  }

  await upsertConnection({ type, token, metadata });
  revalidatePath("/settings");
  return { ok: true, message: `${type} connection saved.` };
}

export async function saveStagingUrl(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  const denied = guard(() =>
    requireRole(session, { capability: "editConnections" }),
  );
  if (denied) return denied.error;

  await setStagingUrl(String(formData.get("stagingUrl") ?? "").trim());
  revalidatePath("/settings");
  return { ok: true, message: "Staging URL saved." };
}

export async function saveAgentConfig(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  // Server-side enforcement: only admins may write agent config.
  const denied = guard(() =>
    requireRole(session, { capability: "editAgentConfig" }),
  );
  if (denied) return denied.error;

  const patch: Partial<AgentConfigValue> = {};
  const model = formData.get("model");
  if (typeof model === "string" && model) patch.model = model;
  const threshold = formData.get("classificationConfidenceThreshold");
  if (typeof threshold === "string" && threshold) {
    patch.classificationConfidenceThreshold = Number(threshold);
  }
  const maxScenarios = formData.get("maxScenariosPerStory");
  if (typeof maxScenarios === "string" && maxScenarios) {
    patch.maxScenariosPerStory = Number(maxScenarios);
  }

  await setAgentConfig(patch, session.email);
  revalidatePath("/settings");
  return { ok: true, message: "Agent configuration saved." };
}
