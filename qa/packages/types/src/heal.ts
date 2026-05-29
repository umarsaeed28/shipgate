import { z } from "zod";
import { Locator } from "./element.js";
import { NavigationStep } from "./test.js";

/**
 * INVARIANT 1 (structural half). A HealProposal can ONLY express edits to the
 * locator/navigation side of a Test. The edit union below is CLOSED over
 * { locator, navigation-step }. There is intentionally NO variant that targets
 * an assertion/oracle — so a heal cannot represent an assertion change *at the
 * type level*. The validation half lives in ./heal-guard.ts.
 */

export const LocatorEdit = z.object({
  kind: z.literal("locator"),
  stepIndex: z.number().int().nonnegative(),
  before: Locator,
  after: Locator,
});
export type LocatorEdit = z.infer<typeof LocatorEdit>;

export const NavigationEdit = z.object({
  kind: z.literal("navigation-step"),
  stepIndex: z.number().int().nonnegative(),
  before: NavigationStep,
  after: NavigationStep,
});
export type NavigationEdit = z.infer<typeof NavigationEdit>;

/** Closed union — only locator/navigation edits exist. */
export const HealEdit = z.discriminatedUnion("kind", [LocatorEdit, NavigationEdit]);
export type HealEdit = z.infer<typeof HealEdit>;

/**
 * Tiered gate (see invariant 6 / Milestone 5):
 *  - auto-apply           : high confidence + corroborated
 *  - human-review         : medium confidence
 *  - escalate-suspected-bug: meaning changed / no equivalent / conflict
 */
export const HealTier = z.enum([
  "auto-apply",
  "human-review",
  "escalate-suspected-bug",
]);
export type HealTier = z.infer<typeof HealTier>;

export const HealCorroboration = z.object({
  semanticEquivalentPresent: z.boolean(),
  prDeployCorrelated: z.boolean(),
  crossTestCorroborated: z.boolean(),
});
export type HealCorroboration = z.infer<typeof HealCorroboration>;

export const HealProposal = z.object({
  id: z.string(),
  testId: z.string(),
  elementId: z.string().optional(),
  /** Only locator/navigation edits can ever appear here. */
  edits: z.array(HealEdit).min(1),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  tier: HealTier,
  corroboration: HealCorroboration,
});
export type HealProposal = z.infer<typeof HealProposal>;

/**
 * INVARIANT 1 — build-time proof. This file fails to compile (and thus
 * `pnpm -r build` fails) if a future edit ever adds an assertion/oracle variant
 * to the HealEdit union. `Extract<...>` must collapse to `never`.
 */
type AssertNever<T extends never> = T;
type _HealEditCannotTargetAssertions = AssertNever<
  Extract<HealEdit["kind"], "assertion" | "oracle" | "expected">
>;
export type _HealEditClosedOverLocatorAndNavigation =
  _HealEditCannotTargetAssertions;
