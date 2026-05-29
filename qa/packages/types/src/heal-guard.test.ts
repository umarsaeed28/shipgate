import { describe, expect, it } from "vitest";
import { HealEdit, HealProposal } from "./heal.js";
import { applyAndValidateHeal, assertOracleUnchanged } from "./heal-guard.js";
import type { Test } from "./test.js";

const baseTest: Test = {
  id: "test-1",
  title: "login shows greeting",
  appVersionId: "app-v1",
  locator: {
    navigation: [
      { index: 0, action: "navigate", url: "/login" },
      {
        index: 1,
        action: "click",
        locator: { strategy: "testId", value: "submit-old" },
        intentTag: "submit",
      },
    ],
  },
  oracle: {
    assertions: [
      { index: 0, kind: "toHaveText", target: "greeting", expected: "Welcome, Sam" },
    ],
  },
};

describe("invariant 1: self-healer never touches assertions", () => {
  it("applies a locator-only heal and leaves the oracle byte-identical", () => {
    const proposal: HealProposal = {
      id: "heal-1",
      testId: baseTest.id,
      edits: [
        {
          kind: "locator",
          stepIndex: 1,
          before: { strategy: "testId", value: "submit-old" },
          after: { strategy: "testId", value: "submit-new" },
        },
      ],
      rationale: "data-testid renamed; semantic equivalent present",
      confidence: 0.95,
      tier: "auto-apply",
      corroboration: {
        semanticEquivalentPresent: true,
        prDeployCorrelated: true,
        crossTestCorroborated: true,
      },
    };

    const result = applyAndValidateHeal(baseTest, proposal);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Locator changed...
    expect(result.value.locator.navigation[1]?.locator?.value).toBe("submit-new");
    // ...oracle is the exact same object, untouched.
    expect(result.value.oracle).toBe(baseTest.oracle);
    expect(JSON.stringify(result.value.oracle)).toBe(JSON.stringify(baseTest.oracle));
  });

  it("rejects and re-routes to a human when the oracle differs", () => {
    const tampered: Test = {
      ...baseTest,
      oracle: {
        assertions: [
          { index: 0, kind: "toHaveText", target: "greeting", expected: "Welcome, Eve" },
        ],
      },
    };

    const result = assertOracleUnchanged(baseTest, tampered);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.reason).toBe("assertion-change-detected");
    expect(result.error.reroute).toBe("human-suspected-bug");
  });

  it("validates a real HealProposal only contains locator/navigation edits", () => {
    const parsed = HealProposal.safeParse({
      id: "heal-2",
      testId: "test-1",
      edits: [
        {
          kind: "navigation-step",
          stepIndex: 0,
          before: { index: 0, action: "navigate", url: "/login" },
          after: { index: 0, action: "navigate", url: "/sign-in" },
        },
      ],
      rationale: "route renamed",
      confidence: 0.8,
      tier: "human-review",
      corroboration: {
        semanticEquivalentPresent: true,
        prDeployCorrelated: false,
        crossTestCorroborated: false,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a HealEdit that tries to target an assertion (closed union)", () => {
    // There is no `assertion` variant in the HealEdit union, so this is invalid
    // both at runtime (below) and at compile time (the @ts-expect-error proof).
    const runtime = HealEdit.safeParse({
      kind: "assertion",
      stepIndex: 0,
      before: { index: 0, kind: "toHaveText", expected: "a" },
      after: { index: 0, kind: "toHaveText", expected: "b" },
    });
    expect(runtime.success).toBe(false);

    // @ts-expect-error — the HealEdit type cannot represent an assertion change.
    const _illegal: HealEdit = {
      kind: "assertion",
      stepIndex: 0,
      before: { index: 0, kind: "toHaveText", expected: "a" },
      after: { index: 0, kind: "toHaveText", expected: "b" },
    };
    void _illegal;
  });
});
