import { Link, useNavigate } from 'react-router-dom';
import { useAgentStatus } from '../api/queries';
import { DataTable, type Column } from '../components/DataTable';
import { KpiCard } from '../components/KpiCard';
import type { AgentActivity } from '../types';

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

function formatAbsolute(iso?: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '-';
  }
}

const statusColors: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  idle: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800', label: 'Idle' },
  running: { dot: 'bg-blue-500 animate-pulse', bg: 'bg-blue-50', text: 'text-blue-800', label: 'Running' },
  error: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-800', label: 'Error' },
  disabled: { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Disabled' },
};

const activityColumns: Column<AgentActivity>[] = [
  {
    key: 'timestamp',
    header: 'Time',
    sortable: true,
    sortValue: (r) => new Date(r.timestamp).getTime(),
    render: (r) => (
      <span className="text-slate-500 text-xs" title={new Date(r.timestamp).toLocaleString()}>
        {timeAgo(r.timestamp)}
      </span>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (r) => <span className="text-slate-900 font-medium">{r.action}</span>,
  },
  {
    key: 'details',
    header: 'Details',
    render: (r) => (
      <span className="text-slate-600 text-sm truncate max-w-md inline-block" title={r.details}>
        {r.details ?? '-'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Outcome',
    render: (r) => {
      const color =
        r.status === 'success'
          ? 'text-green-700 bg-green-50 border-green-100'
          : r.status === 'error'
            ? 'text-red-700 bg-red-50 border-red-100'
            : 'text-sky-700 bg-sky-50 border-sky-100';
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}
        >
          {r.status === 'success' ? 'Pass' : r.status === 'error' ? 'Has failures' : r.status}
        </span>
      );
    },
  },
  {
    key: 'open',
    header: '',
    render: (r) =>
      r.runId ? (
        <Link
          to={`/runs/${r.runId}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
        >
          Run →
        </Link>
      ) : (
        <span className="text-slate-300">-</span>
      ),
  },
];

export function AgentStatus() {
  const navigate = useNavigate();
  const { data, isLoading, error, isFetching } = useAgentStatus();

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Agent status</h2>
        <div className="card text-center py-12">
          <p className="text-red-600 font-medium mb-2">Failed to load agent status</p>
          <p className="text-sm text-slate-500">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-28 bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="card h-64 bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const agent = data.agents[0];
  const colors = statusColors[agent?.status ?? 'idle'] ?? statusColors.idle;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agent status</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Regression analyzer state, scheduler configuration, and a log of recent run analyses. This agent
            ingests builds from Jenkins or from Demo Tools and produces classified runs in Shipgate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/demo-tools" className="btn-secondary text-sm">
            Demo Tools
          </Link>
          <Link to="/jenkins/pipelines" className="btn-secondary text-sm">
            Pipeline
          </Link>
          <Link to="/settings" className="btn-secondary text-sm">
            Settings
          </Link>
          <button type="button" className="btn-primary text-sm" onClick={() => navigate('/runs')}>
            All runs
          </button>
        </div>
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400">Refreshing…</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Agent state"
          value={
            <span className={`inline-flex items-center gap-2 text-lg ${colors.text}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              {colors.label}
            </span>
          }
          subtitle={agent?.notes ? undefined : 'Waiting for work'}
          icon="⚙"
        />
        <KpiCard
          title="Pending builds"
          value={data.pendingBuilds ?? 0}
          subtitle="Awaiting analysis"
          icon="📥"
        />
        <KpiCard
          title="Last analysis"
          value={agent?.lastRun ? timeAgo(agent.lastRun) : '-'}
          subtitle={agent?.lastRun ? formatAbsolute(agent.lastRun) : 'No completed runs yet'}
          icon="✓"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Analyzer</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-mono text-slate-900 text-right">{agent?.name ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Last wake</dt>
              <dd className="text-slate-800 text-right" title={formatAbsolute(agent?.lastWake)}>
                {agent?.lastWake ? timeAgo(agent.lastWake) : '-'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Last run completed</dt>
              <dd className="text-slate-800 text-right" title={formatAbsolute(agent?.lastRun)}>
                {agent?.lastRun ? timeAgo(agent.lastRun) : '-'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Last processed build</dt>
              <dd className="text-slate-800 font-mono text-right">
                {agent?.lastProcessedBuild != null ? `#${agent.lastProcessedBuild}` : '-'}
              </dd>
            </div>
            {agent?.notes && (
              <div className="pt-2">
                <dt className="text-slate-500 text-xs mb-1">Notes</dt>
                <dd className="text-slate-700 bg-slate-50 rounded-lg px-3 py-2 text-sm leading-relaxed">
                  {agent.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-4">Scheduler</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Enabled</dt>
              <dd>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    agent?.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {agent?.enabled ? 'On' : 'Off'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Mode</dt>
              <dd className="text-slate-800 capitalize text-right">{agent?.mode ?? '-'}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2 border-b border-slate-100">
              <dt className="text-slate-500">Poll interval</dt>
              <dd className="text-slate-800 text-right">
                {agent?.pollIntervalMinutes != null ? `${agent.pollIntervalMinutes} min` : '-'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Cron</dt>
              <dd className="font-mono text-xs text-slate-800 text-right break-all">{agent?.cron ?? '-'}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            The worker process (<code className="bg-slate-100 px-1 rounded">scheduler-worker</code>) polls the API
            for pending builds when enabled. You can also trigger analysis manually from Overview or Pipeline.
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Activity log</h3>
          <span className="text-xs text-slate-400">Recent test run analyses (newest first)</span>
        </div>
        <DataTable
          columns={activityColumns}
          data={data.activityLog ?? []}
          keyExtractor={(a) => a.id}
          emptyMessage="No runs yet. Start a regression from Demo Tools or ingest a build from Jenkins."
        />
      </div>
    </div>
  );
}
