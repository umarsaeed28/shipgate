const fixtures = require('../data/fixtures');

Feature('Quick Validation @smoke');

Scenario('Multiple calculations can be performed sequentially', ({ I, calculatorPage }) => {
  I.amOnPage('/');

  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);

  calculatorPage.reset();
  calculatorPage.fillMortgageForm(fixtures.fifteenYear);
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);
});

Scenario('Low down payment calculation works', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.lowDownPayment);
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);
  I.seeElement(calculatorPage.results.totalLoan);
});
