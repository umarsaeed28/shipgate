"use client";

import { useActionState } from "react";
import { requestScenarios, type ActionResult } from "./actions";

export function RequestForm() {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    requestScenarios,
    null,
  );

  return (
    <form action={action} className="request-form">
      <div className="request-row">
        <label className="field">
          <span>Jira story key</span>
          <input name="storyKey" placeholder="FB-101" required />
        </label>
        <label className="field">
          <span>Bitbucket PR # (optional)</span>
          <input name="prId" placeholder="42" />
        </label>
        <label className="field">
          <span>Max scenarios</span>
          <input name="maxScenarios" type="number" min="1" max="20" placeholder="8" />
        </label>
        <button className="btn-save" type="submit" disabled={pending}>
          {pending ? "Queuing…" : "Draft scenarios"}
        </button>
      </div>
      {result ? (
        <p className={`form-status ${result.ok ? "ok" : "err"}`}>{result.message}</p>
      ) : null}
    </form>
  );
}
