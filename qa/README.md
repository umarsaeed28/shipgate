# qa-platform — embedded agentic QA capability

AI agents that drop into a partner's existing CI/CD and source control and drive their web app
under test via Playwright MCP. See `.cursor/rules/` (at the repo root) for the binding project
context and the seven non-negotiable invariants.

This is an **isolated nested pnpm workspace** (its own `pnpm-workspace.yaml`) so it builds and
tests independently of the surrounding `shipgate` packages.

## Packages

| Package           | Purpose                                                                 | Milestone |
| ----------------- | ----------------------------------------------------------------------- | --------- |
| `@qa/types`       | zod schemas + inferred types + injected interfaces (single source).     | M0        |
| `@qa/app-model`   | Versioned semantic locator graph; fingerprinting; cross-version match.  | M1 (stub) |
| `@qa/tools`       | Playwright MCP adapter; evidence pipeline.                              | M2/M3 (stub) |
| `@qa/agents`      | Agent pattern + tool-allowlist enforcement; Triager; Self-Healer.       | M0/M4/M5  |
| `@qa/runner`      | Typed, idempotent in-process Runner (Temporal adapter is a future seam).| M0 (stub) |
| `@qa/gateway`     | Provider-agnostic model gateway; pinned snapshots; response cache.      | M6 (stub) |
| `@qa/eval`        | Replays golden trajectories and gates promotion.                        | M6 (stub) |
| `apps/cli`        | Thin entrypoint that wires packages together.                           | M0 (stub) |

## Quick start

```bash
pnpm install
pnpm -r build && pnpm -r test
docker compose up -d        # Postgres + pgvector, MinIO (local dev only)
```

## Invariants (summary — see `.cursor/rules/10-invariants.mdc` for the binding text)

1. Self-Healer never touches assertions (enforced structurally + tested).
2. Deterministic shell, LLM core.
3. Record everything (replayable trajectories).
4. Idempotency + content addressing.
5. Triager abstains (`needs_human`).
6. Safe blast radius (PR-only writes; no destructive tools; app content is untrusted data).
7. Repeatability is gated by the eval harness.
