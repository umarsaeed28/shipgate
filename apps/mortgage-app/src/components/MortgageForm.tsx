import { useState, useCallback } from 'react';
import type { MortgageInput, ValidationErrors } from '../types';
import { validateField, validateAll, hasErrors } from '../utils/validation';

interface MortgageFormProps {
  onCalculate: (input: MortgageInput) => void;
  onReset: () => void;
  isCalculating: boolean;
}

const CURRENT_DATE = new Date();
const CURRENT_MONTH = CURRENT_DATE.getMonth() + 1;
const CURRENT_YEAR = CURRENT_DATE.getFullYear();

const LOAN_TERMS = [10, 15, 20, 25, 30];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULT_INPUT: MortgageInput = {
  homePrice: 350000,
  downPayment: 70000,
  interestRate: 6.5,
  loanTermYears: 30,
  propertyTaxAnnual: 4200,
  homeInsuranceAnnual: 1200,
  hoaMonthly: 0,
  pmiEnabled: false,
  startMonth: CURRENT_MONTH,
  startYear: CURRENT_YEAR,
};

export default function MortgageForm({ onCalculate, onReset, isCalculating }: MortgageFormProps) {
  const [input, setInput] = useState<MortgageInput>(DEFAULT_INPUT);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const downPaymentPercent = input.homePrice > 0
    ? ((input.downPayment / input.homePrice) * 100).toFixed(1)
    : '0.0';

  const showPMIOption = input.homePrice > 0 && (input.downPayment / input.homePrice) < 0.2;

  const handleChange = useCallback((name: keyof MortgageInput, rawValue: string | boolean) => {
    let value: number | boolean;
    if (typeof rawValue === 'boolean') {
      value = rawValue;
    } else {
      value = rawValue === '' ? 0 : parseFloat(rawValue);
    }

    setInput(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'homePrice' || name === 'downPayment') {
        const ltv = updated.homePrice > 0 ? updated.downPayment / updated.homePrice : 0;
        if (ltv >= 0.2) {
          updated.pmiEnabled = false;
        }
      }
      return updated;
    });

    if (typeof value === 'number') {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, []);

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => new Set(prev).add(name));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateAll(input);
    setErrors(validationErrors);
    setTouched(new Set(Object.keys(input)));

    if (!hasErrors(validationErrors)) {
      onCalculate(input);
    }
  };

  const handleReset = () => {
    setInput(DEFAULT_INPUT);
    setErrors({});
    setTouched(new Set());
    onReset();
  };

  const renderField = (
    name: keyof MortgageInput,
    label: string,
    options?: { prefix?: string; suffix?: string; step?: string; min?: string }
  ) => {
    const error = touched.has(name) ? errors[name as keyof ValidationErrors] : undefined;
    return (
      <div>
        <label className="label" htmlFor={name}>{label}</label>
        <div className="relative">
          {options?.prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              {options.prefix}
            </span>
          )}
          <input
            id={name}
            type="number"
            data-testid={`input-${name}`}
            className={`input-field ${options?.prefix ? 'pl-7' : ''} ${options?.suffix ? 'pr-8' : ''} ${error ? 'error' : ''}`}
            value={input[name] as number || ''}
            onChange={e => handleChange(name, e.target.value)}
            onBlur={() => handleBlur(name)}
            step={options?.step || '1'}
            min={options?.min || '0'}
          />
          {options?.suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              {options.suffix}
            </span>
          )}
        </div>
        {error && (
          <p className="text-red-500 text-xs mt-1" data-testid="validation-error">{error}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} data-testid="mortgage-form" className="card space-y-5" noValidate>
      <h2 className="text-lg font-semibold text-gray-800">Loan Details</h2>

      {renderField('homePrice', 'Home Price', { prefix: '$', step: '1000' })}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-600" htmlFor="downPayment">Down Payment</label>
          <span className="text-xs text-teal-600 font-medium" data-testid="down-payment-percent">
            {downPaymentPercent}%
          </span>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
          <input
            id="downPayment"
            type="number"
            data-testid="input-downPayment"
            className={`input-field pl-7 ${touched.has('downPayment') && errors.downPayment ? 'error' : ''}`}
            value={input.downPayment || ''}
            onChange={e => handleChange('downPayment', e.target.value)}
            onBlur={() => handleBlur('downPayment')}
            step="1000"
            min="0"
          />
        </div>
        {touched.has('downPayment') && errors.downPayment && (
          <p className="text-red-500 text-xs mt-1" data-testid="validation-error">{errors.downPayment}</p>
        )}
      </div>

      {renderField('interestRate', 'Interest Rate', { suffix: '%', step: '0.125' })}

      <div>
        <label className="label" htmlFor="loanTermYears">Loan Term</label>
        <select
          id="loanTermYears"
          data-testid="input-loanTermYears"
          className="input-field"
          value={input.loanTermYears}
          onChange={e => handleChange('loanTermYears', e.target.value)}
        >
          {LOAN_TERMS.map(term => (
            <option key={term} value={term}>{term} years</option>
          ))}
        </select>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Additional Costs</h3>
        <div className="space-y-4">
          {renderField('propertyTaxAnnual', 'Property Tax (Annual)', { prefix: '$', step: '100' })}
          {renderField('homeInsuranceAnnual', 'Home Insurance (Annual)', { prefix: '$', step: '100' })}
          {renderField('hoaMonthly', 'HOA Fee (Monthly)', { prefix: '$', step: '25' })}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-600">Private Mortgage Insurance (PMI)</span>
            {!showPMIOption && (
              <p className="text-xs text-gray-400 mt-0.5">Not required (down payment &ge; 20%)</p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            data-testid="input-pmiEnabled"
            aria-checked={input.pmiEnabled}
            disabled={!showPMIOption}
            onClick={() => handleChange('pmiEnabled', !input.pmiEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              input.pmiEnabled ? 'bg-teal-600' : 'bg-gray-300'
            } ${!showPMIOption ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                input.pmiEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {input.pmiEnabled && showPMIOption && (
          <p className="text-xs text-amber-600 mt-2" data-testid="pmi-info">
            PMI of 0.5% annually will be added to your monthly payment
          </p>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Start Date</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="startMonth">Month</label>
            <select
              id="startMonth"
              data-testid="input-startMonth"
              className="input-field"
              value={input.startMonth}
              onChange={e => handleChange('startMonth', e.target.value)}
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="startYear">Year</label>
            <select
              id="startYear"
              data-testid="input-startYear"
              className="input-field"
              value={input.startYear}
              onChange={e => handleChange('startYear', e.target.value)}
            >
              {Array.from({ length: 5 }, (_, i) => CURRENT_YEAR + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          data-testid="btn-calculate"
          className="btn-primary flex-1"
          disabled={isCalculating}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Calculating...
            </span>
          ) : (
            'Calculate'
          )}
        </button>
        <button
          type="button"
          data-testid="btn-reset"
          className="btn-secondary"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </form>
  );
}
