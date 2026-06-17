import { requireRole } from "@qa/auth";
import { prisma } from "@qa/store";
import { getSession } from "../../lib/session";
import { PageHead, Denied, EmptyState } from "../components/Screen";
import { RequestForm } from "./RequestForm";
import { decideScenario } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getSession();
  try {
    requireRole(session, { capability: "reviewScenarios" });
  } catch {
    return (
      <Denied message="The review queue is for QA leads and admins. Clients can view results but do not approve scenarios." />
    );
  }

  const pending = await prisma.scenario.findMany({
    where: { status: "pending_review" },
    orderBy: { createdAt: "desc" },
  });
  const decided = await prisma.scenario.findMany({
    where: { status: { in: ["kept", "automated", "discarded"] } },
    orderBy: { decidedAt: "desc" },
    take: 10,
    include: { test: true },
  });

  const key = process.env.ANTHROPIC_API_KEY ?? "";
  const usingClaude =
    key.startsWith("sk-ant-") && !key.includes("placeholder") && !key.includes("local");

  return (
    <>
      <PageHead
        title="Review queue"
        subtitle="Approve or discard the scenarios Agent 1 drafted before any test is written."
      />

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="section-title">
          <strong>Draft scenarios from a story</strong>
          <span className="badge step">
            LLM: {usingClaude ? "Claude" : "mock (no key)"}
          </span>
        </div>
        <RequestForm />
      </section>

      <div className="section-title">
        <strong>Pending review ({pending.length})</strong>
      </div>

      {pending.length === 0 ? (
        <EmptyState icon="👁" title="Nothing to review yet">
          Draft scenarios from a Jira story above. The worker will populate this
          queue; refresh once it finishes.
        </EmptyState>
      ) : (
        <div className="rows">
          {pending.map((s) => (
            <div key={s.id} className="scn">
              <div className="scn-head">
                <span className={`kind ${s.kind}`}>
                  {s.kind === "code_deviation" ? "Code deviation" : "Story-driven"}
                </span>
                <strong>{s.title}</strong>
                <span className="prio">{s.priority}</span>
              </div>
              <ol className="scn-steps">
                {s.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {s.rationale ? <p className="scn-rationale">{s.rationale}</p> : null}
              <div className="scn-meta">
                {s.sourceStoryKey ? <span>story {s.sourceStoryKey}</span> : null}
                {s.sourceCommitSha ? (
                  <span>commit {s.sourceCommitSha.slice(0, 8)}</span>
                ) : null}
              </div>
              <div className="scn-actions">
                <form action={decideScenario}>
                  <input type="hidden" name="scenarioId" value={s.id} />
                  <input type="hidden" name="decision" value="automate" />
                  <button className="btn-save" type="submit">
                    Approve &amp; automate
                  </button>
                </form>
                <form action={decideScenario}>
                  <input type="hidden" name="scenarioId" value={s.id} />
                  <input type="hidden" name="decision" value="keep" />
                  <button className="btn-ghost-sm" type="submit">
                    Keep
                  </button>
                </form>
                <form action={decideScenario}>
                  <input type="hidden" name="scenarioId" value={s.id} />
                  <input type="hidden" name="decision" value="discard" />
                  <button className="btn-ghost-sm danger" type="submit">
                    Discard
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 ? (
        <>
          <div className="section-title" style={{ marginTop: 28 }}>
            <strong>Recently decided</strong>
          </div>
          <div className="rows">
            {decided.map((s) => (
              <div key={s.id} className="scn decided">
                <div className="scn-head">
                  <span className={`status-tag ${s.status}`}>{s.status}</span>
                  <strong>{s.title}</strong>
                  {s.test ? (
                    <span className={`status-tag ${s.test.status}`}>
                      test: {s.test.status}
                    </span>
                  ) : null}
                </div>
                <div className="scn-meta">
                  {s.decisionBy ? <span>by {s.decisionBy}</span> : null}
                  {s.test?.filePath ? <span>{s.test.filePath}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
