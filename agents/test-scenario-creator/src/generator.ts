import type { PageInfo, FormInfo } from "./crawler.js";

export interface GeneratedScenario {
  title: string;
  description: string;
  category: string;
  priority: string;
  generatedCode: string;
  targetFile: string;
  triggerReason: string;
}

function selectorFor(id: string | null, fallback: string): string {
  return id ? `#${id}` : fallback;
}

function isLoginForm(form: FormInfo): boolean {
  const ids = form.inputs.map((i) => (i.id || i.name || i.type).toLowerCase());
  return (
    ids.some((id) => id.includes("user") || id.includes("email")) &&
    ids.some((id) => id.includes("pass"))
  );
}

function isCalculatorForm(form: FormInfo): boolean {
  const ids = form.inputs.map((i) => (i.id || i.name).toLowerCase());
  return (
    ids.some((id) => id.includes("principal") || id.includes("amount") || id.includes("price")) ||
    (ids.some((id) => id.includes("rate")) && form.selects.length > 0)
  );
}

function generateLoginScenarios(page: PageInfo, form: FormInfo): GeneratedScenario[] {
  const scenarios: GeneratedScenario[] = [];
  const userField = form.inputs.find((i) => (i.id || i.name || "").toLowerCase().includes("user"));
  const passField = form.inputs.find((i) => i.type === "password");
  const submitSel = selectorFor(form.submitButton?.id ?? null, 'button[type="submit"]');
  const userSel = selectorFor(userField?.id ?? null, 'input[name="username"]');
  const passSel = selectorFor(passField?.id ?? null, 'input[type="password"]');

  scenarios.push({
    title: "Login form should be visible with all fields",
    description: `Verify the login page at ${page.path} renders the username field, password field, and submit button.`,
    category: "smoke",
    priority: "P0",
    generatedCode: `Scenario("should display the login form", ({ I }) => {
  I.amOnPage("${page.path}");
  I.seeElement("${userSel}");
  I.seeElement("${passSel}");
  I.seeElement("${submitSel}");
});`,
    targetFile: "tests/e2e/smoke/01_login_test.js",
    triggerReason: `Discovered login form on ${page.path} with ${form.inputs.length} inputs`,
  });

  scenarios.push({
    title: "Login should reject invalid credentials",
    description: "Submit wrong username/password and verify an error message appears.",
    category: "smoke",
    priority: "P0",
    generatedCode: `Scenario("should reject invalid credentials", ({ I }) => {
  I.amOnPage("${page.path}");
  I.fillField("${userSel}", "wronguser");
  I.fillField("${passSel}", "wrongpass");
  I.click("${submitSel}");
  I.see("Invalid");
});`,
    targetFile: "tests/e2e/smoke/01_login_test.js",
    triggerReason: "Login form needs negative-path coverage for invalid credentials",
  });

  scenarios.push({
    title: "Login should succeed with valid credentials",
    description: "Log in with valid admin credentials and verify redirect to authenticated area.",
    category: "smoke",
    priority: "P0",
    generatedCode: `Scenario("should log in with valid credentials", ({ I }) => {
  I.amOnPage("${page.path}");
  I.fillField("${userSel}", "admin");
  I.fillField("${passSel}", "admin");
  I.click("${submitSel}");
  I.waitInUrl("/calculator", 5);
  I.seeElement("#calc-form");
});`,
    targetFile: "tests/e2e/smoke/01_login_test.js",
    triggerReason: "Login form needs positive-path coverage with valid credentials",
  });

  scenarios.push({
    title: "Login should require both fields",
    description: "Attempt login with empty fields and verify validation behavior.",
    category: "smoke",
    priority: "P1",
    generatedCode: `Scenario("should require username and password", ({ I }) => {
  I.amOnPage("${page.path}");
  I.click("${submitSel}");
  I.seeInCurrentUrl("${page.path}");
});`,
    targetFile: "tests/e2e/smoke/01_login_test.js",
    triggerReason: "Empty-field boundary case for login form",
  });

  scenarios.push({
    title: "Unauthenticated user should be redirected to login",
    description: "Navigate to a protected page without logging in and verify redirect.",
    category: "smoke",
    priority: "P1",
    generatedCode: `Scenario("should redirect unauthenticated user to login", ({ I }) => {
  I.amOnPage("/calculator");
  I.waitInUrl("/login", 5);
  I.see("Sign in");
});`,
    targetFile: "tests/e2e/smoke/01_login_test.js",
    triggerReason: "Auth guard redirect coverage for protected routes",
  });

  return scenarios;
}

