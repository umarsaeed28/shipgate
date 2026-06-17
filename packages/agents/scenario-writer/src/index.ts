import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { prisma, recordEvent } from "@qa/store";
import { clientConfig } from "@qa/config/client";
import {
  llm,
  scenarioPromptV1,
  codeceptTestPromptV1,
  type ScenarioPromptInput,
} from "@qa/llm";
import { ScenarioDraftList, GeneratedTest } from "@qa/schemas";
import { createAtlassianClient } from "@qa/mcp";
import { createBitbucketClient } from "@qa/connectors";
import { runTest } from "@qa/test-runner";
import { atlassianCreds, bitbucketCreds } from "./connections";

function testsDir(): string {
  return (
    process.env.QA_TESTS_DIR ??
    path.join(process.cwd(), "tests", clientConfig.slug)
  );
}

export interface DraftInput {
  storyKey: string;
  prId?: number;
  maxScenarios?: number;
}

/**
 * Agent 1, phase A: pull story (MCP) + diff (Bitbucket) + Confluence context,
 * draft scenarios with Claude (story-driven vs code-deviation), save as
 * pending_review, and record an Event per scenario.
 */
export async function draftScenarios(input: DraftInput) {
  // Correlate this agent run across every model call and Event so our history
  // store lines up with AWS CloudTrail entries (see qa-platform.mdc).
  const correlationId = randomUUID();
  const atlas = createAtlassianClient(await atlassianCreds());
  const story = await atlas.getStory(input.storyKey);

  let diff: string | undefined;
  let changedFiles: string[] | undefined;
  let sourceCommitSha: string | undefined;

  if (input.prId != null) {
    const bb = createBitbucketClient(await bitbucketCreds());
    const pr = await bb.getPullRequest(input.prId);
    diff = await bb.getDiff(input.prId);
    changedFiles = await bb.getChangedFiles(input.prId);
    sourceCommitSha = pr.sourceCommit;
  }

  const promptInput: ScenarioPromptInput = {
    story: {
      key: story.key,
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
    },
    diff,
    changedFiles,
    maxScenarios: input.maxScenarios ?? 8,
  };
  const prompt = scenarioPromptV1(promptInput);

  let modelRequestId: string | undefined;
  const drafted = await llm.completeStructured(ScenarioDraftList, {
    promptId: prompt.promptId,
    input: promptInput,
    system: prompt.system,
    user: prompt.user,
    correlationId,
    onMeta: (m) => {
      modelRequestId = m.requestId;
    },
  });

  const createdIds: string[] = [];
  for (const s of drafted.scenarios) {
    const row = await prisma.scenario.create({
      data: {
        title: s.title,
        kind: s.kind,
        priority: s.priority,
        steps: s.steps,
        rationale: s.rationale,
        sourceStoryKey: story.key,
        sourceCommitSha: s.kind === "code_deviation" ? sourceCommitSha : null,
        status: "pending_review",
      },
    });
    createdIds.push(row.id);
    await recordEvent({
      type: "scenario_drafted",
      entityRef: row.id,
      payload: {
        kind: s.kind,
        storyKey: story.key,
        provider: llm.providerName,
        correlationId,
        modelRequestId,
      },
    });
  }

  return {
    scenarioIds: createdIds,
    storyKey: story.key,
    provider: llm.providerName,
    correlationId,
  };
}

/**
 * Agent 1, phase B (after human approval): generate a CodeceptJS test for a
 * kept/automated scenario, run it against the staging URL, and persist the Test
 * plus an Event. Tests are written only under tests/**.
 */
export async function generateAndRunTest(scenarioId: string) {
  const correlationId = randomUUID();
  const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
  if (!scenario) throw new Error(`Scenario ${scenarioId} not found`);

  const client = await prisma.client.findUnique({
    where: { slug: clientConfig.slug },
  });
  const baseUrl = client?.stagingUrl;
  if (!baseUrl) {
    throw new Error("No staging URL configured — set it in Settings first.");
  }

  const prompt = codeceptTestPromptV1({
    scenario: { title: scenario.title, steps: scenario.steps },
    baseUrl,
  });
  let modelRequestId: string | undefined;
  const gen = await llm.completeStructured(GeneratedTest, {
    promptId: prompt.promptId,
    input: { scenario: { title: scenario.title, steps: scenario.steps }, baseUrl },
    system: prompt.system,
    user: prompt.user,
    correlationId,
    onMeta: (m) => {
      modelRequestId = m.requestId;
    },
  });

  const dir = testsDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, gen.filename);
  fs.writeFileSync(filePath, gen.code, "utf8");

  await recordEvent({
    type: "test_generated",
    entityRef: scenarioId,
    payload: {
      filePath,
      provider: llm.providerName,
      correlationId,
      modelRequestId,
    },
  });

  const result = await runTest(filePath, baseUrl);

  const test = await prisma.test.upsert({
    where: { scenarioId },
    update: { filePath, status: result.passed ? "passing" : "failing" },
    create: {
      scenarioId,
      filePath,
      layer: "web",
      framework: "codeceptjs",
      status: result.passed ? "passing" : "failing",
    },
  });

  await prisma.scenario.update({
    where: { id: scenarioId },
    data: { status: "automated" },
  });

  await recordEvent({
    type: "test_run",
    entityRef: test.id,
    payload: {
      scenarioId,
      passed: result.passed,
      durationMs: result.durationMs,
      baseUrl,
      correlationId,
    },
  });

  return {
    testId: test.id,
    filePath,
    passed: result.passed,
    output: result.output,
  };
}
