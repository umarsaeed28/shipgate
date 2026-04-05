import type { GeneratorInput, GeneratorOutput, GeneratedScript } from "./test-generator.js";

export function generateMockScripts(input: GeneratorInput): GeneratorOutput {
  const scripts: GeneratedScript[] = [];
  const grouped = new Map<string, typeof input.plannedCases>();

  for (const tc of input.plannedCases) {
    const key = tc.storyRef ?? "general";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(tc);
  }

  let fileIndex = 1;
  for (const [ref, cases] of grouped) {
    const featureName = ref === "general" ? "General" : ref;
    const scenarios = cases
      .map((tc) => {
        const stepsCode = tc.steps
          .map((s) => `  I.say("${s.replace(/"/g, '\\"')}");`)
          .join("\n");
        return `Scenario("${tc.title}", ({ I }) => {\n${stepsCode}\n});`;
      })
      .join("\n\n");

    const content = input.framework === "playwright"
      ? generatePlaywrightFile(featureName, cases, input.baseUrl)
      : generateCodeceptFile(featureName, scenarios);

    const ext = input.framework === "playwright" ? ".spec.ts" : "_test.js";
    scripts.push({
      filename: `${String(fileIndex).padStart(2, "0")}_${featureName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}${ext}`,
      content,
      caseRefs: cases.map((c) => c.title),
    });
    fileIndex++;
  }

  const configContent = input.framework === "playwright"
    ? `import { defineConfig } from "@playwright/test";\nexport default defineConfig({\n  testDir: ".",\n  use: { baseURL: "${input.baseUrl}" },\n});\n`
    : `const config = {\n  tests: "./*_test.js",\n  helpers: { Playwright: { browser: "chromium", url: "${input.baseUrl}", show: false } },\n  include: {},\n  name: "generated",\n};\nmodule.exports = { config };\n`;

  return {
    scripts,
    configFile: {
      filename: input.framework === "playwright" ? "playwright.config.ts" : "codecept.conf.js",
      content: configContent,
    },
    totalScenarios: input.plannedCases.length,
  };
}

function generatePlaywrightFile(feature: string, cases: Array<{ title: string; steps: string[]; expectedResult: string }>, baseUrl: string): string {
  const tests = cases
    .map((tc) => {
      const body = [
        `    await page.goto("${baseUrl}");`,
        ...tc.steps.map((s) => `    // ${s}`),
        `    // Expected: ${tc.expectedResult}`,
      ].join("\n");
      return `  test("${tc.title}", async ({ page }) => {\n${body}\n  });`;
    })
    .join("\n\n");
  return `import { test, expect } from "@playwright/test";\n\ntest.describe("${feature}", () => {\n${tests}\n});\n`;
}

function generateCodeceptFile(feature: string, scenarios: string): string {
  return `Feature("${feature} @generated");\n\n${scenarios}\n`;
}
