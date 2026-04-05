Feature("Mortgage Calculator @smoke");

Before(({ I }) => {
  I.login();
});

Scenario("should show all calculator form fields", ({ I }) => {
  I.seeElement("#principal");
  I.seeElement("#downPayment");
  I.seeElement("#rate");
  I.seeElement("#years");
  I.seeElement("#calculate-btn");
  I.seeElement("#reset-btn");
});

Scenario("should calculate a standard 30-year mortgage", ({ I }) => {
  I.fillField("#principal", "300000");
  I.fillField("#downPayment", "60000");
  I.fillField("#rate", "6.5");
  I.selectOption("#years", "30 years");
  I.click("#calculate-btn");
  I.waitForElement("#results", 5);
  I.see("Your Monthly Payment");
  I.seeElement("#monthly-payment");
  I.see("$240,000.00", "#loan-amount");
  I.see("$60,000.00", "#down-payment-display");
  I.see("6.5%", "#interest-rate");
  I.see("30 years", "#loan-term");
});

Scenario("should calculate a 15-year mortgage", ({ I }) => {
  I.fillField("#principal", "400000");
  I.fillField("#downPayment", "80000");
  I.fillField("#rate", "5.75");
  I.selectOption("#years", "15 years");
  I.click("#calculate-btn");
  I.waitForElement("#results", 5);
  I.see("Your Monthly Payment");
  I.see("$320,000.00", "#loan-amount");
  I.see("15 years", "#loan-term");
  I.see("5.75%", "#interest-rate");
});

Scenario("should show total interest paid", ({ I }) => {
  I.fillField("#principal", "250000");
  I.fillField("#downPayment", "0");
  I.fillField("#rate", "7");
  I.selectOption("#years", "30 years");
  I.click("#calculate-btn");
  I.waitForElement("#results", 5);
  I.see("Total Interest", "#results");
  I.seeElement("#total-interest");
  I.seeElement("#total-payment");
});

Scenario("should show validation error for down payment exceeding price", ({ I }) => {
  I.fillField("#principal", "200000");
  I.fillField("#downPayment", "250000");
  I.fillField("#rate", "6");
  I.click("#calculate-btn");
  I.see("Down payment must be less than home price", "#calc-error");
  I.dontSeeElement("#results");
});

Scenario("should handle zero interest rate", ({ I }) => {
  I.fillField("#principal", "100000");
  I.fillField("#downPayment", "0");
  I.fillField("#rate", "0");
  I.selectOption("#years", "10 years");
  I.click("#calculate-btn");
  I.waitForElement("#results", 5);
  I.see("$0.00", "#total-interest");
  I.see("10 years", "#loan-term");
});
