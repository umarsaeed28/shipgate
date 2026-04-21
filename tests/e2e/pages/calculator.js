const { I } = inject();

module.exports = {
  fields: {
    homePrice: '[data-testid="input-homePrice"]',
    downPayment: '[data-testid="input-downPayment"]',
    interestRate: '[data-testid="input-interestRate"]',
    loanTerm: '[data-testid="input-loanTermYears"]',
    propertyTax: '[data-testid="input-propertyTaxAnnual"]',
    homeInsurance: '[data-testid="input-homeInsuranceAnnual"]',
    hoaFee: '[data-testid="input-hoaMonthly"]',
    pmiToggle: '[data-testid="input-pmiEnabled"]',
    startMonth: '[data-testid="input-startMonth"]',
    startYear: '[data-testid="input-startYear"]',
  },

  buttons: {
    calculate: '[data-testid="btn-calculate"]',
    reset: '[data-testid="btn-reset"]',
  },

  results: {
    section: '[data-testid="results-panel"]',
    monthlyPayment: '[data-testid="result-monthly-payment"]',
    principalInterest: '[data-testid="result-principal-interest"]',
    monthlyTax: '[data-testid="result-monthly-tax"]',
    monthlyInsurance: '[data-testid="result-monthly-insurance"]',
    monthlyHoa: '[data-testid="result-monthly-hoa"]',
    monthlyPmi: '[data-testid="result-monthly-pmi"]',
    totalLoan: '[data-testid="result-loan-amount"]',
    totalInterest: '[data-testid="result-total-interest"]',
  },

  sections: {
    amortizationTable: '[data-testid="amortization-table"]',
    paymentBreakdown: '[data-testid="payment-breakdown"]',
    summaryCard: '[data-testid="summary-card"]',
  },

  demo: {
    modeToggle: '[data-testid="toggle-demo-mode"]',
    simulateBug: '[data-testid="toggle-simulate-bug"]',
    simulateDelay: '[data-testid="toggle-simulate-delay"]',
  },

  fillMortgageForm(data) {
    if (data.homePrice) {
      I.clearField(this.fields.homePrice);
      I.fillField(this.fields.homePrice, data.homePrice);
    }
    if (data.downPayment) {
      I.clearField(this.fields.downPayment);
      I.fillField(this.fields.downPayment, data.downPayment);
    }
    if (data.interestRate) {
      I.clearField(this.fields.interestRate);
      I.fillField(this.fields.interestRate, data.interestRate);
    }
    if (data.loanTerm) {
      I.selectOption(this.fields.loanTerm, data.loanTerm);
    }
    if (data.propertyTax) {
      I.clearField(this.fields.propertyTax);
      I.fillField(this.fields.propertyTax, data.propertyTax);
    }
    if (data.homeInsurance) {
      I.clearField(this.fields.homeInsurance);
      I.fillField(this.fields.homeInsurance, data.homeInsurance);
    }
    if (data.hoaFee) {
      I.clearField(this.fields.hoaFee);
      I.fillField(this.fields.hoaFee, data.hoaFee);
    }
  },

  fillStandardMortgage() {
    I.clearField(this.fields.homePrice);
    I.fillField(this.fields.homePrice, '350000');
    I.clearField(this.fields.downPayment);
    I.fillField(this.fields.downPayment, '70000');
    I.clearField(this.fields.interestRate);
    I.fillField(this.fields.interestRate, '6.5');
    I.selectOption(this.fields.loanTerm, '30');
    I.clearField(this.fields.propertyTax);
    I.fillField(this.fields.propertyTax, '4200');
    I.clearField(this.fields.homeInsurance);
    I.fillField(this.fields.homeInsurance, '1200');
  },

  calculate() {
    I.click(this.buttons.calculate);
    I.waitForElement(this.results.section, 15);
  },

  reset() {
    I.click(this.buttons.reset);
  },

  seeResultsSection() {
    I.seeElement(this.results.section);
    I.seeElement(this.results.monthlyPayment);
    I.seeElement(this.results.principalInterest);
    I.seeElement(this.results.totalLoan);
    I.seeElement(this.results.totalInterest);
  },

  seeFullBreakdown() {
    I.seeElement(this.results.monthlyPayment);
    I.seeElement(this.results.principalInterest);
    I.seeElement(this.results.monthlyTax);
    I.seeElement(this.results.monthlyInsurance);
  },
};
