import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(fileURLToPath(import.meta.url));
const CONF = path.join(here, "..", "codecept.conf.cjs");

export interface TestRunResult {
  passed: boolean;
  output: string;
  durationMs: number;
  artifactDir: string;
}

/**
 * Run a single CodeceptJS (Playwright helper) test file against a base URL.
 * Returns pass/fail plus captured output. Artifacts (screenshots on failure)
 * are written under the artifact dir; we store references, not payloads.
 */
export async function runTest(
  testFilePath: string,
  baseUrl: string,
): Promise<TestRunResult> {
  const artifactDir = path.join(path.dirname(testFilePath), "output");
  fs.mkdirSync(artifactDir, { recursive: true });

  const started = Date.now();
  const result = await new Promise<{ code: number; output: string }>(
    (resolve) => {
      const child = spawn("npx", ["codeceptjs", "run", "-c", CONF, "--steps"], {
        env: {
          ...process.env,
          QA_TEST_FILE: testFilePath,
          QA_BASE_URL: baseUrl,
          QA_OUTPUT_DIR: artifactDir,
        },
      });
      let output = "";
      child.stdout.on("data", (d) => (output += d.toString()));
      child.stderr.on("data", (d) => (output += d.toString()));
      child.on("close", (code) => resolve({ code: code ?? 1, output }));
      child.on("error", (err) => resolve({ code: 1, output: String(err) }));
    },
  );

  return {
    passed: result.code === 0,
    output: result.output,
    durationMs: Date.now() - started,
    artifactDir,
  };
}
