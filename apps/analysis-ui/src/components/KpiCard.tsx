import { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  trend?: number;
}

export function KpiCard({ title, value, subtitle, icon, trend }: KpiCardProps) {
  return (
    <div className="card group hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
            {trend !== undefined && (
              <span
                className={`inline-flex items-center text-sm font-medium ${
                  trend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
          {subtitle && (
            <div className="mt-1.5 text-sm text-slate-500">{subtitle}</div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4 w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
