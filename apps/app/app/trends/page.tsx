import { requireRole } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export default async function TrendsPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to trends." />;
  }

  return (
    <>
      <PageHead
        title="Trends"
        subtitle="Quality over time — pass rate, flake rate, coverage growth, top failing tests."
      />
      <EmptyState icon="📈" title="No trend data yet" step="Scaffolded in Step 5">
        Agent 3 charts the history store and answers questions strictly from the
        rows it queries — it never reports a number it did not retrieve.
      </EmptyState>
    </>
  );
}
