/**
 * Seeds the Shipgate API with the Dummy App + Smoke Test Suite.
 * Prints the SUITE_ID, APP_ID, ENV_ID for use by the reporter.
 *
 * Usage: node seed-shipgate.js
 */

const API = process.env.SHIPGATE_API || "http://localhost:4000";

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

async function main() {
  // Check if "Dummy QA App" already exists
  const apps = await get("/applications");
  let app = apps.find((a) => a.name === "Dummy QA App");

  if (!app) {
    console.log("Creating application: Dummy QA App…");
    app = await post("/applications", {
      name: "Dummy QA App",
      baseUrl: "http://localhost:3099",
      jiraProjectKey: "DUM",
      jenkinsJobName: "dummy-smoke",
    });
    console.log("Created:", app.id);
  } else {
    console.log("Application already exists:", app.id);
  }

  // Check if "Smoke" suite exists for this app
  const suites = await get("/suites");
  let suite = suites.find(
    (s) => s.applicationId === app.id && s.name === "Smoke"
  );

  if (!suite) {
    console.log("Creating suite: Smoke…");
    suite = await post("/suites", {
      name: "Smoke",
      applicationId: app.id,
      description: "CodeceptJS smoke tests for the Dummy QA App",
      owner: "qa-lead",
      tags: ["smoke", "e2e", "codeceptjs"],
    });
    console.log("Created:", suite.id);
  } else {
    console.log("Suite already exists:", suite.id);
  }

  console.log("\n--- Copy these for running tests ---");
  console.log(`export APP_ID="${app.id}"`);
  console.log(`export SUITE_ID="${suite.id}"`);
  console.log(`export ENV_ID=""`);
  console.log("-----------------------------------\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