function generateCalculatorScenarios(page: PageInfo, form: FormInfo): GeneratedScenario[] {
  const scenarios: GeneratedScenario[] = [];
  const submitSel = selectorFor(form.submitButton?.id ?? null, "#calculate-btn");
  const inputs = form.inputs.filter((i) => i.type !== "hidden");

  const inputMap: Record<string, string> = {};
  for (const inp of inputs) {
    inputMap[inp.id || inp.name] = selectorFor(inp.id, `input[name="${inp.name}"]`);
  }

  const selectMap: Record<string, { sel: string; options: string[] }> = {};
  for (const sel of form.selects) {
    selectMap[sel.id || sel.name] = {
      sel: selectorFor(sel.id, `select[name="${sel.name}"]`),
      options: sel.options,
    };
  }

  scenarios.push({
    title: "Calculator should display all form fields",
    description: `Verify all input fields, selects, and buttons are rendered on ${page.path}.`,
    category: "smoke",
    priority: "P0",
    generatedCode: `Scenario("should show all calculator form fields", ({ I }) => {
  I.login();
${inputs.map((i) => `  I.seeElement("${selectorFor(i.id, `input[name="${i.name}"]`)}");`).join("\n")}
${form.selects.map((s) => `  I.seeElement("${selectorFor(s.id, `select[name="${s.name}"]`)}");`).join("\n")}
  I.seeElement("${submitSel}");
});`,
    targetFile: "tests/e2e/smoke/02_calculator_test.js",
    triggerReason: `Calculator form with ${inputs.length} inputs and ${form.selects.length} selects found on ${page.path}`,
  });

  const principalSel = inputMap["principal"] || inputMap["amount"] || Object.values(inputMap)[0];
  const downSel = inputMap["downPayment"] || inputMap["down"] || "";
  const rateSel = inputMap["rate"] || inputMap["interestRate"] || "";
  const yearsSel = Object.values(selectMap)[0];

  if (principalSel && rateSel && yearsSel) {
    scenarios.push({
      title: "Calculator should compute a standard 30-year mortgage",
      description: "Fill in typical values for a 30-year mortgage and verify results appear.",
      category: "smoke",
      priority: "P0",
      generatedCode: `Scenario("should calculate a standard 30-year mortgage", ({ I }) => {
  I.login();
  I.fillField("${principalSel}", "300000");
${downSel ? `  I.fillField("${downSel}", "60000");\n` : ""}  I.fillField("${rateSel}", "6.5");
  I.selectOption("${yearsSel.sel}", "${yearsSel.options.find((o) => o.includes("30")) || yearsSel.options[yearsSel.options.length - 1]}");
  I.click("${submitSel}");
  I.waitForElement("#results", 5);
  I.see("Monthly Payment");
});`,
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
      triggerReason: "Core happy-path calculation for 30-year mortgage",
    });

    scenarios.push({
      title: "Calculator should compute a 15-year mortgage",
      description: "Fill in values for a shorter 15-year term and verify different output.",
      category: "smoke",
      priority: "P1",
      generatedCode: `Scenario("should calculate a 15-year mortgage", ({ I }) => {
  I.login();
  I.fillField("${principalSel}", "400000");
${downSel ? `  I.fillField("${downSel}", "80000");\n` : ""}  I.fillField("${rateSel}", "5.75");
  I.selectOption("${yearsSel.sel}", "${yearsSel.options.find((o) => o.includes("15")) || yearsSel.options[0]}");
  I.click("${submitSel}");
  I.waitForElement("#results", 5);
  I.see("Monthly Payment");
  I.see("15 years", "#loan-term");
});`,
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
      triggerReason: "Alternate term length coverage for 15-year mortgage",
    });

    scenarios.push({
      title: "Calculator should handle zero interest rate",
      description: "Set interest rate to 0 and verify total interest is $0.",
      category: "edge_case",
      priority: "P2",
      generatedCode: `Scenario("should handle zero interest rate", ({ I }) => {
  I.login();
  I.fillField("${principalSel}", "100000");
${downSel ? `  I.fillField("${downSel}", "0");\n` : ""}  I.fillField("${rateSel}", "0");
  I.selectOption("${yearsSel.sel}", "${yearsSel.options.find((o) => o.includes("10")) || yearsSel.options[0]}");
  I.click("${submitSel}");
  I.waitForElement("#results", 5);
  I.see("$0.00", "#total-interest");
});`,
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
      triggerReason: "Edge case: zero interest rate boundary",
    });

    if (downSel) {
      scenarios.push({
        title: "Calculator should validate down payment exceeding price",
        description: "Enter a down payment larger than the home price and expect a validation error.",
        category: "validation",
        priority: "P1",
        generatedCode: `Scenario("should show validation error for excessive down payment", ({ I }) => {
  I.login();
  I.fillField("${principalSel}", "200000");
  I.fillField("${downSel}", "250000");
  I.fillField("${rateSel}", "6");
  I.click("${submitSel}");
  I.see("Down payment must be less than home price");
  I.dontSeeElement("#results");
});`,
        targetFile: "tests/e2e/smoke/02_calculator_test.js",
        triggerReason: "Validation: down payment exceeds principal boundary",
      });
    }

    scenarios.push({
      title: "Calculator should display total interest paid",
      description: "After a calculation, verify the total interest and total payment are shown.",
      category: "smoke",
      priority: "P1",
      generatedCode: `Scenario("should show total interest paid", ({ I }) => {
  I.login();
  I.fillField("${principalSel}", "250000");
${downSel ? `  I.fillField("${downSel}", "0");\n` : ""}  I.fillField("${rateSel}", "7");
  I.selectOption("${yearsSel.sel}", "${yearsSel.options.find((o) => o.includes("30")) || yearsSel.options[yearsSel.options.length - 1]}");
  I.click("${submitSel}");
  I.waitForElement("#results", 5);
  I.see("Total Interest", "#results");
  I.seeElement("#total-interest");
  I.seeElement("#total-payment");
});`,
      targetFile: "tests/e2e/smoke/02_calculator_test.js",
      triggerReason: "Results panel completeness: total interest and total payment",
    });

    const resetBtn = page.buttons.find(
      (b) => b.text.toLowerCase().includes("reset") || b.id === "reset-btn"
    );
    if (resetBtn) {
      scenarios.push({
        title: "Calculator reset should clear the form",
        description: "Fill the form, click reset, and verify all fields are cleared.",
        category: "smoke",
        priority: "P2",
        generatedCode: `Scenario("should reset the form", ({ I }) => {
  I.login();
  I.fillField("${principalSel}", "500000");
  I.click("${selectorFor(resetBtn.id, 'button:has-text("Reset")')}");
  I.dontSeeElement("#results");
});`,
        targetFile: "tests/e2e/smoke/02_calculator_test.js",
        triggerReason: "Reset button functionality coverage",
      });
    }
  }

  return scenarios;
}

