import { requireRole } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export default async function CoveragePage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to coverage." />;
  }

  return (
    <>
      <PageHead
        title="Coverage"
        subtitle="Features and user journeys mapped against what's tested — and where the gaps are."
      />
      <EmptyState icon="▣" title="No coverage data yet" step="Built in Step 4">
        Once Agent 1 has written tests and runs are flowing into the history
        store, this matrix will show each feature/journey against its automated
        coverage and highlight untested gaps.
      </EmptyState>
    </>
  );
}
