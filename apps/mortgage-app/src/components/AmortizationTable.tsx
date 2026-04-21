import type { MortgageResult } from '../types';
import { formatCurrency } from '../utils/formatters';

interface AmortizationTableProps {
  result: MortgageResult;
}

export default function AmortizationTable({ result }: AmortizationTableProps) {
  const { amortizationSchedule } = result;

  if (amortizationSchedule.length === 0) return null;

  return (
    <div className="card" data-testid="amortization-table">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Amortization Schedule
        <span className="text-xs font-normal text-gray-400 ml-2">First 12 months</span>
      </h3>

      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-left py-2 px-6 font-medium">#</th>
              <th className="text-left py-2 px-3 font-medium">Date</th>
              <th className="text-right py-2 px-3 font-medium">Payment</th>
              <th className="text-right py-2 px-3 font-medium">Principal</th>
              <th className="text-right py-2 px-3 font-medium">Interest</th>
              <th className="text-right py-2 px-6 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {amortizationSchedule.map(row => (
              <tr
                key={row.month}
                className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                data-testid={`amort-row-${row.month}`}
              >
                <td className="py-2.5 px-6 text-gray-400 tabular-nums">{row.month}</td>
                <td className="py-2.5 px-3 text-gray-600" data-testid={`amort-date-${row.month}`}>
                  {row.date}
                </td>
                <td className="py-2.5 px-3 text-right font-medium text-gray-800 tabular-nums" data-testid={`amort-payment-${row.month}`}>
                  {formatCurrency(row.payment)}
                </td>
                <td className="py-2.5 px-3 text-right text-teal-600 tabular-nums" data-testid={`amort-principal-${row.month}`}>
                  {formatCurrency(row.principal)}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums" data-testid={`amort-interest-${row.month}`}>
                  {formatCurrency(row.interest)}
                </td>
                <td className="py-2.5 px-6 text-right text-gray-700 tabular-nums" data-testid={`amort-balance-${row.month}`}>
                  {formatCurrency(row.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
