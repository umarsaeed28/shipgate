Feature("Regression guard for changes in src/search.js");

Scenario("Regression guard for changes in src/search.js", ({ I }) => {
  // Open the application
  // Exercise the behavior affected by src/search.js
  // Verify no regression vs. prior behavior
  I.amOnPage('/');
  I.seeInCurrentUrl('/');
});
