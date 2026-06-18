"use client";

import { useEffect, useRef, useState } from "react";
import {
  SECTIONS,
  OTHER_CHOICE,
  OTHER_KEY,
  type Answers,
  type Question,
} from "./onboarding";

const CONTACT_STEP = SECTIONS.length;
const TOTAL_STEPS = SECTIONS.length + 1;
const STORAGE_KEY = "shipgate_onboarding_v1";

const SECTION_SUBTITLES: Record<string, string> = {
  team: "A little about your company and how you ship.",
  goals: "What you want managed QA to achieve.",
  automation: "Where your testing stands today.",
  ai: "How your team thinks about AI.",
};

function getOther(answers: Answers): Record<string, string> {
  return (answers[OTHER_KEY] ?? {}) as Record<string, string>;
}

function isSelected(answers: Answers, q: Question, option: string): boolean {
  const v = answers[q.key];
  if (Array.isArray(v)) return v.includes(option);
  return v === option;
}

function sectionAnswered(answers: Answers, sectionIndex: number): boolean {
  return SECTIONS[sectionIndex]!.questions.every((q) => {
    const v = answers[q.key];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.length > 0;
  });
}

function validEmail(email: string): boolean {
  return /.+@.+\..+/.test(email.trim());
}

export function OnboardingWizard() {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");
  const loaded = useRef(false);

  // Load any in progress answers so a visitor can leave and resume.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          answers?: Answers;
          email?: string;
          company?: string;
        };
        if (saved.answers) setAnswers(saved.answers);
        if (saved.email) setEmail(saved.email);
        if (saved.company) setCompany(saved.company);
      }
    } catch {
      /* ignore corrupt storage */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers, email, company }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [answers, email, company]);

  function setSingle(q: Question, option: string) {
    setAnswers((prev) => ({ ...prev, [q.key]: option }));
  }

  function toggleMulti(q: Question, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[q.key]) ? (prev[q.key] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [q.key]: next };
    });
  }

  function setOtherNote(q: Question, text: string) {
    setAnswers((prev) => {
      const other = { ...getOther(prev), [q.key]: text };
      if (!text) delete other[q.key];
      return { ...prev, [OTHER_KEY]: other };
    });
  }

  function goNext() {
    setError("");
    setStep((s) => Math.min(CONTACT_STEP, s + 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (!validEmail(email)) {
      setError("A valid email is required so we can reach you.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, answers }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong");
      }
      setStatus("ok");
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setStatus("err");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "ok") {
    return (
      <div className="wiz" role="status">
        <div className="wiz-done">
          <span className="wiz-check" aria-hidden="true">
            ✓
          </span>
          <h3>Thank you, your answers are in</h3>
          <p>
            Your assigned QA lead will review what you shared and reach out about a
            managed QA instance for your team. We will be in touch by email.
          </p>
          <p className="wiz-done-note">
            In the meanwhile, if you have any questions, please feel free to reach
            out by email at <a href="mailto:[contact email]">[contact email]</a>{" "}
            and we will get back to you as soon as we can.
          </p>
        </div>
      </div>
    );
  }

  const onContact = step === CONTACT_STEP;
  const canAdvance = onContact ? validEmail(email) : sectionAnswered(answers, step);
  const heading = onContact ? "Where should we reach you?" : SECTIONS[step]!.heading;
  const subtitle = onContact
    ? "We use this only to set up your account and have your QA lead reach out."
    : SECTION_SUBTITLES[SECTIONS[step]!.id] ?? "";
  const hint = onContact
    ? "Add your work email to continue"
    : "Answer the questions in this step to continue";

  return (
    <div className="wiz">
      <div className="wiz-head">
        <div
          className="wiz-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step + 1}
          aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span key={i} className={`wiz-seg ${i <= step ? "filled" : ""}`} />
          ))}
        </div>
        <div className="wiz-orient">
          Step {step + 1} of {TOTAL_STEPS}
        </div>
      </div>

      <div className="wiz-panel" key={step}>
        <h3 className="wiz-heading">{heading}</h3>
        {subtitle ? <p className="wiz-sub">{subtitle}</p> : null}

        {onContact ? (
          <div className="wiz-fields">
            <label className="wiz-field">
              <span>Work email</span>
              <input
                type="email"
                value={email}
                placeholder="you@company.com"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="wiz-field">
              <span>Company (optional)</span>
              <input
                type="text"
                value={company}
                placeholder="Company"
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
          </div>
        ) : (
          SECTIONS[step]!.questions.map((q) => {
            const selectedOther = isSelected(answers, q, OTHER_CHOICE);
            const options = q.allowOther ? [...q.options, OTHER_CHOICE] : q.options;
            return (
              <fieldset key={q.key} className="q">
                <legend className="q-prompt">
                  {q.prompt}
                  {q.type === "single" ? <span className="q-hint"> Choose one</span> : null}
                </legend>
                <div className="opts">
                  {options.map((option) => {
                    const sel = isSelected(answers, q, option);
                    return (
                      <button
                        type="button"
                        key={option}
                        className={`opt opt-${q.type} ${sel ? "selected" : ""}`}
                        aria-pressed={sel}
                        onClick={() =>
                          q.type === "multi" ? toggleMulti(q, option) : setSingle(q, option)
                        }
                      >
                        <span className="opt-ind" aria-hidden="true" />
                        <span className="opt-label">{option}</span>
                      </button>
                    );
                  })}
                </div>
                {q.allowOther ? (
                  <div className={`opt-other-wrap ${selectedOther ? "open" : ""}`}>
                    <div className="opt-other-inner">
                      <input
                        className="opt-other"
                        type="text"
                        placeholder="Add a short note (optional)"
                        value={getOther(answers)[q.key] ?? ""}
                        disabled={!selectedOther}
                        tabIndex={selectedOther ? 0 : -1}
                        onChange={(e) => setOtherNote(q, e.target.value)}
                      />
                    </div>
                  </div>
                ) : null}
              </fieldset>
            );
          })
        )}
      </div>

      {error ? <p className="wiz-err">{error}</p> : null}
      {!canAdvance && !error ? <p className="wiz-hint">{hint}</p> : null}

      <div className="wiz-nav">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={goBack}
          disabled={step === 0 || status === "sending"}
        >
          Back
        </button>
        {onContact ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={!canAdvance || status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Request access"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={goNext}
            disabled={!canAdvance}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
