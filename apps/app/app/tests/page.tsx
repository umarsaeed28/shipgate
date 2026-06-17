import { requireRole } from "@qa/auth";
import { getSession } from "../../lib/session";
import { PageHead, EmptyState, Denied } from "../components/Screen";

export default async function TestsPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "viewDashboards" });
  } catch {
    return <Denied message="You do not have access to tests." />;
  }

  return (
    <>
      <PageHead
        title="Tests"
        subtitle="Every generated CodeceptJS test and the result of its last run."
      />
      <EmptyState icon="✓" title="No tests yet" step="Built in Step 4">
        Approved scenarios become CodeceptJS tests here, each with its file path,
        layer, and most recent status. Tests live only under tests/** — never
        mixed into product code.
      </EmptyState>
    </>
  );
}
