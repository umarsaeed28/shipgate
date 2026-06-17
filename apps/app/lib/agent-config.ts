import { prisma } from "@qa/store";
import { clientConfig } from "@qa/config/client";

const KEY = "agent";

export interface AgentConfigValue {
  /** Anthropic model id. Falls back to env (never hardcoded in agent logic). */
  model: string;
  /** Versioned prompt template ids used by the agents. */
  scenarioPromptVersion: string;
  testPromptVersion: string;
  classificationPromptVersion: string;
  /** Below this confidence, Agent 2 leaves a failure unclassified for review. */
  classificationConfidenceThreshold: number;
  /** Max scenarios Agent 1 drafts per story. */
  maxScenariosPerStory: number;
}

export function defaultAgentConfig(): AgentConfigValue {
  return {
    model: clientConfig.anthropicModel,
    scenarioPromptVersion: "scenario.v1",
    testPromptVersion: "codecept-test.v1",
    classificationPromptVersion: "classification.v1",
    classificationConfidenceThreshold: 0.6,
    maxScenariosPerStory: 8,
  };
}

export async function getAgentConfig(): Promise<AgentConfigValue> {
  const row = await prisma.agentConfig.findUnique({ where: { key: KEY } });
  const stored = (row?.value as Partial<AgentConfigValue>) ?? {};
  return { ...defaultAgentConfig(), ...stored };
}

export async function setAgentConfig(
  patch: Partial<AgentConfigValue>,
  updatedBy: string,
): Promise<AgentConfigValue> {
  const next = { ...(await getAgentConfig()), ...patch };
  await prisma.agentConfig.upsert({
    where: { key: KEY },
    update: { value: next as never, updatedBy },
    create: { key: KEY, value: next as never, updatedBy },
  });
  return next;
}
