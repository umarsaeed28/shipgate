/** Optional context so analysis can relate Playwright/Codecept behavior to application source. */
export type ClassifyContext = {
  /** Git remote URL from Settings - used to ground “logic vs observed behavior” reasoning */
  gitRepoUrl?: string;
};

function finish(
  r: { classification: string; confidence: number; evidence: string[]; action: string },
  ctx?: ClassifyContext,
): { classification: string; confidence: number; evidence: string[]; action: string } {
  const u = ctx?.gitRepoUrl?.trim();
  if (!u) return r;
  return {
    ...r,
    evidence: [
      ...r.evidence,
      `Repository ${u}: compare this run’s UI/runtime behavior (Allure/Codecept) with implementation in the repo.`,
    ],
    action: `${r.action} Cross-check against source: ${u}.`,
  };
}

/** Classify a failure from Allure / test log text for the regression analyzer UI. */
export function classifyFromLog(
  error: string,
  fullBlock: string,
  ctx?: ClassifyContext,
): { classification: string; confidence: number; evidence: string[]; action: string } {
  const lower = (error + " " + fullBlock).toLowerCase();
  const evidence: string[] = [];

  if (
    lower.includes("outside expected range") ||
    lower.includes("p&i") ||
    (lower.includes("$") && lower.includes("should be"))
  ) {
    const rangeMatch = error.match(/\$[\d,.]+.*(?:outside|should be|expected).*\$[\d,.]+/i);
    if (rangeMatch) evidence.push(`Calculated value mismatch: ${rangeMatch[0]}`);
    evidence.push("Monetary calculation produced incorrect result");
    return finish(
      {
        classification: "product_bug",
        confidence: 0.95,
        evidence,
        action:
          "The mortgage P&I calculation is returning an incorrect value. Check calculateMortgage() for arithmetic bugs (e.g. an offset being added to monthlyPrincipalInterest).",
      },
      ctx,
    );
  }

  if (
    (lower.includes("expected") && lower.includes("to equal")) ||
    lower.includes("assertionerror") ||
    (lower.includes("expected") && lower.includes("but got"))
  ) {
    evidence.push("Assertion mismatch detected in test output");
    if (lower.includes("monthly") || lower.includes("payment") || lower.includes("$")) {
      evidence.push("Failure relates to a calculated monetary value");
    }
    return finish(
      {
        classification: "product_bug",
        confidence: 0.92,
        evidence,
        action: "Investigate calculation logic in the mortgage app for regressions",
      },
      ctx,
    );
  }

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("exceeded")) {
    evidence.push("Timeout error detected");
    if (lower.includes("waitforelement") || lower.includes("results")) {
      evidence.push("Timeout occurred waiting for calculation results to appear");
    }
    return finish(
      {
        classification: "environment",
        confidence: 0.8,
        evidence,
        action:
          "A calculation delay is causing results to load too slowly. Check if Simulate Delay is enabled or increase test waitForElement timeouts.",
      },
      ctx,
    );
  }

  if (
    lower.includes("element not found") ||
    lower.includes("selector") ||
    lower.includes("locator") ||
    lower.includes("no such element")
  ) {
    evidence.push("Element selector failure detected");
    return finish(
      {
        classification: "test_bug",
        confidence: 0.88,
        evidence,
        action: "Update test selectors to match current DOM structure",
      },
      ctx,
    );
  }

  if (
    lower.includes("econnrefused") ||
    (lower.includes("browser") && lower.includes("launch")) ||
    lower.includes("spawn") ||
    lower.includes("enoent")
  ) {
    evidence.push("Infrastructure/environment error detected");
    return finish(
      {
        classification: "environment",
        confidence: 0.9,
        evidence,
        action: "Verify mortgage app and test infrastructure are running correctly",
      },
      ctx,
    );
  }

  evidence.push("Could not classify with high confidence from log output");
  return finish(
    {
      classification: "unknown",
      confidence: 0.5,
      evidence,
      action: "Manually review test failure logs and screenshots",
    },
    ctx,
  );
}
