"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isRole } from "@qa/auth";
import { ROLE_COOKIE } from "../lib/session";

/**
 * Dev-only role switcher. Sets the active role cookie used by getSession().
 * This does not grant any permission by itself — every protected action
 * re-checks the role server-side via requireRole().
 */
export async function setRole(formData: FormData): Promise<void> {
  const role = String(formData.get("role"));
  if (!isRole(role)) return;

  const store = await cookies();
  store.set(ROLE_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
}
