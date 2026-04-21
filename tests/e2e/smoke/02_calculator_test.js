const fixtures = require('../data/fixtures');

Feature('Calculator Functionality @smoke');

Scenario('Standard mortgage calculation produces results', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);
  I.seeElement(calculatorPage.results.principalInterest);
  I.seeElement(calculatorPage.results.totalLoan);
  I.seeElement(calculatorPage.results.totalInterest);
});

Scenario('Monthly payment breakdown shows all components', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.principalInterest);
  I.seeElement(calculatorPage.results.monthlyTax);
  I.seeElement(calculatorPage.results.monthlyInsurance);
});

Scenario('Reset button clears the form', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.section);
  calculatorPage.reset();
  I.seeInField(calculatorPage.fields.homePrice, '350000');
});

Scenario('15-year mortgage can be calculated', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.fifteenYear);
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);
  I.seeElement(calculatorPage.results.totalLoan);
});

Scenario('Calculation with HOA fee included', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.withHoa);
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);
  I.seeElement(calculatorPage.results.monthlyHoa);
});
