import type { GeneratedScenario } from "./generator.js";

const API_BASE = process.env.SHIPGATE_API || "http://localhost:4000";

async function getApplicationId(): Promise<string> {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error(`Failed to fetch applications: ${res.statusText}`);
  const apps: Array<{ id: string; name: string }> = await res.json();

  const dummyApp = apps.find((a) => a.name === "Dummy QA App");
  if (dummyApp) return dummyApp.id;
  if (apps.length > 0) return apps[0].id;

  throw new Error(
    'No applications found. Run "node tests/e2e/seed-shipgate.js" first.'
  );
}

export async function reportScenarios(
  scenarios: GeneratedScenario[],
  dryRun: boolean
): Promise<void> {
  console.log(`\n📤 Reporting ${scenarios.length} scenarios to Shipgate API …\n`);

  if (dryRun) {
    for (const s of scenarios) {
      console.log(`  [DRY] ${s.priority} | ${s.category.padEnd(12)} | ${s.title}`);
    }
    console.log("\n✅ Dry run complete - nothing was sent to the API.\n");
    return;
  }

  const applicationId = await getApplicationId();
  console.log(`  Application: ${applicationId}\n`);

  const res = await fetch(`${API_BASE}/conductor/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId, suggestions: scenarios }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const result: { created: number } = await res.json();
  console.log(`✅ Created ${result.created} test suggestions in Shipgate`);
  console.log(`   View them at: http://localhost:3000/conductor\n`);
}
