import { prisma, recordEvent } from "@qa/store";
import { llm, classificationPromptV1 } from "@qa/llm";
import { Classification as ClassificationSchema } from "@qa/schemas";

/**
 * Agent 2 classification: explain a failure as real_bug | test_issue | flaky,
 * backed by Claude (prompt is a documented stub in @qa/llm). Agent 2 ONLY
 * writes a Classification row — it never edits tests or masks failures.
 *
 * NOTE (scaffold): the prompt/evidence-gathering is intentionally minimal. A
 * full implementation would attach the console log, screenshots, and the test
 * source as evidence before asking Claude.
 */
export async function classifyFailure(failureId: string) {
  const failure = await prisma.failure.findUnique({
    where: { id: failureId },
    include: { test: true },
  });
  if (!failure) throw new Error(`Failure ${failureId} not found`);

  const prompt = classificationPromptV1({
    failure: {
      errorType: failure.errorType,
      message: failure.message,
      testFilePath: failure.test?.filePath ?? null,
    },
  });

  const result = await llm.completeStructured(ClassificationSchema, {
    promptId: prompt.promptId,
    input: { failure: { errorType: failure.errorType, message: failure.message } },
    system: prompt.system,
    user: prompt.user,
  });

  const classification = await prisma.classification.upsert({
    where: { failureId },
    update: {
      class: result.class,
      confidence: result.confidence,
      rationale: result.rationale,
      evidenceUrls: result.evidenceUrls,
    },
    create: {
      failureId,
      class: result.class,
      confidence: result.confidence,
      rationale: result.rationale,
      evidenceUrls: result.evidenceUrls,
    },
  });

  await recordEvent({
    type: "failure_classified",
    entityRef: failureId,
    payload: {
      class: result.class,
      confidence: result.confidence,
      provider: llm.providerName,
    },
  });

  return classification;
}
