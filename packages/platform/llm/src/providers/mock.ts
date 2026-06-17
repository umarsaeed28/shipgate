import type { CompleteRequest, LlmProvider } from "../types";

/**
 * Deterministic offline provider for local development and demos when no real
 * ANTHROPIC_API_KEY is configured. It synthesizes schema-valid output keyed by
 * promptId so Agent 1's pipeline is runnable end-to-end without a live key.
 * The real path (AnthropicProvider) is used whenever a real key is present.
 */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

interface ScenarioInput {
  story?: { key?: string; title?: string; acceptanceCriteria?: string[] };
  changedFiles?: string[];
  diff?: string;
  maxScenarios?: number;
}

function genScenarios(input: ScenarioInput): string {
  const title = input.story?.title ?? "Untitled story";
  const criteria =
    input.story?.acceptanceCriteria && input.story.acceptanceCriteria.length > 0
      ? input.story.acceptanceCriteria
      : [`User can complete: ${title}`, `Invalid input is rejected`];

  const scenarios: unknown[] = criteria.slice(0, 4).map((c) => ({
    title: c.slice(0, 80),
    kind: "story_driven",
    steps: [
      "Open the application",
      `Exercise: ${c}`,
      "Verify the expected outcome is shown",
    ],
    rationale: `Derived from the story acceptance criteria of ${input.story?.key ?? "the story"}.`,
    priority: "high",
  }));

  // Code-deviation scenarios from the diff / changed files (>=1 when a diff exists).
  const files = input.changedFiles ?? [];
  if (files.length > 0 || input.diff) {
    const f = files[0] ?? "the changed module";
    scenarios.push({
      title: `Regression guard for changes in ${f}`,
      kind: "code_deviation",
      steps: [
        "Open the application",
        `Exercise the behavior affected by ${f}`,
        "Verify no regression vs. prior behavior",
      ],
      rationale: `The diff touches ${files.length || "several"} file(s) not fully described by the story; this guards the code change directly.`,
      priority: "medium",
    });
  }

  const max = input.maxScenarios ?? 8;
  return JSON.stringify({ scenarios: scenarios.slice(0, max) });
}

interface TestInput {
  scenario?: { title?: string; steps?: string[] };
}

function genTest(input: TestInput): string {
  const title = input.scenario?.title ?? "Smoke test";
  const steps = input.scenario?.steps ?? ["Open the application"];
  const slug = slugify(title) || "scenario";
  const stepComments = steps.map((s) => `  // ${s}`).join("\n");

  // A minimal, deterministic CodeceptJS (Playwright helper) test that loads the
  // staging base URL and asserts navigation succeeded. The real model produces
  // richer assertions using data-testid selectors.
  const code = `Feature(${JSON.stringify(title)});

Scenario(${JSON.stringify(title)}, ({ I }) => {
${stepComments}
  I.amOnPage('/');
  I.seeInCurrentUrl('/');
});
`;

  return JSON.stringify({
    filename: `${slug}_test.js`,
    code,
    summary: `Smoke check generated from scenario "${title}".`,
  });
}

function genClassification(): string {
  return JSON.stringify({
    class: "flaky",
    confidence: 0.5,
    rationale:
      "Stub classification (Agent 2 is scaffolded; real prompt pending).",
    evidenceUrls: [],
  });
}

export class MockProvider implements LlmProvider {
  readonly name = "mock";

  async complete(req: CompleteRequest): Promise<string> {
    switch (req.promptId) {
      case "scenario.v1":
        return genScenarios((req.input ?? {}) as ScenarioInput);
      case "codecept-test.v1":
        return genTest((req.input ?? {}) as TestInput);
      case "classification.v1":
        return genClassification();
      default:
        return JSON.stringify({
          note: "mock provider: no generator for promptId",
          promptId: req.promptId ?? null,
        });
    }
  }
}
