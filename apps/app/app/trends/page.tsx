import { requireRole } from "@qa/auth";
import {
  passRateOverTime,
  flakeRate,
  coverageGrowth,
  topFailingTests,
} from "@qa/trend-analyzer";
import { getSession } from "../../lib/session";
import { PageHead, Denied } from "../components/Screen";
import { ChatBox } from "./ChatBox";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to trends." />;
  }

  const [passRate, flake, coverage, topFailing] = await Promise.all([
    passRateOverTime(),
    flakeRate(),
    coverageGrowth(),
    topFailingTests(),
  ]);

  const latestPass = passRate[passRate.length - 1];
  const latestCov = coverage[coverage.length - 1];

  return (
    <>
      <PageHead
        title="Trends"
        subtitle="Charts over the history store. Ask Agent 3 — it answers only from rows it queried."
      />

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-num">{latestPass ? `${latestPass.passRate}%` : "—"}</span>
          <span className="kpi-label">Latest pass rate</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{flake.rate}%</span>
          <span className="kpi-label">Flake rate ({flake.flaky}/{flake.classified})</span>
        </div>
        <div className="kpi">
          <span className="kpi-num">{latestCov?.automatedCumulative ?? 0}</span>
          <span className="kpi-label">Automated scenarios</span>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <strong>Ask Agent 3</strong>
          <span className="badge step">Read-only · grounded in history</span>
        </div>
        <ChatBox />
      </section>

      <div className="trend-grid">
        <div className="panel">
          <div className="section-title"><strong>Pass rate over time</strong></div>
          {passRate.length === 0 ? (
            <p className="subtle">No completed runs yet.</p>
          ) : (
            <table className="grid-table">
              <thead><tr><th>Date</th><th>Passed</th><th>Failed</th><th>Pass %</th></tr></thead>
              <tbody>
                {passRate.map((p) => (
                  <tr key={p.date}>
                    <td className="mono">{p.date}</td>
                    <td>{p.passed}</td>
                    <td>{p.failed}</td>
                    <td>{p.passRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="section-title"><strong>Top failing tests</strong></div>
          {topFailing.length === 0 ? (
            <p className="subtle">No failures recorded.</p>
          ) : (
            <table className="grid-table">
              <thead><tr><th>Test</th><th>Failures</th></tr></thead>
              <tbody>
                {topFailing.map((t) => (
                  <tr key={t.testId ?? t.title}>
                    <td>{t.title}</td>
                    <td>{t.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
