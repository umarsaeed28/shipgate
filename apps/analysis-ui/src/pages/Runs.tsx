import { useNavigate } from 'react-router-dom';
import { useRuns } from '../api/queries';
import { DataTable, type Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { Run } from '../types';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const columns: Column<Run>[] = [
  {
    key: 'buildNumber',
    header: 'Build #',
    sortable: true,
    sortValue: (r) => r.buildNumber,
    render: (r) => (
      <span className="font-semibold text-blue-600">#{r.buildNumber}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: 'startedAt',
    header: 'Started',
    sortable: true,
    sortValue: (r) => new Date(r.startedAt).getTime(),
    render: (r) => (
      <span className="text-slate-600" title={new Date(r.startedAt).toLocaleString()}>
        {timeAgo(r.startedAt)}
      </span>
    ),
  },
  {
    key: 'duration',
    header: 'Duration',
    sortable: true,
    sortValue: (r) => r.duration,
    render: (r) => <span className="text-slate-600">{formatDuration(r.duration)}</span>,
  },
  {
    key: 'passed',
    header: 'Passed',
    sortable: true,
    sortValue: (r) => r.passed,
    render: (r) => <span className="font-medium text-green-600">{r.passed}</span>,
  },
  {
    key: 'failed',
    header: 'Failed',
    sortable: true,
    sortValue: (r) => r.failed,
    render: (r) => (
      <span className={`font-medium ${r.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
        {r.failed}
      </span>
    ),
  },
  {
    key: 'skipped',
    header: 'Skipped',
    render: (r) => <span className="text-slate-400">{r.skipped}</span>,
  },
  {
    key: 'allure',
    header: 'Allure',
    render: (r) =>
      r.allureReportUrl ? (
        <a
          href={r.allureReportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-teal-600 hover:text-teal-800"
          onClick={(e) => e.stopPropagation()}
        >
          Report ↗
        </a>
      ) : (
        <span className="text-slate-300">-</span>
      ),
  },
  {
    key: 'actions',
    header: '',
    render: () => (
      <span className="text-blue-500 text-sm font-medium hover:text-blue-700">View →</span>
    ),
    className: 'text-right',
  },
];

export function Runs() {
  const { data, isLoading } = useRuns();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Test Runs</h2>
      {isLoading ? (
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
            <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-slate-100">
              <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => navigate(`/runs/${r.id}`)}
          emptyMessage="No test runs recorded yet"
        />
      )}
    </div>
  );
}
