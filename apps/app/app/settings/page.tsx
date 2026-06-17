import { requireRole, roleCan } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, Denied } from "../components/Screen";
import { getClient, getConnections } from "../../lib/connections";
import { getAgentConfig } from "../../lib/agent-config";
import { ConnectionForm, StagingForm, AgentConfigForm } from "./forms";

export default async function SettingsPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to settings." />;
  }

  const canEditConnections = roleCan(session.role, "editConnections");
  const canEditAgentConfig = roleCan(session.role, "editAgentConfig");

  const [client, connections, agentConfig] = await Promise.all([
    getClient(),
    getConnections(),
    getAgentConfig(),
  ]);

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

          <div className="conn-grid">
            <ConnectionForm
              type="jira"
              label="Jira"
              status={connections.jira.status}
              hasToken={connections.jira.hasToken}
              tokenHint={connections.jira.tokenHint}
              values={connections.jira.metadata}
              canEdit={canEditConnections}
              fields={[
                { name: "siteUrl", label: "Atlassian site URL", placeholder: "https://acme.atlassian.net" },
                { name: "email", label: "Account email", placeholder: "you@acme.com" },
              ]}
            />
            <ConnectionForm
              type="confluence"
              label="Confluence"
              status={connections.confluence.status}
              hasToken={connections.confluence.hasToken}
              tokenHint={connections.confluence.tokenHint}
              values={connections.confluence.metadata}
              canEdit={canEditConnections}
              fields={[
                { name: "siteUrl", label: "Atlassian site URL", placeholder: "https://acme.atlassian.net" },
                { name: "email", label: "Account email", placeholder: "you@acme.com" },
              ]}
            />
            <ConnectionForm
              type="bitbucket"
              label="Bitbucket"
              status={connections.bitbucket.status}
              hasToken={connections.bitbucket.hasToken}
              tokenHint={connections.bitbucket.tokenHint}
              values={connections.bitbucket.metadata}
              canEdit={canEditConnections}
              fields={[
                { name: "workspace", label: "Workspace", placeholder: "acme" },
                { name: "repo", label: "Repository", placeholder: "web-app" },
              ]}
            />
            <div className="conn-form">
              <div className="conn-head">
                <strong>App under test</strong>
                <span className={`dotstat ${client.stagingUrl ? "on" : ""}`}>
                  {client.stagingUrl ? "set" : "not set"}
                </span>
              </div>
              <StagingForm
                stagingUrl={client.stagingUrl ?? ""}
                canEdit={canEditConnections}
              />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <strong>Agent configuration</strong>
            <span className="badge managed">Managed by your QA team</span>
          </div>
          {!canEditAgentConfig ? (
            <p className="form-status" style={{ marginTop: 0 }}>
              Read-only for your role. Mutations are rejected server-side (403).
            </p>
          ) : null}
          <AgentConfigForm
            model={agentConfig.model}
            threshold={agentConfig.classificationConfidenceThreshold}
            maxScenarios={agentConfig.maxScenariosPerStory}
            canEdit={canEditAgentConfig}
          />
        </section>
      </div>
    </>
  );
}
