import {
  passRateOverTime,
  flakeRate,
  coverageGrowth,
  topFailingTests,
} from "./queries";

export interface ChatAnswer {
  question: string;
  /** The history query that was run to ground the answer. */
  source: string;
  /** Natural-language answer derived STRICTLY from `rows`. */
  answer: string;
  /** The rows the answer is grounded in (the only evidence). */
  rows: unknown[];
}

/**
 * Agent 3 chat contract (scaffold): map a question to a deterministic history
 * query, then answer ONLY from the returned rows. It never invents numbers and
 * never reads outside the rows it queried. READ-ONLY.
 */
export async function answer(question: string): Promise<ChatAnswer> {
  const q = question.toLowerCase();

  if (/\bflak/.test(q)) {
    const f = await flakeRate();
    return {
      question,
      source: "flakeRate",
      answer:
        f.classified === 0
          ? "No failures have been classified yet, so flake rate is unavailable."
          : `${f.flaky} of ${f.classified} classified failures are flaky (${f.rate}%).`,
      rows: [f],
    };
  }

  if (/\bcoverage|automat/.test(q)) {
    const rows = await coverageGrowth();
    const latest = rows[rows.length - 1];
    return {
      question,
      source: "coverageGrowth",
      answer: latest
        ? `Cumulative automated scenarios reached ${latest.automatedCumulative} as of ${latest.date}.`
        : "No scenarios have been automated yet.",
      rows,
    };
  }

  if (/\bfail|top|worst/.test(q)) {
    const rows = await topFailingTests();
    const top = rows[0];
    return {
      question,
      source: "topFailingTests",
      answer: top
        ? `Top failing test: "${top.title}" with ${top.failures} failure(s).`
        : "No failures have been recorded.",
      rows,
    };
  }

  if (/\bpass|rate|trend|over time/.test(q)) {
    const rows = await passRateOverTime();
    const latest = rows[rows.length - 1];
    return {
      question,
      source: "passRateOverTime",
      answer: latest
        ? `Most recent pass rate (${latest.date}): ${latest.passRate}% (${latest.passed} passed, ${latest.failed} failed).`
        : "No completed runs yet.",
      rows,
    };
  }

  return {
    question,
    source: "none",
    answer:
      "I can answer from history about: pass rate over time, flake rate, " +
      "coverage growth, and top failing tests. Ask about one of those.",
    rows: [],
  };
}
