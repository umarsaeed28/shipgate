# Shipgate Regression Analyzer

An end-to-end QA automation and run analysis demo platform. Includes a mortgage calculator app, CodeceptJS+Playwright test framework, Jenkins pipeline, Allure reporting, analysis agents, and an operations dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shipgate Regression Analyzer                  │
├──────────┬──────────┬───────────┬───────────┬──────────────────┤
│ Mortgage │ Analysis │ Analysis  │ Scheduler │    Jenkins       │
│   App    │   API    │    UI     │  Worker   │   Pipeline       │
│ :3099    │ :4000    │ :5173     │ (cron)    │   (nightly)      │
├──────────┴──────────┴───────────┴───────────┴──────────────────┤
│                        Agent Layer                              │
│  TestConductor · RunIngestion · RegressionAnalyzer · Summary   │
├─────────────────────────────────────────────────────────────────┤
│                     Integration Layer                           │
│            Jenkins Adapter · Allure Reader                      │
├─────────────────────────────────────────────────────────────────┤
│                      Data / Storage                             │
│           File-based JSON store · PostgreSQL (optional)         │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js >= 20
- pnpm >= 9

### 1. Install dependencies

```bash
pnpm install
```

### 2. Install app-specific dependencies

```bash
cd apps/mortgage-app && pnpm install && cd ../..
cd apps/analysis-ui && pnpm install && cd ../..
cd apps/scheduler-worker && pnpm install && cd ../..
```

### 3. Start the demo (3 terminals or use the combined command)

```bash
# Terminal 1: Mortgage Calculator App
pnpm dev:mortgage

# Terminal 2: Analysis API (auto-seeds demo data on first run)
pnpm dev:api

# Terminal 3: Analysis Dashboard UI
pnpm dev:analysis-ui
```

Or run all together:
```bash
pnpm dev
```

### 4. Open in browser

| Service | URL |
|---------|-----|
| Mortgage Calculator | http://localhost:3099 |
| Analysis Dashboard | http://localhost:5173 |
| Analysis API | http://localhost:4000 |

## Demo Walkthrough

### Step 1: View the Mortgage Calculator
Open http://localhost:3099. Fill in mortgage details and calculate. Toggle Demo Mode to simulate bugs and delays.

### Step 2: View the Analysis Dashboard
Open http://localhost:5173. The dashboard auto-seeds with demo data showing:
- 5 Jenkins builds (builds #45-49)
- 8 classified failures across builds
- 3 analysis summaries with root cause analysis
- Agent status and scheduler config

### Step 3: Simulate a Jenkins Webhook

```bash
curl -X POST http://localhost:4000/api/regression/webhooks/jenkins \
  -H "Content-Type: application/json" \
  -d '{"buildNumber": 50, "jobName": "shipgate-e2e", "status": "FAILURE"}'
```

### Step 4: Trigger Manual Analysis

```bash
curl -X POST http://localhost:4000/api/regression/analyze-latest
```

Or click "Run Analysis Now" on the Overview page.

### Step 5: Run Tests (optional, requires mortgage app running)

```bash
cd tests/e2e
npm install
npm run test:smoke
```

### Step 6: Start the Scheduler Worker

```bash
pnpm dev:scheduler
```

The scheduler polls every 5 minutes for unprocessed builds.

## Project Structure

```
shipgate/
├── apps/
│   ├── mortgage-app/        # React+Vite mortgage calculator (SUT)
│   ├── api/                 # Fastify analysis API backend
│   ├── analysis-ui/         # React+Vite analysis dashboard
│   ├── scheduler-worker/    # Cron-based dormancy controller
│   ├── web/                 # Next.js control center (legacy)
│   └── worker/              # BullMQ worker (legacy)
├── packages/
│   ├── agents/              # Agent implementations
│   │   ├── regression-analyzer.ts    # Failure classification
│   │   ├── run-ingestion.ts          # Data normalization
│   │   ├── summary-generator.ts      # Report generation
│   │   ├── test-conductor-orchestrator.ts  # Workflow orchestration
│   │   └── dormancy-controller.ts    # Sleep/wake control
│   ├── integrations/        # External service adapters
│   │   ├── jenkins-adapter.ts        # Jenkins build reader
│   │   └── allure-reader.ts          # Allure results parser
│   ├── shared/              # Shared types and DTOs
│   └── database/            # Prisma schema + seed
├── tests/
│   └── e2e/                 # CodeceptJS + Playwright tests
│       ├── smoke/           # Smoke test suite
│       ├── regression/      # Full regression suite
│       ├── pages/           # Page objects
│       └── data/            # Test fixtures
├── infra/
│   ├── scripts/             # Setup and simulation scripts
│   └── docker/              # Docker compose configs
├── Jenkinsfile              # CI/CD pipeline definition
└── .jenkins/                # Jenkins config templates
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/regression/overview | Dashboard metrics |
| GET | /api/regression/runs | List test runs |
| GET | /api/regression/runs/:id | Run details with failures |
| GET | /api/regression/failures | Failures with filters |
| GET | /api/regression/summaries | Analysis reports |
| GET | /api/regression/agent-status | Agent state |
| GET | /api/regression/settings | Configuration |
| POST | /api/regression/settings | Update config |
| POST | /api/regression/webhooks/jenkins | Ingest build |
| POST | /api/regression/analyze-latest | Trigger analysis |
| GET | /api/regression/builds | List Jenkins builds |

## Failure Classification

The Shipgate Regression Analyzer classifies failures into:

| Classification | Description |
|---------------|-------------|
| **BUG / product_bug** | Business logic regression, wrong calculation, assertion mismatch |
| **TEST_SCRIPT_ISSUE / test_bug** | Outdated selector, wrong test assumption, stale element |
| **TIMEOUT** | Element wait timeout, navigation timeout, slow response |
| **INFRASTRUCTURE / environment** | Connection refused, browser crash, port conflict |
| **UNKNOWN / flaky** | Low confidence, conflicting signals, needs review |

## MCP Readiness

The architecture supports future Playwright MCP and Cursor MCP integration:
- Structured automation artifacts
- Normalized run ingestion
- Abstracted integration contracts
- Independent analysis logic
- Agent interfaces ready for MCP tool injection

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Mortgage App | React 18, Vite, TypeScript, Tailwind CSS |
| Analysis UI | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, Recharts |
| Analysis API | Fastify 5, TypeScript, file-based JSON store |
| Test Framework | CodeceptJS, Playwright, Allure |
| Scheduler | node-cron, TypeScript |
| CI/CD | Jenkins, Docker |
| Monorepo | pnpm workspaces |
