Feature("Login @smoke");

Scenario("should show login form", ({ I }) => {
  I.amOnPage("/login");
  I.see("Sign In");
  I.seeElement("#username");
  I.seeElement("#password");
  I.seeElement("#login-btn");
});

Scenario("should reject invalid credentials", ({ I }) => {
  I.amOnPage("/login");
  I.fillField("#username", "wrong");
  I.fillField("#password", "wrong");
  I.click("#login-btn");
  I.see("Invalid username or password", "#login-error");
});

Scenario("should login with admin/admin and see welcome text", ({ I }) => {
  I.amOnPage("/login");
  I.fillField("#username", "admin");
  I.fillField("#password", "admin");
  I.click("#login-btn");
  I.waitInUrl("/welcome", 5);
  I.see("Welcome to Shipgate", "#welcome-heading");
  I.see("You have successfully logged in.", "#welcome-message");
});

Scenario("should logout and return to login", ({ I }) => {
  I.amOnPage("/login");
  I.fillField("#username", "admin");
  I.fillField("#password", "admin");
  I.click("#login-btn");
  I.waitInUrl("/welcome", 5);
  I.click("#logout-btn");
  I.waitInUrl("/login", 5);
  I.see("Sign In");
});
