import type { Capability } from "./roles";
import { roleCan, type Role } from "./roles";
import type { MaybeSession, Session } from "./session";

/** Thrown when the caller is not authenticated. */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Thrown when an authenticated caller lacks permission. */
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Server-side authorization guard. Call this at the top of every data-changing
 * route handler / server action — NOT only when rendering UI.
 *
 * Accepts either explicit roles or a named capability.
 *
 *   requireRole(session, { capability: "editAgentConfig" });
 *   requireRole(session, { roles: ["qa_lead", "admin"] });
 *
 * Returns the narrowed Session on success; throws Unauthorized/Forbidden
 * otherwise (map these to 401/403 at the boundary).
 */
export function requireRole(
  session: MaybeSession,
  allow: { roles: readonly Role[] } | { capability: Capability },
): Session {
  if (!session) {
    throw new UnauthorizedError();
  }

  const allowed =
    "capability" in allow
      ? roleCan(session.role, allow.capability)
      : allow.roles.includes(session.role);

  if (!allowed) {
    throw new ForbiddenError(
      "capability" in allow
        ? `Role "${session.role}" cannot "${allow.capability}"`
        : `Role "${session.role}" is not permitted`,
    );
  }

  return session;
}
