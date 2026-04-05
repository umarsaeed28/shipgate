import type {
  RegressionRunAnalyzer,
  RunAnalysisInput,
  SuiteVisualizer,
  SuiteVisualizerInput,
  TestScenarioWriter,
  AcceptanceInput,
} from "@shipgate/agents";
import { generateMockScenarios } from "@shipgate/agents";
import { prisma } from "@shipgate/database";
import { FailureClassification } from "@prisma/client";

export const mockScenarioWriter: TestScenarioWriter = {
  async generate(_ctx, input: AcceptanceInput) {
    return { ok: true, data: generateMockScenarios(input) };
  },
};

export const mockRegressionAnalyzer: RegressionRunAnalyzer = {
  async analyze(_ctx, input: RunAnalysisInput) {
    const text = `${input.logs ?? ""}\n${input.failures.map((f) => f.message).join("\n")}`.toLowerCase();
    let classification: (typeof FailureClassification)[keyof typeof FailureClassification] =
      FailureClassification.NEEDS_REVIEW;
    if (text.includes("timeout") || text.includes("selector")) {
      classification = FailureClassification.BROKEN_TEST;
    } else if (text.includes("connection") || text.includes("503")) {
      classification = FailureClassification.ENVIRONMENT;
    } else if (text.includes("assertion")) {
      classification = FailureClassification.REAL_BUG;
    }
    return {
      ok: true,
      data: {
        classification,
        confidence: 0.68,
        summary: "Heuristic classification from logs and failure messages (mock agent).",
        suggestedAction: "Review linked test case and environment configuration.",
      },
    };
  },
};

export const mockSuiteVisualizer: SuiteVisualizer = {
  async summarize(_ctx, input: SuiteVisualizerInput) {
    const runs = await prisma.testRun.findMany({
      where: { id: { in: input.recentRunIds } },
    });
    const passed = runs.filter((r) => r.status === "passed").length;
    const total = runs.length || 1;
    const passRate = passed / total;
    return {
      ok: true,
      data: {
        passRate,
        flakyRate: 0.04,
        riskLevel: passRate > 0.85 ? "low" : passRate > 0.7 ? "medium" : "high",
        releaseSummary: `Suite ${input.suiteId}: ${(passRate * 100).toFixed(1)}% recent pass rate (mock).`,
      },
    };
  },
};
