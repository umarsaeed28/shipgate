Feature("Calculation History @smoke");

Before(({ I }) => {
  I.login();
});

Scenario("should show history page with navigation", ({ I }) => {
  I.click("History");
  I.waitInUrl("/history", 5);
  I.see("Calculation History");
  I.seeElement("#history-table");
});

Scenario("should record a calculation in history", ({ I }) => {
  I.fillField("#principal", "500000");
  I.fillField("#downPayment", "100000");
  I.fillField("#rate", "6.25");
  I.selectOption("#years", "30 years");
  I.click("#calculate-btn");
  I.waitForElement("#results", 5);

  I.click("History");
  I.waitInUrl("/history", 5);
  I.see("$500,000.00", "#history-body");
  I.see("6.25%", "#history-body");
  I.see("30 yrs", "#history-body");
});

Scenario("should navigate between calculator and history", ({ I }) => {
  I.click("History");
  I.waitInUrl("/history", 5);
  I.see("Calculation History");

  I.click("Calculator");
  I.waitInUrl("/calculator", 5);
  I.see("Mortgage Calculator");
});
