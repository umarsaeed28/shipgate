import { requireRole } from "@qa/auth";
import { prisma } from "@qa/store";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export const dynamic = "force-dynamic";

export default async function FailuresPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to failures." />;
  }

  const failures = await prisma.failure.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { test: { include: { scenario: true } }, classification: true, run: true },
  });

  return (
    <>
      <PageHead
        title="Failures"
        subtitle="A flat list of failures from recent runs, with Agent 2 classifications."
      />

      {failures.length === 0 ? (
        <EmptyState icon="⚠" title="No failures recorded">
          When scheduled CodeceptJS runs or ingested CI runs produce failures,
          they appear here. Agent 2 classifies each as real bug, test issue, or
          flaky — it explains, but never edits tests or masks failures.
        </EmptyState>
      ) : (
        <table className="grid-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Test</th>
              <th>Error</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((f) => (
              <tr key={f.id}>
                <td className="subtle">{new Date(f.createdAt).toLocaleString()}</td>
                <td>{f.test?.scenario?.title ?? f.testId ?? "—"}</td>
                <td>
                  <div>{f.errorType ?? "error"}</div>
                  <div className="mono subtle clip">{f.message ?? ""}</div>
                </td>
                <td>
                  {f.classification ? (
                    <span className={`status-tag ${f.classification.class}`}>
                      {f.classification.class} ·{" "}
                      {Math.round(f.classification.confidence * 100)}%
                    </span>
                  ) : (
                    <span className="subtle">unclassified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
