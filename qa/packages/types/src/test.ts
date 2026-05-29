import { z } from "zod";
import { Locator } from "./element.js";

/**
 * INVARIANT 1 — the central structural separation of this codebase.
 *
 * A Test has TWO disjoint parts:
 *   - `locator`: HOW to find elements and drive the app (navigation). Heal-able.
 *   - `oracle` : WHAT the test asserts (expected values). NEVER touched by a heal.
 *
 * These live in separate fields and separate schemas so that a HealProposal
 * (see ./heal.ts) is *structurally incapable* of expressing an assertion change.
 */

export const NavigationAction = z.enum([
  "navigate",
  "click",
  "type",
  "select",
  "press",
  "waitFor",
]);
export type NavigationAction = z.infer<typeof NavigationAction>;

/**
 * A single step in driving the app. Carries a locator (how to find the target)
 * and an input value used to PERFORM the action — never an expected/asserted value.
 */
export const NavigationStep = z.object({
  index: z.number().int().nonnegative(),
  action: NavigationAction,
  locator: Locator.optional(),
  /** For `navigate`. */
  url: z.string().optional(),
  /** Input typed/selected/pressed — an action input, not an assertion. */
  value: z.string().optional(),
  /** Links this step to an App Model element by intent. */
  intentTag: z.string().optional(),
});
export type NavigationStep = z.infer<typeof NavigationStep>;

export const TestLocatorPart = z.object({
  navigation: z.array(NavigationStep),
});
export type TestLocatorPart = z.infer<typeof TestLocatorPart>;

export const AssertionKind = z.enum([
  "toHaveText",
  "toBeVisible",
  "toHaveValue",
  "toHaveURL",
  "toHaveCount",
  "custom",
]);
export type AssertionKind = z.infer<typeof AssertionKind>;

/**
 * The ORACLE. The `expected` value lives ONLY here. A heal can never produce a
 * change to this object (enforced by HealProposal's closed edit union + the
 * validation layer in ./heal-guard.ts).
 */
export const Assertion = z.object({
  index: z.number().int().nonnegative(),
  kind: AssertionKind,
  /** Intent tag of the element under assertion (a reference, not a locator). */
  target: z.string().optional(),
  expected: z.unknown(),
});
export type Assertion = z.infer<typeof Assertion>;

export const TestOraclePart = z.object({
  assertions: z.array(Assertion),
});
export type TestOraclePart = z.infer<typeof TestOraclePart>;

export const Test = z.object({
  id: z.string(),
  scenarioId: z.string().optional(),
  title: z.string(),
  appVersionId: z.string(),
  /** Heal-able. */
  locator: TestLocatorPart,
  /** NEVER touched by a heal. */
  oracle: TestOraclePart,
});
export type Test = z.infer<typeof Test>;
