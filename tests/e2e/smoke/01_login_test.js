Feature("Login @smoke");

Scenario("should display the login form", ({ I }) => {
  I.amOnPage("/login");
  I.see("Mortgage Calculator");
  I.see("Sign in to access the calculator");
  I.seeElement("#username");
  I.seeElement("#password");
  I.seeElement("#login-btn");
});

Scenario("should reject invalid credentials", ({ I }) => {
  I.amOnPage("/login");
  I.fillField("#username", "bad");
  I.fillField("#password", "bad");
  I.click("#login-btn");
  I.see("Invalid username or password", "#login-error");
});

Scenario("should log in with admin/admin", ({ I }) => {
  I.amOnPage("/login");
  I.fillField("#username", "admin");
  I.fillField("#password", "admin");
  I.click("#login-btn");
  I.waitInUrl("/calculator", 5);
  I.see("Mortgage Calculator");
  I.seeElement("#calc-form");
});

Scenario("should redirect unauthenticated user to login", ({ I }) => {
  I.amOnPage("/calculator");
  I.waitInUrl("/login", 5);
  I.see("Sign in to access the calculator");
});

Scenario("should logout and redirect to login", ({ I }) => {
  I.login();
  I.click("Logout");
  I.waitInUrl("/login", 5);
  I.see("Sign in");
});

