/**
 * MCP-backed Test Planner Agent
 *
 * Explores the system under test using Playwright MCP tools, discovers pages,
 * forms, navigation flows, and interactive elements. Combines this with user
 * stories to produce a comprehensive test plan.
 */

import type { AgentContext, AgentResult } from "./types.js";
import type {
  PlannerInput,
  TestPlanOutput,
  PlannedTestCase,
  TestPlanner,
} from "./test-planner.js";
import { McpBrowser, type McpCallFn, type PageSnapshot } from "./mcp-browser.js";

interface DiscoveredPage {
  url: string;
  title: string;
  forms: string[];
  inputs: string[];
  buttons: string[];
  links: string[];
  headings: string[];
}

export class McpTestPlanner implements TestPlanner {
  private browser: McpBrowser;

  constructor(callMcp: McpCallFn) {
    this.browser = new McpBrowser(callMcp);
  }

  async plan(
    _ctx: AgentContext,
    input: PlannerInput
  ): Promise<AgentResult<TestPlanOutput>> {
    try {
      const pages = await this.exploreApp(input.baseUrl);
      const cases = this.buildTestCases(input, pages);
      const planMarkdown = this.generatePlanMarkdown(input, pages, cases);
      const coverageSummary = this.buildCoverageSummary(input, pages, cases);

      return {
        ok: true,
        data: { planMarkdown, cases, coverageSummary },
      };
    } catch (err) {
      return {
        ok: false,
        error: `Planner failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private async exploreApp(baseUrl: string): Promise<DiscoveredPage[]> {
    const pages: DiscoveredPage[] = [];
    const visited = new Set<string>();

    const toVisit = [
      "/login",
      "/",
    ];

    for (const path of toVisit) {
      const url = `${baseUrl}${path}`;
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        const snap = await this.browser.explore(url);
        const page = this.extractPageInfo(url, snap);
        pages.push(page);

        for (const link of page.links) {
          try {
            const linkUrl = new URL(link, baseUrl);
            if (
              linkUrl.origin === new URL(baseUrl).origin &&
              !visited.has(linkUrl.href)
            ) {
              toVisit.push(linkUrl.pathname);
            }
          } catch {}
        }
      } catch {
        pages.push({
          url,
          title: "Error loading page",
          forms: [],
          inputs: [],
          buttons: [],
          links: [],
          headings: [],
        });
      }
    }

    // After login, explore authenticated pages
    try {
      await this.browser.navigate(`${baseUrl}/login`);
      await this.browser.wait(0.5);
      const loginSnap = await this.browser.interactiveSnapshot();

      const usernameEl = loginSnap.interactive.find(
        (e) => e.name.toLowerCase().includes("username") || e.ref?.includes("username")
      );
      const passwordEl = loginSnap.interactive.find(
        (e) => e.name.toLowerCase().includes("password") || e.ref?.includes("password")
      );
      const loginBtn = loginSnap.interactive.find(
        (e) => e.name.toLowerCase().includes("log") || e.name.toLowerCase().includes("sign")
      );

      if (usernameEl && passwordEl && loginBtn) {
        await this.browser.fill("username field", usernameEl.ref, "admin");
        await this.browser.fill("password field", passwordEl.ref, "admin");
        await this.browser.click("login button", loginBtn.ref);
        await this.browser.wait(1);

        const authPaths = ["/calculator", "/dashboard", "/welcome", "/history"];
        for (const path of authPaths) {
          const url = `${baseUrl}${path}`;
          if (visited.has(url)) continue;
          visited.add(url);

          try {
            const snap = await this.browser.explore(url);
            if (!snap.tree.includes("login") || snap.tree.includes("Calculator")) {
              pages.push(this.extractPageInfo(url, snap));
            }
          } catch {}
        }
      }
    } catch {}

    return pages;
  }

  private extractPageInfo(url: string, snap: PageSnapshot): DiscoveredPage {
    const tree = snap.tree;
    const forms: string[] = [];
    const inputs: string[] = [];
    const buttons: string[] = [];
    const links: string[] = [];
    const headings: string[] = [];

    for (const el of snap.interactive) {
      const role = el.role.toLowerCase();
      if (role === "textbox" || role === "input" || role === "spinbutton" || role === "combobox") {
        inputs.push(el.name || el.ref);
      } else if (role === "button") {
        buttons.push(el.name || el.ref);
      } else if (role === "link") {
        links.push(el.name || el.ref);
      }
    }

    const headingMatches = tree.match(/heading\s+"([^"]+)"/gi) || [];
    for (const m of headingMatches) {
      const title = m.match(/"([^"]+)"/)?.[1];
      if (title) headings.push(title);
    }

    if (inputs.length > 0 || buttons.length > 0) {
      forms.push(`Form with inputs: [${inputs.join(", ")}] and buttons: [${buttons.join(", ")}]`);
    }

    return { url, title: snap.title || url, forms, inputs, buttons, links, headings };
  }

  private buildTestCases(
    input: PlannerInput,
    pages: DiscoveredPage[]
  ): PlannedTestCase[] {
    const cases: PlannedTestCase[] = [];

    const loginPage = pages.find((p) => p.url.includes("/login"));
    if (loginPage) {
      cases.push({
        title: "Login form is displayed correctly",
        category: "happy_path",
        priority: "P0",
        preconditions: "User is not authenticated",
        steps: [
          "Navigate to /login",
          "Verify login form is visible",
          `Verify inputs present: ${loginPage.inputs.join(", ")}`,
          `Verify buttons present: ${loginPage.buttons.join(", ")}`,
        ],
        expectedResult: "Login form with all fields is displayed",
      });

      cases.push({
        title: "Successful login with valid credentials",
        category: "happy_path",
        priority: "P0",
        preconditions: "User is not authenticated",
        steps: [
          "Navigate to /login",
          "Fill username: admin",
          "Fill password: admin",
          "Click login button",
          "Wait for redirect",
        ],
        expectedResult: "User is redirected to the main application page",
      });

      cases.push({
        title: "Login rejected with invalid credentials",
        category: "negative",
        priority: "P0",
        preconditions: "User is not authenticated",
        steps: [
          "Navigate to /login",
          "Fill username: invalid",
          "Fill password: wrong",
          "Click login button",
        ],
        expectedResult: "Error message 'Invalid username or password' is displayed",
      });

      cases.push({
        title: "Unauthenticated access redirects to login",
        category: "security",
        priority: "P1",
        preconditions: "User is not authenticated",
        steps: [
          "Navigate directly to a protected page",
          "Verify redirect to /login",
        ],
        expectedResult: "User is redirected to the login page",
      });
    }

    const mainPages = pages.filter((p) => !p.url.includes("/login"));
    for (const page of mainPages) {
      const pageName = page.headings[0] || new URL(page.url).pathname;

      if (page.inputs.length > 0) {
        cases.push({
          title: `${pageName} — form fields are displayed`,
          category: "happy_path",
          priority: "P0",
          preconditions: "User is authenticated",
          steps: [
            `Navigate to ${new URL(page.url).pathname}`,
            `Verify form inputs: ${page.inputs.join(", ")}`,
            `Verify buttons: ${page.buttons.join(", ")}`,
          ],
          expectedResult: "All form fields and buttons are visible",
        });

        cases.push({
          title: `${pageName} — submit with valid data`,
          category: "happy_path",
          priority: "P0",
          preconditions: "User is authenticated",
          steps: [
            `Navigate to ${new URL(page.url).pathname}`,
            "Fill all required fields with valid data",
            "Click submit button",
            "Verify results or success feedback",
          ],
          expectedResult: "Form submission succeeds and results are displayed",
        });

        cases.push({
          title: `${pageName} — submit with invalid data`,
          category: "negative",
          priority: "P1",
          preconditions: "User is authenticated",
          steps: [
            `Navigate to ${new URL(page.url).pathname}`,
            "Fill fields with invalid or boundary data",
            "Click submit button",
          ],
          expectedResult: "Appropriate validation error is shown",
        });

        cases.push({
          title: `${pageName} — edge case: zero/empty values`,
          category: "edge",
          priority: "P2",
          preconditions: "User is authenticated",
          steps: [
            `Navigate to ${new URL(page.url).pathname}`,
            "Submit form with zero or empty values",
          ],
          expectedResult: "Application handles edge case gracefully",
        });
      }

      if (page.headings.length > 0 && page.inputs.length === 0) {
        cases.push({
          title: `${pageName} — page content is displayed`,
          category: "happy_path",
          priority: "P1",
          preconditions: "User is authenticated",
          steps: [
            `Navigate to ${new URL(page.url).pathname}`,
            `Verify heading: ${page.headings.join(", ")}`,
          ],
          expectedResult: "Page content is displayed correctly",
        });
      }
    }

    for (const story of input.userStories) {
      const existing = cases.some((c) => c.title.toLowerCase().includes(story.title.toLowerCase()));
      if (!existing) {
        cases.push({
          title: `[Story] ${story.title}`,
          category: "happy_path",
          priority: "P0",
          storyRef: story.key,
          preconditions: "User is authenticated",
          steps: story.criteria.map((c) => `Verify: ${c}`),
          expectedResult: "All acceptance criteria are met",
        });
      }
    }

    return cases;
  }

  private generatePlanMarkdown(
    input: PlannerInput,
    pages: DiscoveredPage[],
    cases: PlannedTestCase[]
  ): string {
    const byCategory = (cat: string) => cases.filter((c) => c.category === cat).length;

    const lines = [
      `# Test Plan — ${input.baseUrl}`,
      ``,
      `## Exploration Summary`,
      `- **Pages discovered:** ${pages.length}`,
      `- **Forms found:** ${pages.reduce((n, p) => n + p.forms.length, 0)}`,
      `- **Interactive elements:** ${pages.reduce((n, p) => n + p.inputs.length + p.buttons.length, 0)}`,
      `- **User stories:** ${input.userStories.length}`,
      ``,
      `## Pages`,
      ...pages.map((p) => `- **${p.title}** (${p.url}): ${p.inputs.length} inputs, ${p.buttons.length} buttons`),
      ``,
      `## Coverage`,
      `| Category | Count |`,
      `|----------|-------|`,
      `| Happy path | ${byCategory("happy_path")} |`,
      `| Negative | ${byCategory("negative")} |`,
      `| Edge case | ${byCategory("edge")} |`,
      `| Security | ${byCategory("security")} |`,
      `| **Total** | **${cases.length}** |`,
      ``,
      `## Test Cases`,
      ``,
    ];

    for (let i = 0; i < cases.length; i++) {
      const c = cases[i];
      lines.push(`### ${i + 1}. ${c.title}`);
      lines.push(`- **Category:** ${c.category}`);
      lines.push(`- **Priority:** ${c.priority}`);
      if (c.storyRef) lines.push(`- **Story:** ${c.storyRef}`);
      lines.push(`- **Preconditions:** ${c.preconditions}`);
      lines.push(`- **Steps:**`);
      for (const s of c.steps) lines.push(`  1. ${s}`);
      lines.push(`- **Expected:** ${c.expectedResult}`);
      lines.push(``);
    }

    return lines.join("\n");
  }

  private buildCoverageSummary(
    input: PlannerInput,
    pages: DiscoveredPage[],
    cases: PlannedTestCase[]
  ): string {
    return [
      `${cases.length} test cases generated from exploration of ${pages.length} pages`,
      `and ${input.userStories.length} user stories.`,
      `Coverage: ${cases.filter((c) => c.category === "happy_path").length} happy path,`,
      `${cases.filter((c) => c.category === "negative").length} negative,`,
      `${cases.filter((c) => c.category === "edge").length} edge,`,
      `${cases.filter((c) => c.category === "security").length} security.`,
    ].join(" ");
  }
}
