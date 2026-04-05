import {
  FailureClassification,
  IntegrationType,
  PrismaClient,
  TestCaseStatus,
  TestPriority,
  TestRunStatus,
  WebhookDeliveryStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.failureAnalysis.deleteMany();
  await prisma.failureEvent.deleteMany();
  await prisma.testRun.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.suiteHealthSnapshot.deleteMany();
  await prisma.testScenario.deleteMany();
  await prisma.acceptanceCriterion.deleteMany();
  await prisma.userStory.deleteMany();
  await prisma.testSuite.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.testApplication.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.promptTemplate.deleteMany();
  await prisma.rule.deleteMany();

  const ws = await prisma.workspace.create({
    data: { name: "Acme QA", slug: "acme" },
  });

  const project = await prisma.project.create({
    data: { workspaceId: ws.id, name: "Checkout", key: "CHK" },
  });

  const appCheckout = await prisma.testApplication.create({
    data: {
      workspaceId: ws.id,
      projectId: project.id,
      name: "Checkout Web",
      baseUrl: "https://checkout.acme.test",
      credentialsJson: JSON.stringify({ role: "qa", user: "qa@acme.test" }),
      jiraProjectKey: "CHK",
      jenkinsJobName: "checkout-e2e",
    },
  });

  const appApi = await prisma.testApplication.create({
    data: {
      workspaceId: ws.id,
      projectId: project.id,
      name: "Payments API",
      baseUrl: "https://api.payments.acme.test",
      credentialsJson: JSON.stringify({ apiKey: "mock-key" }),
      jiraProjectKey: "PAY",
      jenkinsJobName: "payments-api-tests",
    },
  });

  const envStagingCheckout = await prisma.environment.create({
    data: {
      applicationId: appCheckout.id,
      name: "staging",
      baseUrl: "https://staging.checkout.acme.test",
    },
  });
  const envProdCheckout = await prisma.environment.create({
    data: {
      applicationId: appCheckout.id,
      name: "production",
      baseUrl: "https://checkout.acme.test",
    },
  });
  const envStagingApi = await prisma.environment.create({
    data: {
      applicationId: appApi.id,
      name: "staging",
      baseUrl: "https://staging-api.payments.acme.test",
    },
  });

  const suiteNames = [
    { name: "Smoke", app: appCheckout, owner: "qa-lead", tags: ["smoke", "nightly"] },
    { name: "Regression", app: appCheckout, owner: "qa-lead", tags: ["full"] },
    { name: "Checkout flows", app: appCheckout, owner: "j.doe", tags: ["e2e"] },
    { name: "API contract", app: appApi, owner: "platform", tags: ["api"] },
    { name: "Payments edge", app: appApi, owner: "platform", tags: ["edge"] },
  ] as const;

  const suites = [];
  for (const s of suiteNames) {
    suites.push(
      await prisma.testSuite.create({
        data: {
          applicationId: s.app.id,
          name: s.name,
          description: `${s.name} suite`,
          owner: s.owner,
          tags: [...s.tags],
        },
      })
    );
  }

  const priorities: TestPriority[] = [
    TestPriority.P0,
    TestPriority.P1,
    TestPriority.P2,
    TestPriority.P3,
  ];
  const statuses: TestCaseStatus[] = [
    TestCaseStatus.active,
    TestCaseStatus.active,
    TestCaseStatus.active,
    TestCaseStatus.skipped,
  ];

  let caseIndex = 0;
  for (const suite of suites) {
    for (let i = 0; i < 8; i++) {
      await prisma.testCase.create({
        data: {
          suiteId: suite.id,
          name: `${suite.name} case ${i + 1}`,
          description: `Automated case ${caseIndex + 1}`,
          priority: priorities[i % priorities.length],
          status: statuses[i % statuses.length],
          tags: i % 3 === 0 ? ["flaky-candidate"] : [],
        },
      });
      caseIndex++;
    }
  }

  const story1 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      key: "CHK-101",
      title: "Guest can complete purchase with saved card",
      description: "As a guest, I want to pay quickly using a saved card.",
      status: "in_progress",
    },
  });
  await prisma.acceptanceCriterion.createMany({
    data: [
      { storyId: story1.id, text: "Order confirmation is shown", sortOrder: 0 },
      { storyId: story1.id, text: "Receipt email is sent", sortOrder: 1 },
    ],
  });
  await prisma.testScenario.createMany({
    data: [
      {
        storyId: story1.id,
        title: "Happy path — saved card",
        steps: "1. Add item\n2. Checkout\n3. Select saved card\n4. Pay",
        kind: "happy_path",
        coverageMapJson: JSON.stringify({ criteria: ["CHK-101-1"] }),
      },
      {
        storyId: story1.id,
        title: "Negative — declined card",
        steps: "1. Use declined test card\n2. Expect error",
        kind: "negative",
        coverageMapJson: JSON.stringify({ criteria: ["CHK-101-1"] }),
      },
    ],
  });

  const story2 = await prisma.userStory.create({
    data: {
      projectId: project.id,
      key: "PAY-42",
      title: "Idempotent payment capture",
      status: "open",
    },
  });
  await prisma.acceptanceCriterion.create({
    data: { storyId: story2.id, text: "Duplicate capture returns same result", sortOrder: 0 },
  });

  const jiraConn = await prisma.integrationConnection.create({
    data: {
      workspaceId: ws.id,
      type: IntegrationType.jira,
      name: "Acme Jira",
      baseUrl: "https://acme.atlassian.net",
      secretRef: "vault/jira",
      configJson: JSON.stringify({ cloud: true }),
      isActive: true,
    },
  });
  const jenkinsConn = await prisma.integrationConnection.create({
    data: {
      workspaceId: ws.id,
      type: IntegrationType.jenkins,
      name: "CI Jenkins",
      baseUrl: "https://jenkins.acme.test",
      secretRef: "vault/jenkins",
      configJson: JSON.stringify({ folder: "qa" }),
      isActive: true,
    },
  });

  const allCases = await prisma.testCase.findMany({ orderBy: { id: "asc" } });

  const runSpecs: Array<{
    suiteIndex: number;
    status: TestRunStatus;
    env?: "staging" | "none";
    failCount: number;
    log?: string;
  }> = [
    { suiteIndex: 0, status: TestRunStatus.passed, env: "staging", failCount: 0 },
    { suiteIndex: 1, status: TestRunStatus.failed, env: "staging", failCount: 2 },
    { suiteIndex: 2, status: TestRunStatus.passed, env: "staging", failCount: 0 },
    { suiteIndex: 3, status: TestRunStatus.failed, env: "staging", failCount: 1 },
    { suiteIndex: 4, status: TestRunStatus.passed, env: "staging", failCount: 0 },
    { suiteIndex: 0, status: TestRunStatus.running, env: "staging", failCount: 0 },
    { suiteIndex: 1, status: TestRunStatus.passed, env: "none", failCount: 0 },
    { suiteIndex: 2, status: TestRunStatus.error, env: "staging", failCount: 1 },
    { suiteIndex: 3, status: TestRunStatus.passed, env: "staging", failCount: 0 },
    { suiteIndex: 4, status: TestRunStatus.cancelled, env: "staging", failCount: 0 },
    { suiteIndex: 0, status: TestRunStatus.queued, env: "staging", failCount: 0 },
    { suiteIndex: 1, status: TestRunStatus.passed, env: "staging", failCount: 0 },
  ];

  let failBudget = 4;
  let runNo = 0;

  for (const spec of runSpecs) {
    const suite = suites[spec.suiteIndex];
    const app = await prisma.testApplication.findFirstOrThrow({
      where: { id: suite.applicationId },
    });
    const envId =
      spec.env === "staging"
        ? app.id === appCheckout.id
          ? envStagingCheckout.id
          : envStagingApi.id
        : null;

    const started = new Date(Date.now() - (12 - runNo) * 3600_000);
    const duration = spec.status === TestRunStatus.running ? null : 120_000 + runNo * 1000;
    const finished =
      spec.status === TestRunStatus.running || spec.status === TestRunStatus.queued
        ? null
        : new Date(started.getTime() + (duration ?? 0));

    const run = await prisma.testRun.create({
      data: {
        suiteId: suite.id,
        applicationId: app.id,
        environmentId: envId,
        status: spec.status,
        startedAt: spec.status === TestRunStatus.queued ? null : started,
        finishedAt: finished,
        durationMs: duration,
        triggeredBy: runNo % 2 === 0 ? "jenkins" : "manual",
        jenkinsBuildId: runNo % 2 === 0 ? `build-${100 + runNo}` : null,
        logs:
          spec.status === TestRunStatus.error
            ? "ERROR: connection reset by peer\n\tat TCPConnectWrap.afterConnect"
            : "INFO: run started\nINFO: collecting artifacts",
      },
    });

    const suiteCases = allCases.filter((c) => c.suiteId === suite.id);
    if (spec.failCount > 0 && failBudget > 0) {
      const take = Math.min(spec.failCount, suiteCases.length, failBudget);
      for (let f = 0; f < take; f++) {
        const tc = suiteCases[f];
        await prisma.failureEvent.create({
          data: {
            runId: run.id,
            caseId: tc.id,
            message: `Assertion failed: expected visible selector #confirm-${f}`,
            stack: `Error: timeout 5000ms\n  at waitFor (${suite.name})`,
          },
        });
        failBudget--;
      }
    }

    if (spec.status === TestRunStatus.failed && spec.failCount > 0) {
      const fe = await prisma.failureEvent.findFirst({ where: { runId: run.id } });
      if (fe) {
        await prisma.failureAnalysis.create({
          data: {
            runId: run.id,
            failureEventId: fe.id,
            classification: FailureClassification.NEEDS_REVIEW,
            confidence: 0.72,
            summary: "Failure pattern suggests UI timing; confirm environment stability.",
            suggestedAction: "Re-run on staging; capture HAR if flaky.",
          },
        });
      }
    }

    runNo++;
  }

  await prisma.webhookEvent.createMany({
    data: [
      {
        connectionId: jiraConn.id,
        source: IntegrationType.jira,
        payloadJson: JSON.stringify({ webhookEvent: "jira:issue_updated", issue: { key: "CHK-101" } }),
        normalizedJson: JSON.stringify({ issueKey: "CHK-101" }),
        deliveryStatus: WebhookDeliveryStatus.processed,
        processedAt: new Date(),
      },
      {
        connectionId: jenkinsConn.id,
        source: IntegrationType.jenkins,
        payloadJson: JSON.stringify({ name: "checkout-e2e", number: 204, result: "UNSTABLE" }),
        normalizedJson: JSON.stringify({ build: 204, result: "UNSTABLE" }),
        deliveryStatus: WebhookDeliveryStatus.processed,
        processedAt: new Date(),
      },
      {
        connectionId: null,
        source: IntegrationType.jira,
        payloadJson: JSON.stringify({ issueKey: "PAY-42" }),
        deliveryStatus: WebhookDeliveryStatus.received,
      },
    ],
  });

  for (const suite of suites) {
    const passRate = 0.75 + (suite.name.length % 5) * 0.04;
    await prisma.suiteHealthSnapshot.create({
      data: {
        suiteId: suite.id,
        passRate,
        flakyRate: 0.03 + (suite.name.length % 3) * 0.01,
        riskLevel: passRate > 0.9 ? "low" : passRate > 0.8 ? "medium" : "high",
        summaryJson: JSON.stringify({ window: "7d" }),
      },
    });
  }

  await prisma.promptTemplate.createMany({
    data: [
      {
        key: "failure_triage",
        title: "Failure triage",
        body: "You are a QA assistant. Classify the failure and suggest next steps.",
      },
      {
        key: "run_summary",
        title: "Run summary",
        body: "Summarize the test run for stakeholders in three bullets.",
      },
    ],
  });

  await prisma.rule.createMany({
    data: [
      {
        key: "block_release_on_p0",
        name: "Block release on P0 failure",
        description: "Any P0 failure marks release as high risk.",
        configJson: JSON.stringify({ enabled: true }),
        isEnabled: true,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: ws.id,
      actor: "system:seed",
      action: "seed.completed",
      resource: "database",
      detailsJson: JSON.stringify({ workspace: ws.slug }),
    },
  });

  console.log("Seed completed:", { workspace: ws.slug, applications: 2, suites: suites.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
