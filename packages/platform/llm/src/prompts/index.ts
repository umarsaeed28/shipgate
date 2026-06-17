/**
 * Versioned prompt templates. Agents NEVER inline prompt strings — they call
 * these builders by id. Each returns { system, user } text for the real model;
 * the mock provider keys off the same promptId + input.
 */

export interface BuiltPrompt {
  promptId: string;
  system: string;
  user: string;
}

export interface ScenarioPromptInput {
  story: {
    key?: string;
    title?: string;
    description?: string;
    acceptanceCriteria?: string[];
  };
  confluence?: string;
  diff?: string;
  changedFiles?: string[];
  maxScenarios?: number;
}

export function scenarioPromptV1(input: ScenarioPromptInput): BuiltPrompt {
  const system =
    "You are a senior QA engineer. Draft concrete, plain-language test scenarios " +
    "for a web application. Separate scenarios that come from the user story " +
    '("story_driven") from scenarios that guard code changes in the diff ' +
    '("code_deviation"). Respond ONLY with JSON matching: ' +
    '{"scenarios":[{"title","kind":"story_driven|code_deviation","steps":[string],"rationale","priority":"high|medium|low"}]}';

  const parts: string[] = [];
  if (input.story.key) parts.push(`Story key: ${input.story.key}`);
  if (input.story.title) parts.push(`Title: ${input.story.title}`);
  if (input.story.description)
    parts.push(`Description:\n${input.story.description}`);
  if (input.story.acceptanceCriteria?.length)
    parts.push(
      `Acceptance criteria:\n- ${input.story.acceptanceCriteria.join("\n- ")}`,
    );
  if (input.confluence) parts.push(`Additional context:\n${input.confluence}`);
  if (input.changedFiles?.length)
    parts.push(`Changed files:\n- ${input.changedFiles.join("\n- ")}`);
  if (input.diff) parts.push(`Diff (truncated):\n${input.diff.slice(0, 6000)}`);
  parts.push(
    `Produce at most ${input.maxScenarios ?? 8} scenarios. Include at least one "code_deviation" scenario when a diff or changed files are present.`,
  );

  return { promptId: "scenario.v1", system, user: parts.join("\n\n") };
}

export interface TestPromptInput {
  scenario: { title: string; steps: string[] };
  baseUrl?: string;
}

export function codeceptTestPromptV1(input: TestPromptInput): BuiltPrompt {
  const system =
    "You write CodeceptJS tests using the Playwright helper. Prefer data-testid " +
    "selectors (locate('[data-testid=...]')). Keep tests deterministic and " +
    "self-contained. Respond ONLY with JSON: " +
    '{"filename":"<name>_test.js","code":"<the test file contents>","summary":"<one line>"}';

  const user = [
    `Scenario: ${input.scenario.title}`,
    `Steps:\n- ${input.scenario.steps.join("\n- ")}`,
    input.baseUrl ? `Base URL: ${input.baseUrl}` : "",
    "The base URL is configured by the runner; use relative paths like I.amOnPage('/').",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { promptId: "codecept-test.v1", system, user };
}

export interface ClassificationPromptInput {
  failure: {
    errorType?: string | null;
    message?: string | null;
    testFilePath?: string | null;
  };
  history?: string;
}

export function classificationPromptV1(
  input: ClassificationPromptInput,
): BuiltPrompt {
  // NOTE: documented stub prompt — Agent 2 is scaffolded in Step 5.
  const system =
    "You are a regression analyst. Classify a CI failure as real_bug, " +
    "test_issue, or flaky, with a confidence 0..1 and a short rationale. " +
    'Respond ONLY with JSON: {"class","confidence","rationale","evidenceUrls":[]}. ' +
    "You classify and explain only; never edit tests or mask failures.";

  const user = [
    `Error type: ${input.failure.errorType ?? "unknown"}`,
    `Message: ${input.failure.message ?? "(none)"}`,
    input.failure.testFilePath ? `Test: ${input.failure.testFilePath}` : "",
    input.history ? `Recent history:\n${input.history}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { promptId: "classification.v1", system, user };
}
