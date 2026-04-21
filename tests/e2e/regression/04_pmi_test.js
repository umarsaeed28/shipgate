const fixtures = require('../data/fixtures');
const assert = require('assert');

Feature('PMI (Private Mortgage Insurance) @regression');

Scenario('PMI appears when down payment is less than 20%', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.lowDownPayment);
  I.wait(1);
  I.click(calculatorPage.fields.pmiToggle);
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 15);

  // 5% down on $350K => should trigger PMI
  I.seeElement(calculatorPage.results.monthlyPmi);
  const text = await I.grabTextFrom(calculatorPage.results.monthlyPmi);
  const pmi = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(pmi > 0, `PMI should be > $0 for 5% down payment, got $${pmi}`);
});

Scenario('PMI does not appear when down payment is exactly 20%', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.twentyPercentDown);
  calculatorPage.calculate();

  // $70K on $350K = exactly 20% - PMI element should not render
  I.dontSeeElement(calculatorPage.results.monthlyPmi);
});

Scenario('PMI appears when down payment is just under 20%', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.justUnderTwentyPercent);
  I.wait(1);
  I.click(calculatorPage.fields.pmiToggle);
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 15);

  // $69K on $350K = ~19.7% - should trigger PMI
  I.seeElement(calculatorPage.results.monthlyPmi);
  const text = await I.grabTextFrom(calculatorPage.results.monthlyPmi);
  const pmi = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(pmi > 0, `PMI should be > $0 for 19.7% down, got $${pmi}`);
});

Scenario('PMI is included in total monthly payment', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.lowDownPayment);
  I.wait(1);
  I.click(calculatorPage.fields.pmiToggle);
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 15);

  const totalText = await I.grabTextFrom(calculatorPage.results.monthlyPayment);
  const totalPayment = parseFloat(totalText.replace(/[^0-9.]/g, ''));

  const piText = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const piPayment = parseFloat(piText.replace(/[^0-9.]/g, ''));

  const taxText = await I.grabTextFrom(calculatorPage.results.monthlyTax);
  const taxPayment = parseFloat(taxText.replace(/[^0-9.]/g, ''));

  const insText = await I.grabTextFrom(calculatorPage.results.monthlyInsurance);
  const insPayment = parseFloat(insText.replace(/[^0-9.]/g, ''));

  const pmiText = await I.grabTextFrom(calculatorPage.results.monthlyPmi);
  const pmiPayment = parseFloat(pmiText.replace(/[^0-9.]/g, ''));

  const expectedTotal = piPayment + taxPayment + insPayment + pmiPayment;
  const diff = Math.abs(totalPayment - expectedTotal);
  assert(
    diff <= 5,
    `Total $${totalPayment} doesn't match sum of components ` +
    `(P&I $${piPayment} + Tax $${taxPayment} + Ins $${insPayment} + PMI $${pmiPayment} = $${expectedTotal})`,
  );
});

Scenario('PMI toggle controls PMI visibility', ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.lowDownPayment);
  I.wait(1);
  I.click(calculatorPage.fields.pmiToggle);
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 15);

  I.seeElement(calculatorPage.results.monthlyPmi);

  // Toggle PMI off
  I.click(calculatorPage.fields.pmiToggle);
  I.click(calculatorPage.buttons.calculate);
  I.waitForElement(calculatorPage.results.section, 15);

  // After toggling off, PMI element should not be rendered
  I.dontSeeElement(calculatorPage.results.monthlyPmi);
});