function generateNavigationScenarios(pages: PageInfo[]): GeneratedScenario[] {
  const scenarios: GeneratedScenario[] = [];
  const navLinks = pages
    .flatMap((p) => p.links)
    .filter((l) => ["Calculator", "History"].includes(l.text))
    .reduce((acc, l) => {
      if (!acc.find((a) => a.text === l.text)) acc.push(l);
      return acc;
    }, [] as { href: string; text: string }[]);

  if (navLinks.length >= 2) {
    scenarios.push({
      title: "Navigation between calculator and history should work",
      description: "Click nav links to move between pages and verify correct content loads.",
      category: "smoke",
      priority: "P1",
      generatedCode: `Scenario("should navigate between calculator and history", ({ I }) => {
  I.login();
  I.click("History");
  I.waitInUrl("/history", 5);
  I.see("Calculation History");
  I.click("Calculator");
  I.waitInUrl("/calculator", 5);
  I.see("Mortgage Calculator");
});`,
      targetFile: "tests/e2e/smoke/03_history_test.js",
      triggerReason: `Navigation links found: ${navLinks.map((l) => l.text).join(", ")}`,
    });
  }

  const historyPage = pages.find((p) => p.path.includes("history"));
  if (historyPage) {
    scenarios.push({
      title: "History page should display table",
      description: "Navigate to history and verify the history table is rendered.",
      category: "smoke",
      priority: "P1",
      generatedCode: `Scenario("should show history page with table", ({ I }) => {
  I.login();
  I.click("History");
  I.waitInUrl("/history", 5);
  I.see("Calculation History");
  I.seeElement("#history-table");
});`,
      targetFile: "tests/e2e/smoke/03_history_test.js",
      triggerReason: "History page discovered with table element",
    });

    scenarios.push({
      title: "History should record a calculation",
      description: "Perform a mortgage calculation, navigate to history, and verify the entry appears.",
      category: "smoke",
      priority: "P1",
      generatedCode: `Scenario("should record a calculation in history", ({ I }) => {
  I.login();
  I.fillField("#principal", "500000");
  I.fillField("#downPayment", "100000");
  I.fillField("#rate", "6.25");
  I.selectOption("#years", "30 years");
  I.click("#calculate-btn");
  I.waitForElement("#results", 5);
  I.click("History");
  I.waitInUrl("/history", 5);
  I.see("$500,000", "#history-body");
});`,
      targetFile: "tests/e2e/smoke/03_history_test.js",
      triggerReason: "History data persistence: verify calculation appears in history",
    });
  }

  return scenarios;
}

function generateLogoutScenarios(pages: PageInfo[]): GeneratedScenario[] {
  const logoutBtn = pages
    .flatMap((p) => p.buttons.concat(p.links as any[]))
    .find((b) => (b.text || "").toLowerCase().includes("logout"));

  if (!logoutBtn) return [];

  return [
    {
      title: "Logout should redirect to login",
      description: "After logging in, click logout and verify redirect back to login page.",
      category: "smoke",
      priority: "P1",
      generatedCode: `Scenario("should logout and redirect to login", ({ I }) => {
  I.login();
  I.click("Logout");
  I.waitInUrl("/login", 5);
  I.see("Sign in");
});`,
      targetFile: "tests/e2e/smoke/01_login_test.js",
      triggerReason: "Logout button found - session teardown coverage",
    },
  ];
}

export function generateScenarios(pages: PageInfo[]): GeneratedScenario[] {
  const scenarios: GeneratedScenario[] = [];

  for (const page of pages) {
    for (const form of page.forms) {
      if (isLoginForm(form)) {
        scenarios.push(...generateLoginScenarios(page, form));
      } else if (isCalculatorForm(form)) {
        scenarios.push(...generateCalculatorScenarios(page, form));
      }
    }
  }

  scenarios.push(...generateNavigationScenarios(pages));
  scenarios.push(...generateLogoutScenarios(pages));

  return scenarios;
}
