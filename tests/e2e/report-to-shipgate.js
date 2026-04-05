/**
 * Runs CodeceptJS smoke tests and reports results to the Shipgate API.
 *
 * Creates a TestRun, executes the suite, patches the run with final status,
 * posts FailureEvents for each failed scenario, and triggers analysis.
 *
 * Usage:
 *   SUITE_ID=xxx APP_ID=yyy node report-to-shipgate.js
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const API = process.env.SHIPGATE_API || "http://localhost:4000";
const SUITE_ID = process.env.SUITE_ID;
const APP_ID = process.env.APP_ID;

if (!SUITE_ID || !APP_ID) {
  console.error("Error: SUITE_ID and APP_ID env vars are required.");
  console.error("Run `node seed-shipgate.js` first to get them.");
  process.exit(1);
}

async function api(method, endpoint, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: res.status };
  }
}

async function main() {
  console.log("=== Shipgate Smoke Test Runner ===\n");

  // 1) Create run
  console.log("1. Creating test run...");
  const runRes = await api("POST", `/suites/${SUITE_ID}/run`, {});
  const runId = runRes.runId;
  console.log(`   Run ID: ${runId}`);

  // 2) Mark as running
  await api("PATCH", `/runs/${runId}`, { status: "running" });
  console.log("   Status: running\n");

  // 3) Execute CodeceptJS
  console.log("2. Running CodeceptJS smoke tests...");
  const startedAt = Date.now();
  let stdout = "";
  let exitCode = 0;

  try {
    stdout = execSync(
      "npx codeceptjs run --grep @smoke --steps 2>&1",
      { cwd: __dirname, encoding: "utf-8", timeout: 90_000 }
    );
  } catch (e) {
    stdout = (e.stdout || "") + "\n" + (e.stderr || "");
    exitCode = e.status ?? 1;
  }

  const durationMs = Date.now() - startedAt;
  console.log(`   Completed in ${(durationMs / 1000).toFixed(1)}s (exit ${exitCode})\n`);

  // 4) Parse output
  const lines = stdout.split("\n");
  const passed = [];
  const failed = [];
  let currentFeature = "";

  for (const line of lines) {
    const t = line.trim();
    if (t.match(/^[A-Z].*@smoke\s*--/) || t.startsWith("Feature:")) {
      currentFeature = t.replace(/ --$/, "").replace(/Feature:\s*/, "").replace(/@smoke/g, "").trim();
    }
    const okMatch = t.match(/✔\s+OK\s+in\s+(\d+)ms/);
    if (okMatch) {
      const prevLines = lines.slice(0, lines.indexOf(line));
      const scenarioLine = [...prevLines].reverse().find((l) => l.trim().startsWith("Scenario("));
      const name = scenarioLine
        ? prevLines[prevLines.indexOf(scenarioLine) - 1]?.trim() || "unknown"
        : "unknown";
      passed.push({ feature: currentFeature, name, ms: parseInt(okMatch[1]) });
    }
    const failMatch = t.match(/✖\s+FAILED\s+in\s+(\d+)ms/);
    if (failMatch) {
      const prevLines = lines.slice(0, lines.indexOf(line));
      const scenarioLine = [...prevLines].reverse().find((l) => l.trim().startsWith("Scenario("));
      const name = scenarioLine
        ? prevLines[prevLines.indexOf(scenarioLine) - 1]?.trim() || "unknown"
        : "unknown";
      failed.push({ feature: currentFeature, name, ms: parseInt(failMatch[1]), detail: "" });
    }
  }

  // Grab failure detail blocks
  const failureSection = stdout.split("-- FAILURES:")[1] || "";
  const failBlocks = failureSection.split(/\n\s+\d+\)\s+/).filter(Boolean);
  for (let i = 0; i < failBlocks.length && i < failed.length; i++) {
    failed[i].detail = failBlocks[i].split("\n").slice(0, 6).join("\n").trim();
  }

  // Summary
  const summaryMatch = stdout.match(/(\d+)\s+passed.*?(\d+)\s+failed/i);
  const totalPassed = summaryMatch ? parseInt(summaryMatch[1]) : passed.length;
  const totalFailed = summaryMatch ? parseInt(summaryMatch[2]) : failed.length;
  const finalStatus = totalFailed > 0 ? "failed" : exitCode !== 0 ? "error" : "passed";

  console.log(`3. Results: ${totalPassed} passed, ${totalFailed} failed → ${finalStatus}`);

  // 5) Patch run with final status + logs
  const logSnippet = stdout.slice(-2000);
  await api("PATCH", `/runs/${runId}`, {
    status: finalStatus,
    durationMs,
    logs: logSnippet,
  });
  console.log("   Run status updated.\n");

  // 6) Post failure events
  if (failed.length > 0) {
    console.log("4. Posting failure events...");
    for (const f of failed) {
      const msg = f.detail || `${f.feature} > ${f.name} failed in ${f.ms}ms`;
      await api("POST", `/runs/${runId}/failure`, {
        message: msg,
        stack: f.detail,
        caseName: `${f.feature} > ${f.name}`,
      });
      console.log(`   - ${f.feature} > ${f.name}`);
    }
  }

  // 7) Trigger analysis
  if (totalFailed > 0) {
    console.log("\n5. Triggering failure analysis...");
    const analysis = await api("POST", `/runs/${runId}/analyze`, {});
    console.log("   Classification:", analysis.classification);
    console.log("   Confidence:", analysis.confidence);
    console.log("   Summary:", analysis.summary);
  }

  // 8) Save local report
  const outDir = path.join(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  const report = {
    runId,
    status: finalStatus,
    totalPassed,
    totalFailed,
    durationMs,
    passed,
    failed,
  };
  const reportFile = path.join(outDir, `run-${runId}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Run ID:  ${runId}`);
  console.log(`Status:  ${finalStatus}`);
  console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`Report:  ${reportFile}`);
  console.log(`View:    http://localhost:3000/runs/${runId}`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
