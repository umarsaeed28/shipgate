#!/usr/bin/env node
import { MILESTONE as appModelMilestone } from "@qa/app-model";
import { createToolDispatcher } from "@qa/agents";

/**
 * apps/cli — thin entrypoint that wires the packages together. It deliberately
 * contains no business logic; it just exposes the capability as the milestones
 * land. For M0 it reports what is wired and what is stubbed.
 */
function main(): void {
  // Touch the wiring so the dependency graph is exercised at build time.
  const dispatcher = createToolDispatcher([], new Map());
  void dispatcher;

  console.log("qa — embedded agentic QA capability");
  console.log("Milestone 0 scaffold is in place.");
  console.log(`App Model substrate: pending (${appModelMilestone}).`);
  console.log("Agents: tool-allowlist dispatch wired; Triager (M4) and Self-Healer (M5) pending.");
}

main();
