module.exports = {
  standardMortgage: {
    homePrice: '350000',
    downPayment: '70000',
    interestRate: '6.5',
    loanTerm: '30',
    propertyTax: '4200',
    homeInsurance: '1200',
    hoaFee: '0',
  },

  lowDownPayment: {
    homePrice: '350000',
    downPayment: '17500', // 5% - triggers PMI
    interestRate: '6.5',
    loanTerm: '30',
    propertyTax: '4200',
    homeInsurance: '1200',
    hoaFee: '0',
  },

  highInterest: {
    homePrice: '250000',
    downPayment: '50000',
    interestRate: '12.0',
    loanTerm: '15',
    propertyTax: '3000',
    homeInsurance: '1000',
    hoaFee: '0',
  },

  fifteenYear: {
    homePrice: '400000',
    downPayment: '80000',
    interestRate: '5.75',
    loanTerm: '15',
    propertyTax: '5000',
    homeInsurance: '1400',
    hoaFee: '0',
  },

  zeroDown: {
    homePrice: '300000',
    downPayment: '0',
    interestRate: '7.0',
    loanTerm: '30',
    propertyTax: '3600',
    homeInsurance: '1200',
    hoaFee: '0',
  },

  withHoa: {
    homePrice: '500000',
    downPayment: '100000',
    interestRate: '6.0',
    loanTerm: '30',
    propertyTax: '6000',
    homeInsurance: '1800',
    hoaFee: '350',
  },

  cheapHome: {
    homePrice: '10000',
    downPayment: '2000',
    interestRate: '5.0',
    loanTerm: '15',
    propertyTax: '200',
    homeInsurance: '300',
    hoaFee: '0',
  },

  extremeRate: {
    homePrice: '200000',
    downPayment: '40000',
    interestRate: '20.0',
    loanTerm: '30',
    propertyTax: '2400',
    homeInsurance: '1000',
    hoaFee: '0',
  },

  twentyPercentDown: {
    homePrice: '350000',
    downPayment: '70000', // exactly 20%
    interestRate: '6.5',
    loanTerm: '30',
    propertyTax: '4200',
    homeInsurance: '1200',
    hoaFee: '0',
  },

  justUnderTwentyPercent: {
    homePrice: '350000',
    downPayment: '69000', // ~19.7% - should trigger PMI
    interestRate: '6.5',
    loanTerm: '30',
    propertyTax: '4200',
    homeInsurance: '1200',
    hoaFee: '0',
  },
};
