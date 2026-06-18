/**
 * Seed a rich, realistic DEMO dataset for the read-only public demo.
 *
 *   pnpm seed:demo
 *
 * Idempotent: clears the agent data tables and re-seeds the "acme" client with
 * scenarios across several stories, generated tests, a run history with a rising
 * pass rate, classified failures, connections, and a slice of the append-only
 * event feed. All data is synthetic; nothing here calls Bedrock, Jira, or
 * Bitbucket. Pair with DEMO_MODE=1 so the workspace is read-only.
 */
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });

import { randomUUID } from "node:crypto";

const SLUG = process.env.CLIENT_SLUG ?? "acme";
const STAGING_URL = "https://staging.acme-shop.example";

const DAY = 86_400_000;
const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * DAY);

type ScenarioStatus = "pending_review" | "kept" | "discarded" | "automated";
type ScenarioKind = "story_driven" | "code_deviation";
type TestStatus = "passing" | "failing";

interface ScenarioSpec {
  story: string;
  title: string;
  kind: ScenarioKind;
  priority: "high" | "medium" | "low";
  status: ScenarioStatus;
  steps: string[];
  rationale: string;
  commit?: string;
  /** Present when status is "automated": the test's last result. */
  test?: TestStatus;
}

const SCENARIOS: ScenarioSpec[] = [
  // ACME-101 — Checkout
  {
    story: "ACME-101",
    title: "Complete a purchase with a valid card",
    kind: "story_driven",
    priority: "high",
    status: "automated",
    test: "passing",
    steps: [
      "Open the storefront and add an item to the cart",
      "Proceed to checkout and enter valid card details",
      "Confirm the order and verify the confirmation page",
    ],
    rationale: "Primary happy path from the checkout acceptance criteria.",
  },
  {
    story: "ACME-101",
    title: "Reject an expired card at checkout",
    kind: "story_driven",
    priority: "high",
    status: "automated",
    test: "passing",
    steps: [
      "Add an item and proceed to checkout",
      "Enter a card with a past expiry date",
      "Verify a clear validation error and no charge",
    ],
    rationale: "Negative path required by the acceptance criteria.",
  },
  {
    story: "ACME-101",
    title: "Guard tax recalculation when the shipping country changes",
    kind: "code_deviation",
    priority: "medium",
    status: "automated",
    test: "failing",
    commit: "9f3c1ab2d4e5f6a7",
    steps: [
      "Place an item in the cart and open checkout",
      "Switch the shipping country and re-check the tax line",
      "Verify the total updates to match the new tax rate",
    ],
    rationale:
      "The diff touched the tax module; this guards the change beyond the story text.",
  },
  // ACME-102 — Login
  {
    story: "ACME-102",
    title: "Log in with valid credentials",
    kind: "story_driven",
    priority: "high",
    status: "automated",
    test: "passing",
    steps: [
      "Open the login page",
      "Enter valid email and password and submit",
      "Verify the dashboard loads for the signed in user",
    ],
    rationale: "Core authentication happy path.",
  },
  {
    story: "ACME-102",
    title: "Lock the account after five failed attempts",
    kind: "story_driven",
    priority: "high",
    status: "automated",
    test: "failing",
    steps: [
      "Open the login page",
      "Submit an incorrect password five times",
      "Verify the account is locked and a recovery hint is shown",
    ],
    rationale: "Security requirement from the story acceptance criteria.",
  },
  {
    story: "ACME-102",
    title: "Session persists across a page reload",
    kind: "story_driven",
    priority: "medium",
    status: "pending_review",
    steps: [
      "Log in successfully",
      "Reload the page",
      "Verify the user remains signed in",
    ],
    rationale: "Covers session durability noted in the story.",
  },
  // ACME-103 — Search
  {
    story: "ACME-103",
    title: "Search returns relevant products",
    kind: "story_driven",
    priority: "medium",
    status: "automated",
    test: "passing",
    steps: [
      "Open the storefront",
      "Search for a known product name",
      "Verify matching products appear in the results",
    ],
    rationale: "Primary search behavior.",
  },
  {
    story: "ACME-103",
    title: "Filter by price range narrows the results",
    kind: "story_driven",
    priority: "low",
    status: "automated",
    test: "passing",
    steps: [
      "Run a broad search",
      "Apply a price range filter",
      "Verify only products within the range remain",
    ],
    rationale: "Filtering path from the acceptance criteria.",
  },
  {
    story: "ACME-103",
    title: "Empty search shows helpful guidance",
    kind: "story_driven",
    priority: "low",
    status: "kept",
    steps: [
      "Open the storefront",
      "Submit an empty search",
      "Verify a guidance message rather than an error",
    ],
    rationale: "Kept for automation in a later cycle.",
  },
  // ACME-104 — Cart
  {
    story: "ACME-104",
    title: "Adding an item updates the cart count",
    kind: "story_driven",
    priority: "high",
    status: "automated",
    test: "passing",
    steps: [
      "Open a product page",
      "Add the item to the cart",
      "Verify the cart count increments",
    ],
    rationale: "Core cart behavior.",
  },
  {
    story: "ACME-104",
    title: "Removing the last item empties the cart",
    kind: "story_driven",
    priority: "medium",
    status: "automated",
    test: "failing",
    steps: [
      "Add a single item to the cart",
      "Remove that item",
      "Verify the cart shows the empty state",
    ],
    rationale: "Edge case from the acceptance criteria.",
  },
  {
    story: "ACME-104",
    title: "Regression guard for cart totals after the pricing refactor",
    kind: "code_deviation",
    priority: "medium",
    status: "pending_review",
    commit: "1b2c3d4e5f60718a",
    steps: [
      "Add several items with mixed prices",
      "Open the cart and read the subtotal",
      "Verify the subtotal matches the sum of line prices",
    ],
    rationale: "The pricing refactor diff is not fully described by any story.",
  },
  // ACME-110 — Profile
  {
    story: "ACME-110",
    title: "Edit a shipping address",
    kind: "story_driven",
    priority: "medium",
    status: "automated",
    test: "passing",
    steps: [
      "Open the profile addresses page",
      "Edit an existing address and save",
      "Verify the updated address is shown",
    ],
    rationale: "Profile editing happy path.",
  },
  {
    story: "ACME-110",
    title: "Reject an invalid postal code",
    kind: "story_driven",
    priority: "low",
    status: "discarded",
    steps: [
      "Open the address form",
      "Enter an invalid postal code and save",
      "Verify a validation error",
    ],
    rationale: "Discarded in review as a duplicate of an existing test.",
  },
  // ACME-118 — Discounts
  {
    story: "ACME-118",
    title: "Apply a valid discount code",
    kind: "story_driven",
    priority: "high",
    status: "automated",
    test: "passing",
    steps: [
      "Add an item and open the cart",
      "Apply a valid discount code",
      "Verify the discount is reflected in the total",
    ],
    rationale: "Core discount behavior.",
  },
  {
    story: "ACME-118",
    title: "Reject an expired discount code",
    kind: "story_driven",
    priority: "medium",
    status: "pending_review",
    steps: [
      "Open the cart with an item",
      "Apply an expired discount code",
      "Verify a clear message and no discount applied",
    ],
    rationale: "Negative path awaiting review.",
  },
];

