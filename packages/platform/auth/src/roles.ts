/**
 * Roles for the platform. Authorization is enforced on the server for every
 * mutation — a hidden button is not a permission (see qa-platform.mdc).
 *
 * - client:  manages their own connections and views everything.
 *            NEVER edits agent configuration.
 * - qa_lead: supervises the agents (e.g. the Review queue).
 * - admin:   the agency operator; edits agent configuration.
 */
export const ROLES = ["client", "qa_lead", "admin"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Capabilities, expressed as the set of roles allowed to perform them. */
export const CAPABILITIES = {
  /** View any read-only surface (Coverage, Tests, Failures, Trends). */
  viewDashboards: ["client", "qa_lead", "admin"],
  /** Edit connections (Jira/Bitbucket/Confluence/staging URL). */
  editConnections: ["client", "qa_lead", "admin"],
  /** Approve/discard scenarios in the Review queue. */
  reviewScenarios: ["qa_lead", "admin"],
  /** Read or write agent configuration (prompts, thresholds, model). */
  viewAgentConfig: ["client", "qa_lead", "admin"],
  editAgentConfig: ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function roleCan(role: Role, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}
