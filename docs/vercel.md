# Deploying on Vercel

This repo is a pnpm monorepo. Each Next.js app must be its own Vercel project with
the correct **Root Directory**. If Root Directory is wrong, the build may succeed
but the site returns `404: NOT_FOUND` or shows the default "Create Next App"
page instead of Shipgate.

## Verify you deployed the right project

After deploy, the home page title must be:

**Shipgate QA — AI-managed quality assurance**

If you see **Create Next App** or a generic Next.js starter, the Vercel project is
connected to the wrong repository, wrong branch, or the Root Directory is not set
to `apps/landing`. Fix the project settings below and redeploy.

## Landing site (marketing + onboarding)

Create a Vercel project from the `umarsaeed28/shipgate` repo with:

| Setting | Value |
|---------|-------|
| **Root Directory** | `apps/landing` |
| **Framework Preset** | Next.js |
| **Build Command** | leave default (`pnpm run build` / `next build`) |
| **Install Command** | leave default (Vercel runs `pnpm install` from the repo root) |

Do **not** override Install Command with `cd ../..` — Vercel already installs from
the monorepo root and that override breaks the install path.

Routes:

- `/` — home page
- `/onboarding` — client questionnaire
- `/api/lead` — lead capture (needs `DATABASE_URL`)

- `/` — home page
- `/onboarding` — client questionnaire
- `/api/lead` — lead capture (needs `DATABASE_URL`)

### Required environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Postgres connection string for lead capture |
| `CLIENT_SLUG` | Optional; defaults to `acme` |

Optional:

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_APP_DEMO_URL` | Link for "Open a demo workspace" (set before build) |

## Client app (per client workspace)

Create a **separate** Vercel project with:

| Setting | Value |
|---------|-------|
| **Root Directory** | `apps/app` |
| **Framework Preset** | Next.js |

`apps/app/vercel.json` sets `APP_BASE_PATH` to empty so the app is served at `/`
on its own Vercel domain (not `/app-acme`). Local dev still uses `/app-<slug>`.

### Required environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | That client's Postgres database |
| `AUTH_SECRET` | Session signing secret |
| `CLIENT_SLUG` | That client's slug, e.g. `acme` |

## Common 404 causes

1. **Root Directory not set** — Vercel builds from the repo root; Next.js output
   lands in `apps/landing/.next` but Vercel looks for `.next` at the root → 404.
   Fix: set Root Directory to `apps/landing` (or `apps/app`).

2. **Wrong project for the URL** — The client app on Vercel is at `/` on its own
   domain. Locally it is at `/app-acme`. Do not open the landing URL expecting
   the workspace app.

3. **Missing `DATABASE_URL`** — Build may pass but API routes fail at runtime.
   Set `DATABASE_URL` in the Vercel project Environment Variables.

## Redeploy

After changing Root Directory or env vars, trigger a new deployment from the
Vercel dashboard (Deployments → Redeploy).
