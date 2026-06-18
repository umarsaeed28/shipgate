/**
 * Client onboarding questionnaire definition.
 *
 * Every question is single or multi select and is addressed by a stable key so
 * the stored shape stays queryable over time. Visible copy is sentence case and
 * contains no dash or hyphen characters.
 */

export type QuestionType = "single" | "multi";

export interface Question {
  key: string;
  prompt: string;
  type: QuestionType;
  options: string[];
  /** When true, an optional "Other" choice reveals a never required text note. */
  allowOther?: boolean;
}

export interface Section {
  id: string;
  heading: string;
  questions: Question[];
}

export const SECTIONS: Section[] = [
  {
    id: "team",
    heading: "About your team",
    questions: [
      {
        key: "company_stage",
        prompt: "What best describes your company stage?",
        type: "single",
        options: [
          "Early startup",
          "Growth stage",
          "Established company",
          "Enterprise",
        ],
      },
      {
        key: "eng_team_size",
        prompt: "How large is your engineering team?",
        type: "single",
        options: ["1 to 5", "6 to 20", "21 to 50", "51 to 200", "More than 200"],
      },
      {
        key: "qa_ownership",
        prompt: "Do you have anyone focused on QA today?",
        type: "single",
        options: [
          "A dedicated QA team",
          "One or two QA engineers",
          "Developers handle QA themselves",
          "No one owns QA",
        ],
      },
      {
        key: "product_types",
        prompt: "What do you build? Select all that apply.",
        type: "multi",
        allowOther: true,
        options: [
          "Web application",
          "Mobile application",
          "APIs or backend services",
          "Desktop software",
        ],
      },
      {
        key: "release_frequency",
        prompt: "How often do you release?",
        type: "single",
        options: [
          "Multiple times a day",
          "A few times a week",
          "Roughly weekly",
          "Monthly or less often",
        ],
      },
    ],
  },
  {
    id: "goals",
    heading: "What you want to achieve",
    questions: [
      {
        key: "biggest_pain",
        prompt: "What is your biggest QA pain right now?",
        type: "single",
        options: [
          "Bugs reaching production",
          "Releases are slow",
          "Coverage is unclear",
          "Tests are flaky and untrusted",
          "QA cannot keep up with development",
        ],
      },
      {
        key: "success_looks_like",
        prompt: "What would success with Shipgate look like? Select all that apply.",
        type: "multi",
        allowOther: true,
        options: [
          "Catch more bugs before release",
          "Ship faster with confidence",
          "Reduce manual testing effort",
          "Clear visibility into quality",
          "Free the team to focus on building",
        ],
      },
      {
        key: "test_priorities",
        prompt: "Which areas matter most to test first? Select all that apply.",
        type: "multi",
        allowOther: true,
        options: [
          "Critical user journeys",
          "Recent changes and new features",
          "Areas that break often",
          "Core APIs",
          "We are not sure yet",
        ],
      },
      {
        key: "coverage_timeline",
        prompt: "How soon do you want coverage in place?",
        type: "single",
        options: [
          "As soon as possible",
          "Within a month",
          "This quarter",
          "Just exploring",
        ],
      },
    ],
  },
  {
    id: "automation",
    heading: "Your test automation today",
    questions: [
      {
        key: "automation_level",
        prompt: "How much of your testing is automated?",
        type: "single",
        options: [
          "None, it is all manual",
          "A little",
          "About half",
          "Mostly automated",
          "Almost everything",
        ],
      },
      {
        key: "test_types",
        prompt: "Which test types do you run today? Select all that apply.",
        type: "multi",
        allowOther: true,
        options: [
          "Manual testing only",
          "Unit tests",
          "API tests",
          "Web UI tests",
          "Mobile tests",
          "None yet",
        ],
      },
      {
        key: "ci_usage",
        prompt: "Do you run tests in a CI pipeline?",
        type: "single",
        options: [
          "Yes on every change",
          "Yes on a schedule",
          "Occasionally",
          "Not yet",
        ],
      },
      {
        key: "tools_in_use",
        prompt: "Which tools are in use today? Select all that apply.",
        type: "multi",
        allowOther: true,
        options: [
          "Playwright",
          "Cypress",
          "Selenium",
          "Jest or similar",
          "Postman or API tooling",
          "A test management tool",
          "None of these",
        ],
      },
      {
        key: "suite_feeling",
        prompt: "How do you feel about your current test suite?",
        type: "single",
        options: [
          "Reliable and trusted",
          "Useful but flaky",
          "Outdated",
          "We do not really have one",
        ],
      },
    ],
  },
  {
    id: "ai",
    heading: "Where you are with AI",
    questions: [
      {
        key: "ai_usage",
        prompt: "How is your team using AI in engineering today?",
        type: "single",
        options: [
          "Not yet",
          "Experimenting informally",
          "Using AI coding tools regularly",
          "AI is part of our workflow",
        ],
      },
      {
        key: "ai_for_qa",
        prompt: "Have you used AI for testing or QA before?",
        type: "single",
        options: ["No", "A little", "Yes and it helped", "Yes and it disappointed us"],
      },
      {
        key: "ai_agent_sentiment",
        prompt: "How does your team feel about AI agents doing QA work?",
        type: "single",
        options: [
          "Excited to try it",
          "Interested but cautious",
          "Skeptical",
          "We need to be convinced",
        ],
      },
      {
        key: "oversight_expectation",
        prompt: "How much human oversight do you expect over AI agents?",
        type: "single",
        options: [
          "A person should approve everything",
          "Approve important changes only",
          "Light oversight is fine",
          "We want to decide together",
        ],
      },
      {
        key: "constraints",
        prompt: "Are there constraints we should know about? Select all that apply.",
        type: "multi",
        allowOther: true,
        options: [
          "Data must stay in a specific region",
          "Code cannot leave our environment",
          "Security review required before access",
          "No specific constraints",
        ],
      },
    ],
  },
];

