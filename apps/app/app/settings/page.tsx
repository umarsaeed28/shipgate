import { requireRole, roleCan } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export default async function SettingsPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to settings." />;
  }

  const canEditConnections = roleCan(session.role, "editConnections");
  const canEditAgentConfig = roleCan(session.role, "editAgentConfig");

  return (
    <>
      <PageHead
        title="Settings"
        subtitle="Manage your connections. Agent configuration is owned by your QA team."
      />

      <div className="rows">
        <section className="panel">
          <div className="section-title">
            <strong>Connections</strong>
            <span className="badge you">You manage these</span>
          </div>
          <EmptyState icon="🔌" title="Connections" step="Built in Step 2">
            Jira &amp; Confluence (via Atlassian MCP OAuth), Bitbucket (token), and
            your staging URL will be configured here.
            {canEditConnections
              ? " You can edit these."
              : " Your role can view these but not edit them."}
          </EmptyState>
        </section>

        <section className="panel">
          <div className="section-title">
            <strong>Agent configuration</strong>
            <span className="badge managed">Managed by your QA team</span>
          </div>
          <EmptyState icon="🤖" title="Prompts, thresholds, model" step="Built in Step 2">
            Agent prompts, classification thresholds, and the model are configured
            here.
            {canEditAgentConfig
              ? " As an admin you can edit these."
              : " This is read-only for your role — mutations are rejected server-side (403)."}
          </EmptyState>
        </section>
      </div>
    </>
  );
}
