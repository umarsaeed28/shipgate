import { cookies } from "next/headers";
import { isRole, type Role, type Session } from "@qa/auth";
import { CLIENT_SLUG } from "@qa/config/client";

/**
 * Dev session adapter for the MVP scaffold.
 *
 * Real authentication (AUTH_SECRET, signed sessions) is wired later. For now the
 * active role is read from a cookie so reviewers can flip roles and see the
 * server-side gating take effect. Authorization decisions still go through
 * @qa/auth's requireRole / roleCan on the server — never the cookie alone.
 */
export const ROLE_COOKIE = "qa_role";

export async function getSession(): Promise<Session> {
  const store = await cookies();
  const raw = store.get(ROLE_COOKIE)?.value;
  const role: Role = isRole(raw) ? raw : "client";

  return {
    userId: `dev-${role}`,
    email: `${role}@${CLIENT_SLUG}.example`,
    role,
    clientId: CLIENT_SLUG,
  };
}
