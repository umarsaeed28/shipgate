import type { MortgageResult } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PaymentBreakdownProps {
  result: MortgageResult;
}

const COLORS = [
  { bg: 'bg-teal-500', label: 'Principal & Interest' },
  { bg: 'bg-blue-400', label: 'Property Tax' },
  { bg: 'bg-violet-400', label: 'Insurance' },
  { bg: 'bg-amber-400', label: 'HOA' },
  { bg: 'bg-rose-400', label: 'PMI' },
];

export default function PaymentBreakdown({ result }: PaymentBreakdownProps) {
  const segments = [
    { value: result.monthlyPrincipalInterest, ...COLORS[0] },
    { value: result.monthlyTax, ...COLORS[1] },
    { value: result.monthlyInsurance, ...COLORS[2] },
    { value: result.monthlyHOA, ...COLORS[3] },
  ];

  if (result.monthlyPMI > 0) {
    segments.push({ value: result.monthlyPMI, ...COLORS[4] });
  }

  const total = result.totalMonthlyPayment;

  return (
    <div className="card" data-testid="payment-breakdown">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Breakdown</h3>

      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map((seg, i) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={i}
              className={`${seg.bg} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              data-testid={`breakdown-bar-${i}`}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-y-2.5 gap-x-4">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${seg.bg} shrink-0`} />
            <span className="text-xs text-gray-500 truncate">{seg.label}</span>
            <span className="text-xs font-semibold text-gray-700 ml-auto" data-testid={`breakdown-value-${i}`}>
              {formatCurrency(seg.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
