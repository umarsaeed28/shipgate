export interface MortgageInput {
  homePrice: number;
  downPayment: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxAnnual: number;
  homeInsuranceAnnual: number;
  hoaMonthly: number;
  pmiEnabled: boolean;
  startMonth: number;
  startYear: number;
}

export interface MortgageResult {
  monthlyPrincipalInterest: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyHOA: number;
  monthlyPMI: number;
  totalMonthlyPayment: number;
  loanAmount: number;
  totalInterest: number;
  totalCost: number;
  amortizationSchedule: AmortizationRow[];
}

export interface AmortizationRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface ValidationErrors {
  homePrice?: string;
  downPayment?: string;
  interestRate?: string;
  loanTermYears?: string;
  propertyTaxAnnual?: string;
  homeInsuranceAnnual?: string;
  hoaMonthly?: string;
  startMonth?: string;
  startYear?: string;
}

export interface DemoSettings {
  demoMode: boolean;
  simulateBug: boolean;
  simulateDelay: boolean;
}
