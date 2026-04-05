import type { HealerInput, HealerOutput, HealAction } from "./test-healer.js";

export function mockHealFailures(input: HealerInput): HealerOutput {
  const healed: HealAction[] = [];
  const unresolved: Array<{ filename: string; testName: string; reason: string }> = [];

  for (const failure of input.failures) {
    const err = failure.error.toLowerCase();

    if (err.includes("selector") || err.includes("locator") || err.includes("not found")) {
      healed.push({
        filename: failure.filename,
        testName: failure.testName,
        originalError: failure.error,
        fix: 'Updated selector to use a more resilient locator (data-testid or role-based)',
        patchedContent: input.scripts
          .find((s) => s.filename === failure.filename)
          ?.content.replace(/#[\w-]+/g, '[data-testid="element"]') ?? "",
        confidence: 0.82,
      });
    } else if (err.includes("timeout")) {
      healed.push({
        filename: failure.filename,
        testName: failure.testName,
        originalError: failure.error,
        fix: "Increased timeout and added explicit wait for element",
        patchedContent: input.scripts
          .find((s) => s.filename === failure.filename)
          ?.content.replace(/waitFor\((\d+)\)/, "waitFor(15000)") ?? "",
        confidence: 0.75,
      });
    } else {
      unresolved.push({
        filename: failure.filename,
        testName: failure.testName,
        reason: `Unable to auto-heal: ${failure.error.slice(0, 120)}`,
      });
    }
  }

  return {
    healed,
    unresolved,
    attempts: 1,
    allPassing: unresolved.length === 0 && input.failures.length > 0,
  };
}
