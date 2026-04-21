import type { MortgageResult } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SummaryCardProps {
  result: MortgageResult;
}

export default function SummaryCard({ result }: SummaryCardProps) {
  return (
    <div className="card" data-testid="summary-card">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Loan Summary</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Loan Amount</p>
          <p className="text-lg font-bold text-gray-800" data-testid="result-loan-amount">
            {formatCurrency(result.loanAmount)}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Interest</p>
          <p className="text-lg font-bold text-rose-500" data-testid="result-total-interest">
            {formatCurrency(result.totalInterest)}
          </p>
        </div>
        <div className="col-span-2 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Cost Over Life of Loan</p>
          <p className="text-xl font-bold text-gray-800" data-testid="result-total-cost">
            {formatCurrency(result.totalCost)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Including taxes, insurance, HOA &amp; PMI
          </p>
        </div>
      </div>
    </div>
  );
}
