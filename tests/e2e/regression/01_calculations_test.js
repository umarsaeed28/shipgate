const fixtures = require('../data/fixtures');
const assert = require('assert');

Feature('Mortgage Calculations @regression');

Scenario('Standard 30yr mortgage shows correct P&I range', async ({ I, calculatorPage }) => {
  // $280,000 loan at 6.5% for 30yr => P&I should be ~$1,770.09/mo
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  I.seeElement(calculatorPage.results.principalInterest);
  I.seeElement(calculatorPage.results.monthlyPayment);

  const text = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    amount >= 1750 && amount <= 1795,
    `P&I of $${amount} is outside expected range $1,750-$1,795 for $280K at 6.5%/30yr (expected ~$1,770)`,
  );
});

Scenario('Down payment reduces total loan amount', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  const text = await I.grabTextFrom(calculatorPage.results.totalLoan);
  const loanAmount = parseFloat(text.replace(/[^0-9.]/g, ''));
  // $350K home - $70K down = $280K loan
  assert(
    loanAmount >= 279000 && loanAmount <= 281000,
    `Total loan $${loanAmount} should be ~$280,000 (350K - 70K down)`,
  );
});

Scenario('15yr mortgage has higher monthly but lower total interest than 30yr', async ({ I, calculatorPage }) => {
  I.amOnPage('/');

  // First: 30-year term
  calculatorPage.fillMortgageForm(fixtures.standardMortgage);
  calculatorPage.calculate();

  const pi30Text = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const payment30yr = parseFloat(pi30Text.replace(/[^0-9.]/g, ''));

  const int30Text = await I.grabTextFrom(calculatorPage.results.totalInterest);
  const interest30yr = parseFloat(int30Text.replace(/[^0-9.]/g, ''));

  // Second: 15-year term
  calculatorPage.reset();
  calculatorPage.fillMortgageForm({ ...fixtures.standardMortgage, loanTerm: '15' });
  calculatorPage.calculate();

  const pi15Text = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const payment15yr = parseFloat(pi15Text.replace(/[^0-9.]/g, ''));
  assert(
    payment15yr > payment30yr,
    `15yr payment ($${payment15yr}) should exceed 30yr payment ($${payment30yr})`,
  );

  const int15Text = await I.grabTextFrom(calculatorPage.results.totalInterest);
  const interest15yr = parseFloat(int15Text.replace(/[^0-9.]/g, ''));
  assert(
    interest15yr < interest30yr,
    `15yr total interest ($${interest15yr}) should be less than 30yr ($${interest30yr})`,
  );
});

Scenario('Higher interest rate increases monthly payment', async ({ I, calculatorPage }) => {
  I.amOnPage('/');

  calculatorPage.fillMortgageForm(fixtures.standardMortgage);
  calculatorPage.calculate();

  const lowText = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const lowRatePayment = parseFloat(lowText.replace(/[^0-9.]/g, ''));

  calculatorPage.reset();
  calculatorPage.fillMortgageForm({ ...fixtures.standardMortgage, interestRate: '9.0' });
  calculatorPage.calculate();

  const highText = await I.grabTextFrom(calculatorPage.results.principalInterest);
  const highRatePayment = parseFloat(highText.replace(/[^0-9.]/g, ''));
  assert(
    highRatePayment > lowRatePayment,
    `9% rate payment ($${highRatePayment}) should exceed 6.5% payment ($${lowRatePayment})`,
  );
});

Scenario('Property tax is reflected in monthly payment', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  // $4,200/yr property tax = $350/mo
  const text = await I.grabTextFrom(calculatorPage.results.monthlyTax);
  const monthlyTax = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    monthlyTax >= 340 && monthlyTax <= 360,
    `Monthly tax $${monthlyTax} should be ~$350 ($4,200/yr / 12)`,
  );
});

Scenario('Home insurance is reflected in monthly payment', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillStandardMortgage();
  calculatorPage.calculate();

  // $1,200/yr insurance = $100/mo
  const text = await I.grabTextFrom(calculatorPage.results.monthlyInsurance);
  const monthlyIns = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    monthlyIns >= 95 && monthlyIns <= 105,
    `Monthly insurance $${monthlyIns} should be ~$100 ($1,200/yr / 12)`,
  );
});

Scenario('HOA fee is included in total monthly payment', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.withHoa);
  calculatorPage.calculate();

  I.seeElement(calculatorPage.results.monthlyHoa);
  const text = await I.grabTextFrom(calculatorPage.results.monthlyHoa);
  const hoa = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    hoa >= 340 && hoa <= 360,
    `Monthly HOA $${hoa} should be ~$350 (fixture value)`,
  );
});

Scenario('Total loan amount matches home price minus down payment', async ({ I, calculatorPage }) => {
  I.amOnPage('/');
  calculatorPage.fillMortgageForm(fixtures.fifteenYear);
  calculatorPage.calculate();

  // $400K - $80K = $320K
  const text = await I.grabTextFrom(calculatorPage.results.totalLoan);
  const loan = parseFloat(text.replace(/[^0-9.]/g, ''));
  assert(
    loan >= 319000 && loan <= 321000,
    `Total loan $${loan} should be ~$320,000 (400K - 80K)`,
  );
});
