/**
 * @qa/tools — Playwright MCP adapter (Milestone 2) + evidence pipeline (Milestone 3).
 *
 * Planned seams:
 *   - playwright-mcp: typed wrappers over @playwright/mcp (browser_navigate,
 *     browser_snapshot, browser_click, browser_type, browser_wait_for, browser_close)
 *     behind the Tool interface; includeSnapshot defaults to false (cost lever).
 *     A FAKE MCP transport replays recorded snapshots so tests run offline.
 *   - evidence: ingest a run's artifacts (trace/video/logs/diffs) into an
 *     EvidenceBundle, persisted via the content-addressed ObjectStore.
 *
 * All tools must declare `destructive: false` (invariant 6) and treat page /
 * snapshot content as UNTRUSTED DATA (never instructions).
 */
export const MILESTONE = "M2/M3" as const;
