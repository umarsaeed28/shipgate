"use client";

import { useActionState } from "react";
import {
  saveConnection,
  saveStagingUrl,
  saveAgentConfig,
  type ActionResult,
} from "./actions";

function Status({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p className={`form-status ${result.ok ? "ok" : "err"}`}>{result.message}</p>
  );
}

interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
}

export function ConnectionForm({
  type,
  label,
  fields,
  values,
  hasToken,
  tokenHint,
  status,
  canEdit,
}: {
  type: string;
  label: string;
  fields: FieldDef[];
  values: Record<string, unknown>;
  hasToken: boolean;
  tokenHint: string | null;
  status: string;
  canEdit: boolean;
}) {
  const [result, action, pending] = useActionState(saveConnection, null);

  return (
    <form action={action} className="conn-form">
      <input type="hidden" name="type" value={type} />
      <div className="conn-head">
        <strong>{label}</strong>
        <span className={`dotstat ${status === "connected" ? "on" : ""}`}>
          {status}
        </span>
      </div>

      {fields.map((f) => (
        <label key={f.name} className="field">
          <span>{f.label}</span>
          <input
            name={f.name}
            defaultValue={(values[f.name] as string) ?? ""}
            placeholder={f.placeholder}
            disabled={!canEdit}
          />
        </label>
      ))}

      <label className="field">
        <span>API token {hasToken ? `(stored: ${tokenHint})` : ""}</span>
        <input
          name="token"
          type="password"
          placeholder={hasToken ? "•••• leave blank to keep" : "Paste token"}
          disabled={!canEdit}
        />
      </label>

      {canEdit ? (
        <button className="btn-save" type="submit" disabled={pending}>
          {pending ? "Saving…" : `Save ${label}`}
        </button>
      ) : (
        <p className="form-status">View only for your role.</p>
      )}
      <Status result={result} />
    </form>
  );
}

export function StagingForm({
  stagingUrl,
  canEdit,
}: {
  stagingUrl: string;
  canEdit: boolean;
}) {
  const [result, action, pending] = useActionState(saveStagingUrl, null);
  return (
    <form action={action} className="conn-form">
      <label className="field">
        <span>Staging URL</span>
        <input
          name="stagingUrl"
          defaultValue={stagingUrl}
          placeholder="https://staging.example.com"
          disabled={!canEdit}
        />
      </label>
      {canEdit ? (
        <button className="btn-save" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save staging URL"}
        </button>
      ) : (
        <p className="form-status">View only for your role.</p>
      )}
      <Status result={result} />
    </form>
  );
}

export function AgentConfigForm({
  model,
  threshold,
  maxScenarios,
  canEdit,
}: {
  model: string;
  threshold: number;
  maxScenarios: number;
  canEdit: boolean;
}) {
  const [result, action, pending] = useActionState(saveAgentConfig, null);
  return (
    <form action={action} className="conn-form">
      <label className="field">
        <span>Anthropic model</span>
        <input name="model" defaultValue={model} disabled={!canEdit} />
      </label>
      <label className="field">
        <span>Classification confidence threshold</span>
        <input
          name="classificationConfidenceThreshold"
          type="number"
          step="0.05"
          min="0"
          max="1"
          defaultValue={threshold}
          disabled={!canEdit}
        />
      </label>
      <label className="field">
        <span>Max scenarios per story</span>
        <input
          name="maxScenariosPerStory"
          type="number"
          min="1"
          max="30"
          defaultValue={maxScenarios}
          disabled={!canEdit}
        />
      </label>
      {canEdit ? (
        <button className="btn-save" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save agent configuration"}
        </button>
      ) : (
        <p className="form-status">
          Managed by your QA team — read-only for your role.
        </p>
      )}
      <Status result={result} />
    </form>
  );
}
