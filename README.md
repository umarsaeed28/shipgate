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
apps/landing                 Shared marketing site (/)
apps/app                     Per-client workspace (/app-<slug>)
packages/platform/auth       Roles + server-side requireRole()
packages/platform/store      Prisma client + history-store helpers (@qa/store)
packages/platform/llm        Claude client                (Step 3)
packages/platform/schemas    Zod schemas for agent output (Step 3)
packages/platform/mcp        Atlassian MCP client         (Step 3)
packages/platform/connectors Bitbucket read-only connector(Step 3)
packages/agents/*            Scenario writer / regression / trend agents
packages/test-runner         CodeceptJS runner            (Step 4)
config/client.ts             Per-instance config (reads CLIENT_SLUG)
prisma/                      Schema + migrations (the history store)
scripts/new-client.ts        Provision a new client (db + migrate + seed)
```

## Prerequisites

- Node 20+
- pnpm 10+
- A running PostgreSQL 14+

## Setup

```bash
pnpm install
cp .env.example .env        # fill in real values; .env is gitignored
pnpm db:migrate             # create/sync the dev database
pnpm db:generate            # generate the Prisma client
pnpm dev                    # landing on :3000, app on :3100/app-<slug>
```

- Landing: <http://localhost:3000>
- App: <http://localhost:3100/app-acme>

## Provision another client

```bash
pnpm new-client <slug> "Display Name"
```

Creates `qa_<slug>`, migrates it, seeds the client + an admin user, and prints
the env block to deploy that instance with.

## Build steps

1. **Step 1 (this scaffold):** monorepo, both Next apps, Prisma schema +
   migration, auth + roles, role-gated screen stubs, `new-client`.
2. Settings & connections
3. Claude + Jira MCP + Agent 1 (the core)
4. Results surfaces + CI/run plumbing
5. Scaffold Agents 2 & 3
