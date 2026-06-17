import { requireRole } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export default async function ReviewPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "reviewScenarios" });
  } catch {
    return (
      <Denied message="The review queue is for QA leads and admins. Clients can view results but do not approve scenarios." />
    );
  }

  return (
    <>
      <PageHead
        title="Review queue"
        subtitle="Approve or discard the scenarios Agent 1 drafted before any test is written."
      />
      <EmptyState icon="👁" title="Nothing to review yet" step="Built in Step 3">
        When Agent 1 drafts scenarios from a Jira story and code diff, they appear
        here as pending_review. Keeping or automating a scenario triggers
        CodeceptJS test generation; discarding records the decision in history.
      </EmptyState>
    </>
  );
}
