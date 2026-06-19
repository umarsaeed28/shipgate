# AI QA Platform (MVP)

An AI-powered managed-QA platform. The agency runs it for clients; a human QA
lead supervises Claude-driven agents per client.

- **Backbone:** Claude (agent reasoning) + CodeceptJS-on-Playwright (web test
  execution) + a Postgres history store (every run, failure, classification, and
  human decision).
- **Deployment:** one shared landing site at `/`; the app deploys **once per
  client** — same code, parameterized by `CLIENT_SLUG` + that client's own
  database, reached at `/app-<slug>`. One instance = one client, so tenant
  isolation is by construction.
- **Roles:** `client`, `qa_lead`, `admin`. Enforced server-side via
  `requireRole()` in `@qa/auth`.

See `.cursor/rules/qa-platform.mdc` for the guardrails every change must obey.

## Layout

```
apps/landing                 Shared marketing site (/) + lead capture
apps/app                     Per-client workspace (/app-<slug>)
apps/worker                  Job-queue worker (runs agent tasks) + scheduler
packages/platform/auth       Roles + server-side requireRole()
packages/platform/store      Prisma client + history-store helpers (@qa/store)
packages/platform/crypto     AES-256-GCM secret encryption (@qa/crypto)
packages/platform/llm        Claude client + versioned prompts + mock provider
packages/platform/schemas    Zod schemas for agent output
packages/platform/mcp        Atlassian client (Jira/Confluence) + mock
packages/platform/connectors Bitbucket read-only connector + mock
packages/platform/queue      Postgres-backed job queue (@qa/queue)
packages/agents/scenario-writer    Agent 1 (built)
packages/agents/regression-analyzer Agent 2 (scaffold)
packages/agents/trend-analyzer      Agent 3 (scaffold)
packages/test-runner         CodeceptJS-on-Playwright runner + suite runner
config/client.ts             Per-instance config (reads CLIENT_SLUG)
prisma/                      Schema + migrations (the history store)
scripts/new-client.ts        Provision a new client (db + migrate + seed)
scripts/enqueue.ts           Enqueue a worker job (manual/CI)
```

## Prerequisites

- Node 20+
- pnpm 10+
- A running PostgreSQL 14+
- Playwright Chromium (`pnpm exec playwright install chromium`) for the test runner

## Setup

```bash
pnpm install
cp .env.example .env        # fill in real values; .env is gitignored
pnpm db:migrate             # create/sync the dev database
pnpm db:generate            # generate the Prisma client
pnpm exec playwright install chromium
pnpm dev                    # landing on :3000, app on :3100/app-<slug>
pnpm worker                 # (separate shell) drains the job queue
```

- Landing: <http://localhost:3000>
- App: <http://localhost:3100/app-acme>

## Vercel

See [docs/vercel.md](docs/vercel.md). Set **Root Directory** to `apps/landing` for
the marketing site or `apps/app` for a client workspace. A missing Root Directory
is the usual cause of `404: NOT_FOUND` after a successful build.

## Agents & the queue

Agent tasks run through a Postgres-backed queue drained by `apps/worker`:

```bash
pnpm worker                 # long-running worker (+ optional scheduler)
pnpm worker:once            # drain all queued jobs once, then exit (CI/demos)

# Enqueue jobs manually:
pnpm tsx scripts/enqueue.ts draft_scenarios '{"storyKey":"FB-101","prId":42}'
pnpm tsx scripts/enqueue.ts run_suite '{"baseUrl":"https://staging.example.com"}'
```

- **Agent 1** (built): in the **Review** screen (qa_lead/admin), draft scenarios
  from a Jira story, approve/automate, and the worker writes + runs a CodeceptJS
  test against the staging URL.
- **Agent 2** (scaffold): `POST /app-<slug>/api/jenkins/webhook` ingests a JUnit
  report into Run/Failure rows and auto-classifies each failure.
- **Agent 3** (scaffold): `POST /app-<slug>/api/agent3/chat` answers strictly
  from queried history rows; the **Trends** screen renders deterministic charts.

When `ANTHROPIC_API_KEY` is unset/placeholder, `@qa/llm` uses an offline mock
provider so the whole pipeline runs locally without a live key.

## Provision another client

```bash
pnpm new-client <slug> "Display Name"
```

Creates `qa_<slug>`, migrates it, seeds the client + an admin user, and prints
the env block to deploy that instance with.

## Build steps

1. **Scaffold:** monorepo, both Next apps, Prisma schema + migration, auth +
   roles, role-gated screen stubs, `new-client`.
2. **Settings & connections:** encrypted connection tokens, admin-only agent
   config (403 server-side for everyone else).
3. **Claude + Atlassian MCP + Bitbucket + Agent 1:** the core end-to-end flow.
4. **Results surfaces + CI/run plumbing:** Coverage / Tests / Failures from the
   history store; scheduled CodeceptJS runs.
5. **Agents 2 & 3 scaffold:** Jenkins ingestion + classify; trend queries + chat.
