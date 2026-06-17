import type { Role } from "./roles";

/**
 * The authenticated principal for a request. In the MVP scaffold the session is
 * resolved by the app's server adapter (e.g. from a signed cookie). The shape
 * is intentionally framework-agnostic so it can be reused by route handlers,
 * server actions, and the job worker.
 */
export interface Session {
  userId: string;
  email: string;
  role: Role;
  /** The client this user belongs to — always the instance's single client. */
  clientId: string;
}

export type MaybeSession = Session | null;
