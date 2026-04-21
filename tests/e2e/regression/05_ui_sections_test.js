const fixtures = require('../data/fixtures');

Feature('UI Sections & Components @regression');

Scenario('Amortization table renders after calculation', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  I.seeElement(calculatorPage.sections.amortizationTable);
  I.see('#', calculatorPage.sections.amortizationTable);
});

Scenario('Payment breakdown chart renders', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  I.seeElement(calculatorPage.sections.paymentBreakdown);
});

Scenario('Summary card displays key metrics', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  I.seeElement(calculatorPage.sections.summaryCard);
});

Scenario('All result fields are populated after calculation', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  calculatorPage.seeResultsSection();
  calculatorPage.seeFullBreakdown();
});

Scenario('Results hide when form is reset', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.section);

  calculatorPage.reset();
  I.dontSeeElement(calculatorPage.results.section);
});

Scenario('Demo mode toggle is functional', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.seeElement(calculatorPage.demo.modeToggle);
  I.click(calculatorPage.demo.modeToggle);
  I.seeElement(calculatorPage.demo.simulateBug);
  I.seeElement(calculatorPage.demo.simulateDelay);
});

Scenario('Simulate bug checkbox is clickable', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.click(calculatorPage.demo.modeToggle);
  I.checkOption(calculatorPage.demo.simulateBug);
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.section);
});

Scenario('Simulate delay checkbox is clickable', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.click(calculatorPage.demo.modeToggle);
  I.checkOption(calculatorPage.demo.simulateDelay);
  calculatorPage.fillStandardMortgage();
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 15);
  I.seeElement(calculatorPage.results.monthlyPayment);
});

Scenario('Amortization table has multiple rows', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  I.seeElement(calculatorPage.sections.amortizationTable);
  // 1 header row + 12 data rows = 13 total
  I.seeNumberOfElements(calculatorPage.sections.amortizationTable + ' tr', 13);
});
