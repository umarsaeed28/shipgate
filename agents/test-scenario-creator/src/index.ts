import { crawlApp } from "./crawler.js";
import { generateScenarios } from "./generator.js";
import { reportScenarios } from "./reporter.js";

const TARGET_URL = process.env.TARGET_URL || "http://localhost:3099";
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Shipgate - Test Scenario Creator Agent     ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`  Target:   ${TARGET_URL}`);
  console.log(`  API:      ${process.env.SHIPGATE_API || "http://localhost:4000"}`);
  console.log(`  Dry run:  ${DRY_RUN}`);

  // 1. Crawl the target application
  const pages = await crawlApp(TARGET_URL);
  console.log("Pages discovered:");
  for (const p of pages) {
    const formCount = p.forms.length;
    const linkCount = p.links.length;
    console.log(
      `  ${p.path.padEnd(20)} ${formCount} form(s), ${linkCount} link(s), ${p.headings.length} heading(s)`
    );
  }

  // 2. Generate test scenarios from page analysis
  const scenarios = generateScenarios(pages);
  console.log(`\n📝 Generated ${scenarios.length} test scenarios:\n`);
  for (const s of scenarios) {
    console.log(`  ${s.priority} | ${s.category.padEnd(12)} | ${s.title}`);
  }

  // 3. Report to Shipgate API
  await reportScenarios(scenarios, DRY_RUN);
}

main().catch((err) => {
  console.error("Agent failed:", err);
  process.exit(1);
});
