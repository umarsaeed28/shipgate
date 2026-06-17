import { requireRole } from "@qa/auth";
import { prisma } from "@qa/store";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export const dynamic = "force-dynamic";

export default async function CoveragePage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to coverage." />;
  }

  const scenarios = await prisma.scenario.findMany({ include: { test: true } });

  if (scenarios.length === 0) {
    return (
      <>
        <PageHead
          title="Coverage"
          subtitle="Features and user journeys mapped against what's tested — and where the gaps are."
        />
        <EmptyState icon="▣" title="No coverage data yet">
          Draft and approve scenarios in the Review queue. Coverage is computed
          from the history store as tests are automated.
        </EmptyState>
      </>
    );
  }

  // Group by source story (a feature/journey). Unsourced scenarios bucket together.
  const groups = new Map<
    string,
    { total: number; automated: number; passing: number; gaps: number }
  >();
  for (const s of scenarios) {
    const key = s.sourceStoryKey ?? "(unassigned)";
    const g = groups.get(key) ?? { total: 0, automated: 0, passing: 0, gaps: 0 };
    g.total++;
    if (s.status === "automated") g.automated++;
    if (s.test?.status === "passing") g.passing++;
    if (s.status === "pending_review" || s.status === "kept") g.gaps++;
    groups.set(key, g);
  }

  const totals = {
    total: scenarios.length,
    automated: scenarios.filter((s) => s.status === "automated").length,
    passing: scenarios.filter((s) => s.test?.status === "passing").length,
  };
  const pct = Math.round((totals.automated / totals.total) * 100);

  return (
    <>
      <PageHead
        title="Coverage"
        subtitle="Features and user journeys mapped against what's tested — and where the gaps are."
      />

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-num">{pct}%</span>
          <span className="kpi-label">Scenarios automated</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{totals.passing}</span>
          <span className="kpi-label">Passing tests</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{totals.total}</span>
          <span className="kpi-label">Total scenarios</span>
        </div>
      </div>

      <table className="grid-table">
        <thead>
          <tr>
            <th>Feature / journey</th>
            <th>Scenarios</th>
            <th>Automated</th>
            <th>Passing</th>
            <th>Gaps</th>
          </tr>
        </thead>
        <tbody>
          {[...groups.entries()].map(([key, g]) => (
            <tr key={key}>
              <td className="mono">{key}</td>
              <td>{g.total}</td>
              <td>{g.automated}</td>
              <td>{g.passing}</td>
              <td>{g.gaps > 0 ? <span className="gap">{g.gaps}</span> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
