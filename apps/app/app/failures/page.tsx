import { requireRole } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export default async function FailuresPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to failures." />;
  }

  return (
    <>
      <PageHead
        title="Failures"
        subtitle="A flat list of failures from recent runs, with their classifications."
      />
      <EmptyState icon="⚠" title="No failures recorded" step="Built in Steps 4–5">
        Failures from CI runs land here. Agent 2 (regression analyzer) will
        classify each as real bug, test issue, or flaky — it explains, but never
        edits tests or masks failures.
      </EmptyState>
    </>
  );
}
