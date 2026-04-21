import type { PlannerInput, TestPlanOutput, PlannedTestCase } from "./test-planner.js";

export function generateMockTestPlan(input: PlannerInput): TestPlanOutput {
  const cases: PlannedTestCase[] = [];

  for (const story of input.userStories) {
    cases.push({
      title: `[Happy] ${story.title}`,
      category: "happy_path",
      priority: "P0",
      storyRef: story.key,
      preconditions: "User is authenticated",
      steps: [
        `Navigate to ${input.baseUrl}`,
        "Complete the primary workflow",
        "Verify success state",
      ],
      expectedResult: "Workflow completes successfully",
    });

    cases.push({
      title: `[Negative] ${story.title} - invalid input`,
      category: "negative",
      priority: "P1",
      storyRef: story.key,
      preconditions: "User is authenticated",
      steps: [
        `Navigate to ${input.baseUrl}`,
        "Submit form with invalid data",
        "Verify error handling",
      ],
      expectedResult: "Appropriate error messages are displayed",
    });

    for (const criterion of story.criteria) {
      cases.push({
        title: `[Edge] ${criterion.slice(0, 60)}`,
        category: "edge",
        priority: "P2",
        storyRef: story.key,
        preconditions: "System is in expected state",
        steps: [`Validate: ${criterion}`],
        expectedResult: criterion,
      });
    }
  }

  if (input.observations?.length) {
    cases.push({
      title: "[Exploratory] Observed UI flows",
      category: "happy_path",
      priority: "P1",
      preconditions: "App is deployed",
      steps: input.observations.map((o) => `Verify page ${o.url}: ${o.notes}`),
      expectedResult: "All observed pages render correctly",
    });
  }

  const planMd = [
    `# Test Plan - ${input.baseUrl}`,
    "",
    `## Scope`,
    `- ${input.userStories.length} user stories`,
    `- ${cases.length} planned test cases`,
    `- ${input.observations?.length ?? 0} exploratory observations`,
    "",
    `## Coverage`,
    `- Happy path: ${cases.filter((c) => c.category === "happy_path").length}`,
    `- Negative: ${cases.filter((c) => c.category === "negative").length}`,
    `- Edge: ${cases.filter((c) => c.category === "edge").length}`,
    "",
    `## Test Cases`,
    "",
    ...cases.map(
      (c, i) =>
        `### ${i + 1}. ${c.title}\n- **Priority:** ${c.priority}\n- **Story:** ${c.storyRef ?? "-"}\n- **Preconditions:** ${c.preconditions}\n- **Steps:**\n${c.steps.map((s) => `  1. ${s}`).join("\n")}\n- **Expected:** ${c.expectedResult}\n`
    ),
  ].join("\n");

  return {
    planMarkdown: planMd,
    cases,
    coverageSummary: `${cases.length} cases across ${input.userStories.length} stories (${input.observations?.length ?? 0} exploratory observations included).`,
  };
}
