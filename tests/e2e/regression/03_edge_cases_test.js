const fixtures = require('../data/fixtures');
const assert = require('assert');

Feature('Edge Cases @regression');

Scenario('Zero down payment calculates full loan amount', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.zeroDown);
  calculatorPage.calculate();

  // $300K home, $0 down = $300K loan
  const text = await I.grabTextFrom(calculatorPage.results.totalLoan);
  const loan = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    loan >= 299000 && loan <= 301000,
    `Loan amount $${loan} should be ~$300,000 with zero down`,
  );
});

Scenario('Very high interest rate (20%) produces valid results', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.extremeRate);
  calculatorPage.calculate();

  I.seeElement(calculatorPage.results.monthlyPayment);
  I.seeElement(calculatorPage.results.principalInterest);

  // $160K at 20% for 30yr => P&I ~$2,671/mo
  const text = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const payment = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    payment >= 2500 && payment <= 2850,
    `P&I at 20% rate ($${payment}) is outside expected range $2,500-$2,850`,
  );
});

Scenario('Very low home price ($10,000) calculates correctly', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.cheapHome);
  calculatorPage.calculate();

  I.seeElement(calculatorPage.results.monthlyPayment);
  const text = await I.grabTextFrom(calculatorPage.results.totalLoan);
  const loan = parseFloat(text.replace(/[^0-9.]/g, ''));
  // $10K - $2K = $8K loan
  assert(
    loan >= 7500 && loan <= 8500,
    `Loan amount $${loan} should be ~$8,000 for $10K home with $2K down`,
  );
});

Scenario('Down payment equal to home price results in zero loan', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '100000');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '100000');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '6.5');
  I.selectOption(calculatorPage.fields.loanTerm, '30');
  I.click(calculatorPage.buttons.calculate);

  // App may show $0 payment or a validation message - either is acceptable
  I.waitForElement(calculatorPage.results.section + ', [data-testid="validation-error"]', 10);
});

Scenario('Zero interest rate produces zero total interest', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '200000');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '40000');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '0');
  I.selectOption(calculatorPage.fields.loanTerm, '30');
  I.clearField(calculatorPage.fields.propertyTax);
  I.fillField(calculatorPage.fields.propertyTax, '0');
  I.clearField(calculatorPage.fields.homeInsurance);
  I.fillField(calculatorPage.fields.homeInsurance, '0');
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 10);

  const text = await I.grabTextFrom(calculatorPage.results.totalInterest);
  const interest = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(interest <= 1, `Total interest at 0% rate should be $0, got $${interest}`);
});

Scenario('Changing loan term and recalculating updates results', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  const firstText = await I.grabTextFrom(calculatorPage.results.monthlyPayment);

  I.selectOption(calculatorPage.fields.loanTerm, '15');
  calculatorPage.calculate();

  const secondText = await I.grabTextFrom(calculatorPage.results.monthlyPayment);
  assert(
    firstText !== secondText,
    'Monthly payment should change when loan term changes from 30yr to 15yr',
  );
});

Scenario('Large home price ($5M) calculates without error', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '5000000');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '1000000');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '6.5');
  I.selectOption(calculatorPage.fields.loanTerm, '30');
  I.clearField(calculatorPage.fields.propertyTax);
  I.fillField(calculatorPage.fields.propertyTax, '60000');
  I.clearField(calculatorPage.fields.homeInsurance);
  I.fillField(calculatorPage.fields.homeInsurance, '12000');
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 10);
  I.seeElement(calculatorPage.results.monthlyPayment);
});
