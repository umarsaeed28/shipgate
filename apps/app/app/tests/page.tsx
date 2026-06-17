import { requireRole } from "@qa/auth";
import { prisma } from "@qa/store";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export const dynamic = "force-dynamic";

export default async function TestsPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to tests." />;
  }

  const tests = await prisma.test.findMany({
    orderBy: { updatedAt: "desc" },
    include: { scenario: true },
  });

  return (
    <>
      <PageHead
        title="Tests"
        subtitle="Every generated CodeceptJS test and the result of its last run."
      />

      {tests.length === 0 ? (
        <EmptyState icon="✓" title="No tests yet">
          Approve &amp; automate a scenario in the Review queue to generate the
          first CodeceptJS test. Tests live only under tests/**.
        </EmptyState>
      ) : (
        <table className="grid-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Layer</th>
              <th>Framework</th>
              <th>Last result</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id}>
                <td>
                  <div>{t.scenario?.title ?? "(scenario removed)"}</div>
                  <div className="mono subtle">{t.filePath.split("/").slice(-2).join("/")}</div>
                </td>
                <td>{t.layer}</td>
                <td>{t.framework}</td>
                <td>
                  <span className={`status-tag ${t.status}`}>{t.status}</span>
                </td>
                <td className="subtle">
                  {new Date(t.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
