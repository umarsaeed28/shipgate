Feature('App Loading @smoke');

Scenario('App loads successfully', ({ I }) => {
  I.amOnPage('/');
  I.seeElement('[data-testid="home-price-input"]');
  I.seeElement('[data-testid="calculate-button"]');
  I.see('Mortgage Calculator');
});

Scenario('Main form renders all input fields', ({ I }) => {
  I.amOnPage('/');
  I.seeElement('[data-testid="home-price-input"]');
  I.seeElement('[data-testid="down-payment-input"]');
  I.seeElement('[data-testid="interest-rate-input"]');
  I.seeElement('[data-testid="loan-term-select"]');
  I.seeElement('[data-testid="property-tax-input"]');
  I.seeElement('[data-testid="home-insurance-input"]');
  I.seeElement('[data-testid="hoa-fee-input"]');
});

Scenario('Calculate and reset buttons are present', ({ I }) => {
  I.amOnPage('/');
  I.seeElement('[data-testid="calculate-button"]');
  I.seeElement('[data-testid="reset-button"]');
});

Scenario('Submit button triggers calculation and shows results', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  I.click('[data-testid="calculate-button"]');
  I.waitForElement('[data-testid="results-section"]', 10);
  I.seeElement('[data-testid="monthly-payment-total"]');
});

Scenario('Results section appears after calculation', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();
  I.seeElement(calculatorPage.results.monthlyPayment);
  I.seeElement(calculatorPage.results.principalInterest);
  I.seeElement(calculatorPage.results.totalLoan);
  I.seeElement(calculatorPage.results.totalInterest);
});

Scenario('Demo mode controls are visible', ({ I }) => {
  I.amOnPage('/');
  I.seeElement('[data-testid="demo-mode-toggle"]');
});
