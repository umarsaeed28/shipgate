import { z } from "zod";

/**
 * How an element is found. This is the LOCATOR side of the world — the
 * Self-Healer is allowed to change these. It never carries an expected value.
 */
export const LocatorStrategy = z.enum([
  "role",
  "testId",
  "label",
  "text",
  "altText",
  "placeholder",
  "title",
  "css",
  "xpath",
]);
export type LocatorStrategy = z.infer<typeof LocatorStrategy>;

export const Locator = z.object({
  strategy: LocatorStrategy,
  value: z.string(),
  /** Accessible name to disambiguate role-based locators. */
  name: z.string().optional(),
  /** Index when multiple nodes match. */
  nth: z.number().int().nonnegative().optional(),
});
export type Locator = z.infer<typeof Locator>;

/**
 * Stable semantic identity used for fingerprinting (role + accessible name +
 * structural position). Fingerprinting itself is implemented in @qa/app-model.
 */
export const SemanticIdentity = z.object({
  role: z.string(),
  accessibleName: z.string(),
  /** Structural position descriptor (e.g. role-path) — stable across CSS churn. */
  structuralPath: z.string().optional(),
  ordinal: z.number().int().nonnegative().optional(),
});
export type SemanticIdentity = z.infer<typeof SemanticIdentity>;

export const LocatorSource = z.enum(["snapshot", "existing-test", "heal"]);
export type LocatorSource = z.infer<typeof LocatorSource>;

export const LocatorHistoryEntry = z.object({
  locator: Locator,
  appVersionId: z.string(),
  observedAt: z.string().datetime(),
  source: LocatorSource,
});
export type LocatorHistoryEntry = z.infer<typeof LocatorHistoryEntry>;

/**
 * A node in the App Model's semantic locator graph.
 */
export const Element = z.object({
  id: z.string(),
  screenId: z.string().optional(),
  semanticIdentity: SemanticIdentity,
  /** Content-addressed fingerprint over role + accessible name + structure. */
  fingerprint: z.string(),
  /** Ordered history of how this element has been located across app versions. */
  locatorHistory: z.array(LocatorHistoryEntry),
  /** Semantic purpose tags, e.g. "submit", "login-button". */
  intentTags: z.array(z.string()),
});
export type Element = z.infer<typeof Element>;
