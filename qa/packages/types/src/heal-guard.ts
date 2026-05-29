import type { HealProposal } from "./heal.js";
import type { Test } from "./test.js";
import { type Result, err, ok } from "./result.js";

/**
 * INVARIANT 1 (validation half). Two deterministic guards back the structural
 * guarantee in ./heal.ts:
 *
 *   - `applyHeal` rebuilds a Test by editing ONLY the locator/navigation side.
 *     It physically reuses the original `oracle` object, so applying a heal can
 *     never alter assertions.
 *
 *   - `assertOracleUnchanged` re-checks, at the validation layer, that a
 *     proposed/healed Test's oracle is byte-identical to the original. Any
 *     difference is rejected and must be re-routed to a human as a suspected
 *     bug. This is the defense that fires even if a future bug tried to smuggle
 *     an assertion change through.
 */

export type HealRejection = {
  reason: "assertion-change-detected";
  detail: string;
  /** Suspected bug => surface to a human (invariants 1 & 5). */
  reroute: "human-suspected-bug";
};

/** Stable structural comparison of the oracle (order-sensitive on assertions). */
const oracleKey = (t: Test): string => JSON.stringify(t.oracle);

/**
 * Apply a HealProposal's locator/navigation edits. The returned Test shares the
 * exact original `oracle` — assertions are structurally untouchable here.
 */
export function applyHeal(test: Test, proposal: HealProposal): Test {
  const navigation = test.locator.navigation.map((step) => ({ ...step }));

  for (const edit of proposal.edits) {
    const step = navigation[edit.stepIndex];
    if (step === undefined) {
      throw new Error(
        `HealProposal references missing navigation step ${edit.stepIndex}`,
      );
    }
    if (edit.kind === "locator") {
      navigation[edit.stepIndex] = { ...step, locator: edit.after };
    } else {
      // navigation-step edit: replace the whole step, but the oracle is never in scope.
      navigation[edit.stepIndex] = { ...edit.after };
    }
  }

  return {
    ...test,
    locator: { navigation },
    // Reuse the ORIGINAL oracle by reference — a heal can never change it.
    oracle: test.oracle,
  };
}

/**
 * Validation-layer guard. Rejects any (original, healed) pair whose oracle
 * differs, re-routing to a human as a suspected bug.
 */
export function assertOracleUnchanged(
  original: Test,
  healed: Test,
): Result<Test, HealRejection> {
  if (oracleKey(original) !== oracleKey(healed)) {
    return err({
      reason: "assertion-change-detected",
      detail:
        "Healed test's oracle differs from the original. Heals may only change " +
        "locators/navigation; assertion changes are re-routed to a human.",
      reroute: "human-suspected-bug",
    });
  }
  return ok(healed);
}

/**
 * Convenience: apply + validate in one deterministic step. Always safe because
 * `applyHeal` reuses the original oracle, but we still run the validator so the
 * guarantee is enforced at the validation layer, not merely by construction.
 */
export function applyAndValidateHeal(
  test: Test,
  proposal: HealProposal,
): Result<Test, HealRejection> {
  const healed = applyHeal(test, proposal);
  return assertOracleUnchanged(test, healed);
}
