# Deploying on Vercel

The landing site deploys straight from the **repository root**. A root
`vercel.json` builds `apps/landing` and serves it, so you do not need to set a
Root Directory or any custom build commands in the dashboard.

## Landing site (the simple path)

1. In Vercel, **Add New Project** and import `umarsaeed28/shipgate`.
2. Leave **Root Directory** as the default (the repository root, `./`).
3. Leave Build and Install commands as default (the root `vercel.json` handles them).
4. Add the environment variable `DATABASE_URL` (needed for lead capture).
5. Click **Deploy**.

That is it. The root `vercel.json`:

- installs the monorepo with `pnpm install`
- runs `prisma generate`
- builds `apps/landing` and serves its `.next` output

Routes:

- `/` — home page
- `/onboarding` — client questionnaire
- `/api/lead` — lead capture (needs `DATABASE_URL`)

## Verify you deployed the right thing

After deploy, the home page browser tab title must be:

**Shipgate QA — AI-managed quality assurance**

If you still see **Create Next App** or a generic Next.js starter, the Vercel
project is connected to the wrong repository or branch. Delete the project, then
re-import `umarsaeed28/shipgate` on the `main` branch with default settings.

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
