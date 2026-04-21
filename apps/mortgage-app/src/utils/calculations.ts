import type { MortgageInput, MortgageResult, AmortizationRow } from '../types';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function calculateMortgage(
  input: MortgageInput,
  bugOffset = 0
): MortgageResult {
  const loanAmount = input.homePrice - input.downPayment;
  const monthlyRate = input.interestRate / 100 / 12;
  const totalPayments = input.loanTermYears * 12;

  let monthlyPrincipalInterest: number;

  if (monthlyRate === 0) {
    monthlyPrincipalInterest = loanAmount / totalPayments;
  } else {
    const factor = Math.pow(1 + monthlyRate, totalPayments);
    monthlyPrincipalInterest = loanAmount * (monthlyRate * factor) / (factor - 1);
  }

  monthlyPrincipalInterest += bugOffset;

  const monthlyTax = input.propertyTaxAnnual / 12;
  const monthlyInsurance = input.homeInsuranceAnnual / 12;
  const monthlyHOA = input.hoaMonthly;

  const ltv = loanAmount / input.homePrice;
  const monthlyPMI = input.pmiEnabled && ltv > 0.8
    ? (0.005 * loanAmount) / 12
    : 0;

  const totalMonthlyPayment =
    monthlyPrincipalInterest +
    monthlyTax +
    monthlyInsurance +
    monthlyHOA +
    monthlyPMI;

  const totalInterest = monthlyPrincipalInterest * totalPayments - loanAmount;
  const totalCost = totalMonthlyPayment * totalPayments;

  const amortizationSchedule = generateAmortizationSchedule(
    loanAmount,
    monthlyRate,
    monthlyPrincipalInterest,
    totalPayments,
    input.startMonth,
    input.startYear
  );

  return {
    monthlyPrincipalInterest,
    monthlyTax,
    monthlyInsurance,
    monthlyHOA,
    monthlyPMI,
    totalMonthlyPayment,
    loanAmount,
    totalInterest,
    totalCost,
    amortizationSchedule,
  };
}

function generateAmortizationSchedule(
  loanAmount: number,
  monthlyRate: number,
  monthlyPayment: number,
  totalPayments: number,
  startMonth: number,
  startYear: number
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  let balance = loanAmount;
  const count = Math.min(totalPayments, 12);

  for (let i = 1; i <= count; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance = Math.max(0, balance - principalPayment);

    const month = ((startMonth - 1 + i - 1) % 12);
    const yearOffset = Math.floor((startMonth - 1 + i - 1) / 12);
    const year = startYear + yearOffset;

    schedule.push({
      month: i,
      date: `${MONTH_NAMES[month]} ${year}`,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance,
    });
  }

  return schedule;
}
