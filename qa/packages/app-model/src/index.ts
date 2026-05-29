import type { Element } from "@qa/types";

/**
 * @qa/app-model — the substrate (Milestone 1, not yet implemented).
 *
 * Planned seams (all deterministic + pure where possible):
 *   - fingerprint(element): stable id over role + accessible name + structure.
 *   - matchAcrossVersions(oldElement, currentNodes): best fingerprint match + score.
 *   - buildFromSnapshot(accessibilityTree) / parseFromExistingTests(files).
 *   - diff(appVersionA, appVersionB): flag changed screens.
 * Plus a Drizzle + Postgres + pgvector schema for App/AppVersion/Screen/Component/Element.
 */

export const MILESTONE = "M1" as const;

export function fingerprint(_element: Pick<Element, "semanticIdentity">): string {
  throw new Error("@qa/app-model.fingerprint is implemented in Milestone 1");
}
