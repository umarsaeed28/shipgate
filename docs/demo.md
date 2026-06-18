# Running the public demo

A self contained, read only demo of the Shipgate workspace, seeded with
synthetic data. It runs Postgres, the landing site, and the app, with every
mutation disabled so it is safe to expose publicly.

```
landing  ->  http://localhost:3000
app      ->  http://localhost:3100/app-acme
```

## Quick start (Docker)

```bash
docker compose -f docker-compose.demo.yml up --build
```

This will:

1. Start Postgres and wait for it to be healthy.
2. Apply migrations (`prisma migrate deploy`) and seed demo data (`seed:demo`).
3. Serve the landing site on `:3000` and the app on `:3100/app-acme`.

Open `http://localhost:3100/app-acme`. Use the role switcher in the top bar to
view the workspace as a client, QA lead, or admin. Everything is read only.

To stop and wipe the demo database:

```bash
docker compose -f docker-compose.demo.yml down -v
```

## What read only mode does

`DEMO_MODE=1` blocks every data mutation on the server, not just in the UI:

- Review actions (request scenarios, approve/discard) are disabled.
- Settings actions (connections, staging URL, agent config) are disabled.
- The agent config and Jenkins webhook POST routes return 403.
- Role switching stays enabled so visitors can explore each role.

Because nothing mutates, the app never calls Bedrock, Jira, or Bitbucket in the
demo, and no worker is required.

## What the demo data shows

`pnpm seed:demo` populates the `acme` client with:

- Scenarios across six stories, with a mix of automated, pending review, kept,
  and discarded statuses (so Coverage and Review look real).
- Generated CodeceptJS tests with passing and failing results.
- A run history spanning roughly two weeks with a rising pass rate (Trends).
- Classified failures (real defect, test issue, flaky) with evidence links.
- Connected Jira, Bitbucket, and Confluence integrations (no real tokens).
- A slice of the append only event feed with correlation ids.

Re-running the seed is idempotent: it clears the agent data tables and rebuilds
the same dataset.

## Hosting the demo

The image is a plain monorepo build, so it runs anywhere that can run a
container (Render, Railway, Fly.io, a VPS, ECS). Two notes:

- `NEXT_PUBLIC_APP_DEMO_URL` is inlined into the landing bundle at build time.
  For a hosted demo, build with the public app URL:

  ```bash
  docker build -f infra/docker/Dockerfile.demo \
    --build-arg NEXT_PUBLIC_APP_DEMO_URL=https://demo.example.com/app-acme \
    -t shipgate-demo .
  ```

- The app is served under the `APP_BASE_PATH` (default `/app-acme`). Put it
  behind your reverse proxy or domain accordingly, and keep `DEMO_MODE=1`.

## Local (without Docker)

With a local Postgres and a `.env` containing `CLIENT_SLUG`, `DATABASE_URL`, and
`APP_BASE_PATH`:

```bash
pnpm db:deploy
pnpm seed:demo
DEMO_MODE=1 pnpm dev   # landing :3000, app :3100/app-acme
```
