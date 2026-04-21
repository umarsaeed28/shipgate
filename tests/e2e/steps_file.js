module.exports = function () {
  return actor({
    fillCalculator: function (data) {
      if (data.homePrice) {
        this.clearField('[data-testid="home-price-input"]');
        this.fillField('[data-testid="home-price-input"]', data.homePrice);
      }
      if (data.downPayment) {
        this.clearField('[data-testid="down-payment-input"]');
        this.fillField('[data-testid="down-payment-input"]', data.downPayment);
      }
      if (data.interestRate) {
        this.clearField('[data-testid="interest-rate-input"]');
        this.fillField('[data-testid="interest-rate-input"]', data.interestRate);
      }
      if (data.loanTerm) {
        this.selectOption('[data-testid="loan-term-select"]', data.loanTerm);
      }
      if (data.propertyTax) {
        this.clearField('[data-testid="property-tax-input"]');
        this.fillField('[data-testid="property-tax-input"]', data.propertyTax);
      }
      if (data.homeInsurance) {
        this.clearField('[data-testid="home-insurance-input"]');
        this.fillField('[data-testid="home-insurance-input"]', data.homeInsurance);
      }
      if (data.hoaFee) {
        this.clearField('[data-testid="hoa-fee-input"]');
        this.fillField('[data-testid="hoa-fee-input"]', data.hoaFee);
      }
    },

    calculateMortgage: function () {
      this.click('[data-testid="calculate-button"]');
      this.waitForElement('[data-testid="results-section"]', 10);
    },

    resetCalculator: function () {
      this.click('[data-testid="reset-button"]');
    },

    seeMonthlyPayment: function () {
      this.seeElement('[data-testid="monthly-payment-total"]');
    },

    seeResultsDisplayed: function () {
      this.seeElement('[data-testid="results-section"]');
      this.seeElement('[data-testid="monthly-payment-total"]');
      this.seeElement('[data-testid="total-loan-amount"]');
    },
  });
};
