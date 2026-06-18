import { requireRole } from "@qa/auth";
import { prisma } from "@qa/store";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export const dynamic = "force-dynamic";

interface StoryRow {
  story: string;
  total: number;
  automated: number;
  pending: number;
  kept: number;
  discarded: number;
}

export default async function CoveragePage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to coverage." />;
  }

  const scenarios = await prisma.scenario.findMany({
    orderBy: { createdAt: "asc" },
  });

  const total = scenarios.length;
  const automated = scenarios.filter((s) => s.status === "automated").length;
  const pending = scenarios.filter((s) => s.status === "pending_review").length;
  const automationRate = total ? Math.round((automated / total) * 100) : 0;

  const byStory = new Map<string, StoryRow>();
  for (const s of scenarios) {
    const story = s.sourceStoryKey ?? "(no story)";
    const row =
      byStory.get(story) ??
      { story, total: 0, automated: 0, pending: 0, kept: 0, discarded: 0 };
    row.total += 1;
    if (s.status === "automated") row.automated += 1;
    else if (s.status === "pending_review") row.pending += 1;
    else if (s.status === "kept") row.kept += 1;
    else if (s.status === "discarded") row.discarded += 1;
    byStory.set(story, row);
  }
  const rows = [...byStory.values()].sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHead
        title="Coverage"
        subtitle="Scenarios per story and how much of each is automated. Sourced from the history store."
      />

      {total === 0 ? (
        <EmptyState icon="▣" title="No coverage yet">
          Once Agent 1 drafts scenarios and your QA lead approves them for
          automation, coverage by story appears here.
        </EmptyState>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span className="kpi-num">{automationRate}%</span>
              <span className="kpi-label">Automation rate</span>
            </div>
            <div className="kpi">
              <span className="kpi-num">
                {automated}
                <span className="subtle" style={{ fontSize: 18 }}>
                  {" "}
                  / {total}
                </span>
              </span>
              <span className="kpi-label">Automated scenarios</span>
            </div>
            <div className="kpi">
              <span className="kpi-num">{rows.length}</span>
              <span className="kpi-label">
                Stories tracked{pending > 0 ? ` · ${pending} pending review` : ""}
              </span>
            </div>
          </div>

          <table className="grid-table">
            <thead>
              <tr>
                <th>Story</th>
                <th>Scenarios</th>
                <th>Automated</th>
                <th>Pending</th>
                <th>Automation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = r.total
                  ? Math.round((r.automated / r.total) * 100)
                  : 0;
                return (
                  <tr key={r.story}>
                    <td className="mono">{r.story}</td>
                    <td>{r.total}</td>
                    <td>{r.automated}</td>
                    <td>
                      {r.pending > 0 ? (
                        r.pending
                      ) : (
                        <span className="subtle">0</span>
                      )}
                    </td>
                    <td>
                      <div className="cov-cell">
                        <span className="cov-bar" aria-hidden="true">
                          <i style={{ width: `${pct}%` }} />
                        </span>
                        <span className="cov-pct">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
