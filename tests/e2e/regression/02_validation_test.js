Feature('Form Validation @regression');

Scenario('Empty form shows validation errors on submit', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.clearField(calculatorPage.fields.downPayment);
  I.clearField(calculatorPage.fields.interestRate);
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');
});

Scenario('Negative home price is rejected', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '-100000');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '0');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '6.5');
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');
});

Scenario('Down payment exceeding home price is rejected', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '200000');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '250000');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '6.0');
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');
  I.dontSeeElement(calculatorPage.results.section);
});

Scenario('Negative interest rate is rejected', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '300000');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '60000');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '-5');
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');
});

Scenario('Non-numeric input in home price is handled', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, 'abc');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '10000');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '6.5');
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');
});

Scenario('Zero home price is rejected', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  I.clearField(calculatorPage.fields.homePrice);
  I.fillField(calculatorPage.fields.homePrice, '0');
  I.clearField(calculatorPage.fields.downPayment);
  I.fillField(calculatorPage.fields.downPayment, '0');
  I.clearField(calculatorPage.fields.interestRate);
  I.fillField(calculatorPage.fields.interestRate, '6.5');
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');
});

Scenario('Valid input clears previous validation errors', ({ I, calculatorPage }) => {
  I.amOnPage('/');

  I.clearField(calculatorPage.fields.homePrice);
  I.click(calculatorPage.buttons.calculate);
  I.seeElement('[data-testid="validation-error"]');

  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.section);
});
