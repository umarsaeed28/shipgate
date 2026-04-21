import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const E2E_DIR =
  process.env.E2E_DIR || path.resolve(process.cwd(), "..", "..", "tests", "e2e");

export function allureReportFilesystemDir(buildNumber: number): string {
  return path.join(E2E_DIR, "allure-reports", `build-${buildNumber}`);
}

/** Base URL for links returned to clients (Analysis UI, iframes). No trailing slash. */
export function publicApiBase(): string {
  const fromEnv = process.env.PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const port = process.env.PORT || "4000";
  return `http://127.0.0.1:${port}`;
}

export function allureReportHttpUrl(buildNumber: number): string {
  return `${publicApiBase()}/api/regression/allure/build/build-${buildNumber}/index.html`;
}

/**
 * Generate static Allure HTML under tests/e2e/allure-reports/build-{n}/.
 * Uses `npx allure-commandline` from the e2e package when available.
 */
export function generateAllureReportForBuild(buildNumber: number): {
  url: string | null;
  logLines: string[];
} {
  const outDir = allureReportFilesystemDir(buildNumber);
  const resultsDir = path.join(E2E_DIR, "allure-results");
  const logLines: string[] = [];

  if (!fs.existsSync(resultsDir)) {
    logLines.push("[shipgate] No allure-results directory - skipping Allure HTML generation\n");
    return { url: null, logLines };
  }

  try {
    fs.mkdirSync(path.dirname(outDir), { recursive: true });
  } catch (e) {
    logLines.push(`[shipgate] Could not create Allure output dir: ${e}\n`);
    return { url: null, logLines };
  }

  const attempts = [
    () =>
      execSync(`npx --yes allure-commandline generate allure-results --clean -o "${outDir}"`, {
        cwd: E2E_DIR,
        env: { ...process.env },
      }),
    () =>
      execSync(`allure generate allure-results --clean -o "${outDir}"`, {
        cwd: E2E_DIR,
        env: { ...process.env },
      }),
  ];

  for (const run of attempts) {
    try {
      run();
      const index = path.join(outDir, "index.html");
      if (!fs.existsSync(index)) {
        logLines.push("[shipgate] Allure generate finished but index.html is missing\n");
        return { url: null, logLines };
      }
      const url = allureReportHttpUrl(buildNumber);
      logLines.push(`[shipgate] Allure report generated: ${url}\n`);
      return { url, logLines };
    } catch {
      /* try next */
    }
  }

  logLines.push(
    "[shipgate] Allure CLI not available - install with: pnpm add -D allure-commandline (in tests/e2e) or brew install allure\n",
  );
  return { url: null, logLines };
}
