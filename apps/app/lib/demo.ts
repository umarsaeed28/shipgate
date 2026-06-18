/**
 * Read-only demo mode.
 *
 * When DEMO_MODE is on, the workspace is a public, viewable sandbox: all data
 * mutations are blocked server-side (not just hidden in the UI), so visitors can
 * explore every screen and role without changing data or triggering Bedrock,
 * Jira, Bitbucket, or worker jobs. Role switching stays enabled so viewers can
 * see the role-based UI from each perspective.
 */
export const DEMO_MODE =
  process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

export const DEMO_MESSAGE =
  "This is a read only demo. Changes are disabled here.";
