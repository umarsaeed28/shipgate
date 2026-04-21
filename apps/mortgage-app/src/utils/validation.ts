import type { MortgageInput, ValidationErrors } from '../types';

export function validateField(
  name: keyof MortgageInput,
  value: number | boolean
): string | undefined {
  if (typeof value === 'boolean') return undefined;

  switch (name) {
    case 'homePrice':
      if (!value || value <= 0) return 'Home price must be greater than 0';
      if (value > 100_000_000) return 'Home price seems unrealistically high';
      return undefined;

    case 'downPayment':
      if (value < 0) return 'Down payment cannot be negative';
      return undefined;

    case 'interestRate':
      if (value < 0) return 'Interest rate cannot be negative';
      if (value > 30) return 'Interest rate seems unrealistically high';
      return undefined;

    case 'loanTermYears':
      if (!value || value <= 0) return 'Loan term must be greater than 0';
      if (value > 50) return 'Loan term cannot exceed 50 years';
      return undefined;

    case 'propertyTaxAnnual':
      if (value < 0) return 'Property tax cannot be negative';
      return undefined;

    case 'homeInsuranceAnnual':
      if (value < 0) return 'Insurance cannot be negative';
      return undefined;

    case 'hoaMonthly':
      if (value < 0) return 'HOA fee cannot be negative';
      return undefined;

    default:
      return undefined;
  }
}

export function validateAll(input: MortgageInput): ValidationErrors {
  const errors: ValidationErrors = {};

  const fields: (keyof MortgageInput)[] = [
    'homePrice',
    'downPayment',
    'interestRate',
    'loanTermYears',
    'propertyTaxAnnual',
    'homeInsuranceAnnual',
    'hoaMonthly',
  ];

  for (const field of fields) {
    const error = validateField(field, input[field]);
    if (error) {
      (errors as Record<string, string>)[field] = error;
    }
  }

  if (input.downPayment >= input.homePrice) {
    errors.downPayment = 'Down payment must be less than home price';
  }

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}
