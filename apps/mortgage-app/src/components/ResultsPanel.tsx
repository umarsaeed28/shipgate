import type { MortgageResult } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ResultsPanelProps {
  result: MortgageResult;
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const items = [
    { label: 'Principal & Interest', value: result.monthlyPrincipalInterest, testId: 'result-principal-interest' },
    { label: 'Property Tax', value: result.monthlyTax, testId: 'result-monthly-tax' },
    { label: 'Home Insurance', value: result.monthlyInsurance, testId: 'result-monthly-insurance' },
    { label: 'HOA Fee', value: result.monthlyHOA, testId: 'result-monthly-hoa' },
  ];

  if (result.monthlyPMI > 0) {
    items.push({ label: 'PMI', value: result.monthlyPMI, testId: 'result-monthly-pmi' });
  }

  return (
    <div className="card" data-testid="results-panel">
      <p className="text-sm font-medium text-gray-500 mb-1">Estimated Monthly Payment</p>
      <p
        className="text-5xl font-bold text-teal-600 tracking-tight"
        data-testid="result-monthly-payment"
      >
        {formatCurrency(result.totalMonthlyPayment)}
      </p>
      <p className="text-xs text-gray-400 mt-1">per month</p>

      <div className="mt-6 space-y-3">
        {items.map(item => (
          <div key={item.testId} className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{item.label}</span>
            <span className="text-sm font-semibold text-gray-800" data-testid={item.testId}>
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}

        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Total Monthly</span>
          <span className="text-sm font-bold text-teal-600" data-testid="result-total-monthly">
            {formatCurrency(result.totalMonthlyPayment)}
          </span>
        </div>
      </div>
    </div>
  );
}