interface RunSpec {
  day: number;
  source: "schedule" | "pr" | "jenkins";
  trigger: string;
  passed: number;
  failed: number;
}

const RUNS: RunSpec[] = [
  { day: 12, source: "schedule", trigger: "nightly", passed: 6, failed: 4 },
  { day: 11, source: "schedule", trigger: "nightly", passed: 7, failed: 3 },
  { day: 9, source: "pr", trigger: "PR #214", passed: 8, failed: 3 },
  { day: 8, source: "schedule", trigger: "nightly", passed: 9, failed: 2 },
  { day: 6, source: "jenkins", trigger: "build 1487", passed: 9, failed: 2 },
  { day: 5, source: "schedule", trigger: "nightly", passed: 10, failed: 1 },
  { day: 3, source: "pr", trigger: "PR #231", passed: 11, failed: 1 },
  { day: 2, source: "schedule", trigger: "nightly", passed: 11, failed: 1 },
  { day: 1, source: "schedule", trigger: "nightly", passed: 12, failed: 1 },
  { day: 0, source: "schedule", trigger: "nightly", passed: 12, failed: 1 },
];

async function main() {
  const { prisma } = await import("@qa/store");

  console.log(`▸ Seeding demo data for client "${SLUG}"…`);

  // Clear agent data so re-running gives a clean, deterministic demo.
  await prisma.classification.deleteMany({});
  await prisma.failure.deleteMany({});
  await prisma.run.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.scenario.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.connection.deleteMany({});
  await prisma.agentConfig.deleteMany({});
  await prisma.job.deleteMany({});

  const client = await prisma.client.upsert({
    where: { slug: SLUG },
    update: { name: "Acme Shop", stagingUrl: STAGING_URL },
    create: { slug: SLUG, name: "Acme Shop", stagingUrl: STAGING_URL },
  });

  for (const role of ["admin", "qa_lead", "client"] as const) {
    await prisma.user.upsert({
      where: { email: `${role}@${SLUG}.example` },
      update: {},
      create: { email: `${role}@${SLUG}.example`, role, clientId: client.id },
    });
  }

  // Connections shown as connected (no real tokens in the demo).
  await prisma.connection.createMany({
    data: [
      {
        clientId: client.id,
        type: "jira",
        status: "connected",
        metadata: { siteUrl: "https://acme.atlassian.net", email: "qa@acme.example" },
      },
      {
        clientId: client.id,
        type: "bitbucket",
        status: "connected",
        metadata: { workspace: "acme", repo: "storefront" },
      },
      {
        clientId: client.id,
        type: "confluence",
        status: "connected",
        metadata: { siteUrl: "https://acme.atlassian.net/wiki" },
      },
    ],
  });

  await prisma.agentConfig.create({
    data: {
      key: "agent.defaults",
      value: {
        model: "claude-sonnet-4-6",
        classificationConfidenceThreshold: 0.7,
        maxScenariosPerStory: 8,
      },
      updatedBy: `admin@${SLUG}.example`,
    },
  });


  // Scenarios + tests. Track failing test ids so failures link to real tests.
  const events: { type: string; entityRef: string; payload: unknown; createdAt: Date }[] =
    [];
  const failingTestIds: { id: string; title: string }[] = [];
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);

  let createdAtCursor = 14;
  for (const spec of SCENARIOS) {
    const created = daysAgo(createdAtCursor);
    createdAtCursor = Math.max(0, createdAtCursor - 0.7);

    const scenario = await prisma.scenario.create({
      data: {
        title: spec.title,
        kind: spec.kind,
        priority: spec.priority,
        steps: spec.steps,
        rationale: spec.rationale,
        sourceStoryKey: spec.story,
        sourceCommitSha: spec.kind === "code_deviation" ? spec.commit ?? null : null,
        status: spec.status,
        decisionBy:
          spec.status === "pending_review" ? null : `qa_lead@${SLUG}.example`,
        decisionReason:
          spec.status === "automated"
            ? "Approved for automation"
            : spec.status === "kept"
              ? "Kept"
              : spec.status === "discarded"
                ? "Discarded in review"
                : null,
        decidedAt: spec.status === "pending_review" ? null : created,
        createdAt: created,
      },
    });

    events.push({
      type: "scenario_drafted",
      entityRef: scenario.id,
      payload: { kind: spec.kind, storyKey: spec.story, correlationId: randomUUID() },
      createdAt: created,
    });

    if (spec.status !== "pending_review") {
      events.push({
        type: "scenario_decided",
        entityRef: scenario.id,
        payload: { decision: spec.status, by: `qa_lead@${SLUG}.example` },
        createdAt: created,
      });
    }

    if (spec.status === "automated") {
      const test = await prisma.test.create({
        data: {
          scenarioId: scenario.id,
          layer: "web",
          framework: "codeceptjs",
          filePath: `tests/${SLUG}/${slug(spec.title)}_test.js`,
          status: spec.test ?? "passing",
          createdAt: created,
        },
      });
      events.push({
        type: "test_generated",
        entityRef: scenario.id,
        payload: { filePath: test.filePath, correlationId: randomUUID() },
        createdAt: created,
      });
      if (spec.test === "failing") {
        failingTestIds.push({ id: test.id, title: spec.title });
      }
    }
  }

  // Run history with a rising pass rate.
  const runIds: string[] = [];
  for (const r of RUNS) {
    const started = daysAgo(r.day);
    const finished = new Date(started.getTime() + 7 * 60_000);
    const run = await prisma.run.create({
      data: {
        trigger: r.trigger,
        source: r.source,
        commitSha: randomUUID().replace(/-/g, "").slice(0, 16),
        startedAt: started,
        finishedAt: finished,
        summary: { passed: r.passed, failed: r.failed, total: r.passed + r.failed },
      },
    });
    runIds.push(run.id);
  }

  // Failures on the most recent runs, linked to the failing tests, classified.
  const recentRuns = runIds.slice(-4);
  const classes: Array<{
    cls: "real_bug" | "test_issue" | "flaky";
    confidence: number;
    rationale: string;
    errorType: string;
    message: string;
  }> = [
    {
      cls: "real_bug",
      confidence: 0.91,
      rationale:
        "The lockout counter never triggers; the defect is reproducible on staging.",
      errorType: "AssertionError",
      message: "expected account to be locked after 5 attempts, but login succeeded",
    },
    {
      cls: "flaky",
      confidence: 0.58,
      rationale:
        "Fails intermittently on a timing race in the cart animation; passes on retry.",
      errorType: "TimeoutError",
      message: "waiting for selector '[data-testid=cart-empty]' timed out after 5000ms",
    },
    {
      cls: "test_issue",
      confidence: 0.74,
      rationale:
        "Selector drifted after the checkout markup change; product behavior is correct.",
      errorType: "ElementNotFound",
      message: "locator '[data-testid=tax-line]' not found on the checkout page",
    },
  ];

  let failureCount = 0;
  for (let i = 0; i < failingTestIds.length; i++) {
    const t = failingTestIds[i];
    const c = classes[i % classes.length];
    if (!t || !c) continue;
    // Two occurrences per failing test across recent runs so trends have signal.
    for (let k = 0; k < 2; k++) {
      const runId = recentRuns[(i + k) % recentRuns.length];
      if (!runId) continue;
      const createdAt = daysAgo(k === 0 ? 1 : 5);
      const failure = await prisma.failure.create({
        data: {
          runId,
          testId: t.id,
          errorType: c.errorType,
          message: c.message,
          artifactUrls: [
            `${STAGING_URL}/artifacts/${slug(t.title)}/screenshot.png`,
            `${STAGING_URL}/artifacts/${slug(t.title)}/console.log`,
          ],
          createdAt,
        },
      });
      failureCount += 1;
      // Classify once per failure (the latest occurrence carries confirmation).
      await prisma.classification.create({
        data: {
          failureId: failure.id,
          class: c.cls,
          confidence: c.confidence,
          rationale: c.rationale,
          evidenceUrls: [
            `${STAGING_URL}/artifacts/${slug(t.title)}/screenshot.png`,
          ],
          confirmedBy: k === 0 ? `qa_lead@${SLUG}.example` : null,
          confirmedClass: k === 0 ? c.cls : null,
          createdAt,
        },
      });
      events.push({
        type: "failure_classified",
        entityRef: failure.id,
        payload: { class: c.cls, confidence: c.confidence, correlationId: randomUUID() },
        createdAt,
      });
    }
  }

  // Persist the event feed (append-only history backbone).
  for (const e of events) {
    await prisma.event.create({
      data: {
        type: e.type,
        entityRef: e.entityRef,
        payload: e.payload as never,
        createdAt: e.createdAt,
      },
    });
  }

  const counts = {
    scenarios: await prisma.scenario.count(),
    automated: await prisma.scenario.count({ where: { status: "automated" } }),
    tests: await prisma.test.count(),
    runs: await prisma.run.count(),
    failures: failureCount,
    classifications: await prisma.classification.count(),
    events: events.length,
  };

  await prisma.$disconnect();

  console.log("✓ Demo data seeded:");
  console.log(`  ${counts.scenarios} scenarios (${counts.automated} automated)`);
  console.log(`  ${counts.tests} tests · ${counts.runs} runs`);
  console.log(`  ${counts.failures} failures · ${counts.classifications} classifications`);
  console.log(`  ${counts.events} events · 3 connections · 3 users`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
