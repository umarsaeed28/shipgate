import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { TrendPoint, Classification } from '../types';

const CLASSIFICATION_COLORS: Record<Classification, string> = {
  BUG: '#ef4444',
  TEST_SCRIPT_ISSUE: '#f97316',
  TIMEOUT: '#eab308',
  INFRASTRUCTURE_OR_ENVIRONMENT: '#a855f7',
  UNKNOWN_NEEDS_REVIEW: '#94a3b8',
};

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  BUG: 'Bug',
  TEST_SCRIPT_ISSUE: 'Script Issue',
  TIMEOUT: 'Timeout',
  INFRASTRUCTURE_OR_ENVIRONMENT: 'Infrastructure',
  UNKNOWN_NEEDS_REVIEW: 'Needs Review',
};

interface PassFailTrendProps {
  data: TrendPoint[];
}

export function PassFailTrend({ data }: PassFailTrendProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Pass / Fail Trend</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="buildNumber"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(v) => `#${v}`}
            />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelFormatter={(v) => `Build #${v}`}
            />
            <Area
              type="monotone"
              dataKey="passed"
              stroke="#22c55e"
              fill="url(#passGrad)"
              strokeWidth={2}
              name="Passed"
            />
            <Area
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              fill="url(#failGrad)"
              strokeWidth={2}
              name="Failed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ClassificationChartProps {
  breakdown: Record<string, number>;
}

export function ClassificationChart({ breakdown }: ClassificationChartProps) {
  const data = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      name: CLASSIFICATION_LABELS[key as Classification] ?? key,
      value: count,
      color: CLASSIFICATION_COLORS[key as Classification] ?? '#94a3b8',
    }));

  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">No classification data</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Classification Breakdown</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