export const OTHER_CHOICE = "Other";
export const OTHER_KEY = "__other";

export type AnswerValue = string | string[];
export type OtherMap = Record<string, string>;
/**
 * One JSON object per response. Question keys map to a single value or a list;
 * the reserved OTHER_KEY holds optional free text notes for any "Other" choice.
 */
export type Answers = { [key: string]: AnswerValue | OtherMap | undefined };

export const ALL_QUESTIONS: Question[] = SECTIONS.flatMap((s) => s.questions);

export function totalQuestions(): number {
  return ALL_QUESTIONS.length;
}

/** True when every question has at least one selected option. */
export function isComplete(answers: Answers): boolean {
  return ALL_QUESTIONS.every((q) => {
    const v = answers[q.key];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.length > 0;
  });
}

export function answeredCount(answers: Answers): number {
  return ALL_QUESTIONS.filter((q) => {
    const v = answers[q.key];
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === "string" && v.length > 0;
  }).length;
}

/**
 * Coerce arbitrary client input to a known shape: only recognized question keys
 * and option values survive, and any "Other" note is trimmed and capped. This
 * runs on the server before persisting.
 */
export function sanitizeAnswers(raw: unknown): Answers {
  const out: Answers = {};
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;

  for (const q of ALL_QUESTIONS) {
    const v = obj[q.key];
    const valid = (x: unknown): x is string =>
      typeof x === "string" &&
      (q.options.includes(x) || (Boolean(q.allowOther) && x === OTHER_CHOICE));

    if (q.type === "multi") {
      if (Array.isArray(v)) {
        const allowed = v.filter(valid);
        if (allowed.length > 0) out[q.key] = allowed;
      }
    } else if (valid(v)) {
      out[q.key] = v;
    }
  }

  const other = obj[OTHER_KEY];
  if (other && typeof other === "object") {
    const cleanOther: Record<string, string> = {};
    for (const q of ALL_QUESTIONS) {
      if (!q.allowOther) continue;
      const t = (other as Record<string, unknown>)[q.key];
      if (typeof t === "string" && t.trim()) {
        cleanOther[q.key] = t.trim().slice(0, 300);
      }
    }
    if (Object.keys(cleanOther).length > 0) out[OTHER_KEY] = cleanOther;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Readiness summary — lead scannable highlights derived from the answers.
// ---------------------------------------------------------------------------

export interface Readiness {
  stage: string | null;
  teamSize: string | null;
  qaOwnership: string | null;
  automationMaturity: "low" | "medium" | "high" | "unknown";
  ciMaturity: "strong" | "partial" | "none" | "unknown";
  aiPosture: "eager" | "cautious" | "skeptical" | "needs convincing" | "unknown";
  oversight: string | null;
  urgency: "high" | "medium" | "low" | "unknown";
  topPain: string | null;
  goals: string[];
  constraints: string[];
  /** Plain language notes the QA lead should scan before the first meeting. */
  flags: string[];
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

export function deriveReadiness(answers: Answers): Readiness {
  const automationLevel = asString(answers.automation_level);
  const automationMaturity: Readiness["automationMaturity"] =
    automationLevel === "None, it is all manual" || automationLevel === "A little"
      ? "low"
      : automationLevel === "About half"
        ? "medium"
        : automationLevel === "Mostly automated" ||
            automationLevel === "Almost everything"
          ? "high"
          : "unknown";

  const ci = asString(answers.ci_usage);
  const ciMaturity: Readiness["ciMaturity"] =
    ci === "Yes on every change"
      ? "strong"
      : ci === "Yes on a schedule" || ci === "Occasionally"
        ? "partial"
        : ci === "Not yet"
          ? "none"
          : "unknown";

  const sentiment = asString(answers.ai_agent_sentiment);
  const aiPosture: Readiness["aiPosture"] =
    sentiment === "Excited to try it"
      ? "eager"
      : sentiment === "Interested but cautious"
        ? "cautious"
        : sentiment === "Skeptical"
          ? "skeptical"
          : sentiment === "We need to be convinced"
            ? "needs convincing"
            : "unknown";

  const timeline = asString(answers.coverage_timeline);
  const urgency: Readiness["urgency"] =
    timeline === "As soon as possible"
      ? "high"
      : timeline === "Within a month"
        ? "medium"
        : timeline === "This quarter"
          ? "medium"
          : timeline === "Just exploring"
            ? "low"
            : "unknown";

  const constraints = asArray(answers.constraints).filter(
    (c) => c !== "No specific constraints",
  );

  const flags: string[] = [];
  if (asString(answers.qa_ownership) === "No one owns QA") {
    flags.push("No one owns QA today");
  }
  if (automationMaturity === "low") {
    flags.push("Little or no test automation in place");
  }
  if (ciMaturity === "none") {
    flags.push("No CI pipeline for tests yet");
  }
  const suite = asString(answers.suite_feeling);
  if (suite === "Useful but flaky" || suite === "We do not really have one" || suite === "Outdated") {
    flags.push("Current test suite is not fully trusted");
  }
  if (aiPosture === "skeptical" || aiPosture === "needs convincing") {
    flags.push("Cautious about AI agents; lead should reassure and show evidence");
  }
  if (asString(answers.oversight_expectation) === "A person should approve everything") {
    flags.push("Expects a person to approve everything");
  }
  if (urgency === "high") {
    flags.push("Wants coverage in place as soon as possible");
  }
  if (asString(answers.ai_for_qa) === "Yes and it disappointed us") {
    flags.push("Tried AI for QA before and was disappointed");
  }
  for (const c of constraints) flags.push(c);

  return {
    stage: asString(answers.company_stage),
    teamSize: asString(answers.eng_team_size),
    qaOwnership: asString(answers.qa_ownership),
    automationMaturity,
    ciMaturity,
    aiPosture,
    oversight: asString(answers.oversight_expectation),
    urgency,
    topPain: asString(answers.biggest_pain),
    goals: asArray(answers.success_looks_like),
    constraints,
    flags,
  };
}
