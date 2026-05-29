import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useAgentStatus,
  useAgentJobs,
  useAgentFindings,
  useEnqueueAgentJob,
  useAgentLogs,
} from '../api/queries';
import { DataTable, type Column } from '../components/DataTable';
import { KpiCard } from '../components/KpiCard';
import { ClassificationBadge } from '../components/ClassificationBadge';
import type { AgentActivity, AgentJob, AgentFinding } from '../types';

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

const jobColumns: Column<AgentJob>[] = [
  {
    key: 'id',
    header: 'Job',
    render: (j) => (
      <span className="font-mono text-xs text-slate-700" title={j.id}>
        {j.id.slice(0, 8)}…
      </span>
    ),
  },
  {
    key: 'kind',
    header: 'Kind',
    render: (j) => <span className="text-sm capitalize">{j.kind.replace('_', ' ')}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (j) => {
      const tone =
        j.status === 'completed'
          ? 'bg-emerald-50 text-emerald-800'
          : j.status === 'running'
            ? 'bg-blue-50 text-blue-800'
            : j.status === 'failed'
              ? 'bg-red-50 text-red-800'
              : 'bg-amber-50 text-amber-900';
      return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tone}`}>{j.status}</span>;
    },
  },
  {
    key: 'tokenUsage',
    header: 'Tokens (LLM)',
    render: (j) => {
      const u = j.tokenUsage;
      if (!u) return <span className="text-xs text-slate-400">—</span>;
      return (
        <span
          className="text-xs text-slate-700 tabular-nums"
          title={`${u.llmCalls} calls · prompt ${u.promptTokens} + completion ${u.completionTokens} = ${u.totalTokens} total`}
        >
          {u.totalTokens.toLocaleString()}
          <span className="text-slate-400 ml-1">({u.llmCalls}×)</span>
        </span>
      );
    },
  },
  {
    key: 'sutUrl',
    header: 'SUT',
    render: (j) => (
      <span className="text-xs text-slate-600 truncate max-w-[200px] inline-block" title={j.sutUrl}>
        {j.sutUrl}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (j) => <span className="text-xs text-slate-500">{timeAgo(j.createdAt)}</span>,
  },
];

const findingColumns: Column<AgentFinding>[] = [
  {
    key: 'title',
    header: 'Title',
    render: (f) => <span className="font-medium text-slate-900">{f.title}</span>,
  },
  {
    key: 'classification',
    header: 'Class',
    render: (f) => <ClassificationBadge classification={f.classification} />,
  },
  {
    key: 'confidence',
    header: 'Conf.',
    render: (f) => <span className="text-sm tabular-nums">{(f.confidence * 100).toFixed(0)}%</span>,
  },
  {
    key: 'summary',
    header: 'Summary',
    render: (f) => (
      <span className="text-sm text-slate-600 line-clamp-2 max-w-md" title={f.summary}>
        {f.summary}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'When',
    render: (f) => <span className="text-xs text-slate-500">{timeAgo(f.createdAt)}</span>,
  },
];

export function AgentStatus() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'console' | 'queue' | 'findings'>('console');
  const { data, isLoading, error, isFetching } = useAgentStatus();
  const jobsQuery = useAgentJobs();
  const findingsQuery = useAgentFindings();
  const enqueueJob = useEnqueueAgentJob();
  const logsQuery = useAgentLogs(600);
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logBoxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logsQuery.data?.items]);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Agent console</h2>
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agent console</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            This app is the front end for the regression agent: monitor health, queue browser intelligence jobs
            for the Playwright worker, and read structured findings. Classic analysis (Jenkins, Allure, classifier)
            appears under Runs and Failures; container jobs and LLM output land here.
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

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {(
          [
            ['console', 'Console'],
            ['queue', 'Job queue'],
            ['findings', 'Findings'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === id
                ? 'border-blue-600 text-blue-800 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Pending jobs are picked up by the Playwright agent service (MCP-compatible browser tools + OpenAI loop).
              It polls{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">GET /api/regression/agent-jobs/next</code>
              , claims the job, then posts findings to the Analysis API. Locally:{' '}
              <code className="text-xs bg-slate-100 px-1 rounded">
                OPENAI_API_KEY=… pnpm dev:playwright-agent
              </code>{' '}
              with the API running and application URL set in Settings.
            </p>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={enqueueJob.isPending}
              onClick={() => enqueueJob.mutate({ kind: 'explore' })}
            >
              {enqueueJob.isPending ? 'Enqueueing…' : 'Enqueue explore job'}
            </button>
          </div>
          {jobsQuery.isLoading ? (
            <div className="card h-40 bg-slate-100 animate-pulse" />
          ) : jobsQuery.error ? (
            <div className="card text-red-600 text-sm">Could not load jobs.</div>
          ) : (
            <DataTable
              columns={jobColumns}
              data={jobsQuery.data?.items ?? []}
              keyExtractor={(j) => j.id}
              emptyMessage="No agent jobs yet. Enqueue an explore job or connect the Playwright container worker."
            />
          )}
        </div>
      )}

      {tab === 'findings' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Structured results from the intelligence agent (classifications, summaries, step traces). Distinct
            from Allure-based run summaries on the Reports page.
          </p>
          {findingsQuery.isLoading ? (
            <div className="card h-40 bg-slate-100 animate-pulse" />
          ) : findingsQuery.error ? (
            <div className="card text-red-600 text-sm">Could not load findings.</div>
          ) : (
            <DataTable
              columns={findingColumns}
              data={findingsQuery.data?.items ?? []}
              keyExtractor={(f) => f.id}
              emptyMessage="No findings yet. When the Playwright agent completes a job and posts results, they appear here."
            />
          )}
        </div>
      )}

      {tab === 'console' && (
        <>
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

      <div className="card border border-slate-200 shadow-sm">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-slate-900">Intelligence agent log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live tail from the Playwright + MCP worker (streamed to the API). Analyzer activity is below.{' '}
            <span className="text-slate-400">
              {logsQuery.data?.total != null ? `${logsQuery.data.total} lines stored.` : ''}
            </span>
          </p>
        </div>
        <div
          ref={logBoxRef}
          className="h-72 overflow-y-auto rounded-lg bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed p-3 whitespace-pre-wrap break-words"
        >
          {logsQuery.isLoading && <span className="text-slate-500">Loading logs…</span>}
          {logsQuery.error && (
            <span className="text-red-400">Could not load agent logs. Is the API running?</span>
          )}
          {logsQuery.data?.items.map((line) => (
            <div key={line.id} className="border-b border-slate-800/80 py-0.5 last:border-0">
              <span className="text-slate-500">{new Date(line.timestamp).toLocaleTimeString()}</span>{' '}
              <span
                className={
                  line.level === 'error'
                    ? 'text-red-400'
                    : line.level === 'warn'
                      ? 'text-amber-300'
                      : line.level === 'debug'
                        ? 'text-slate-400'
                        : 'text-emerald-400'
                }
              >
                [{line.level}]
              </span>{' '}
              <span className="text-slate-500">{line.source}</span>
              {line.jobId ? (
                <span className="text-slate-600 ml-1" title={line.jobId}>
                  #{line.jobId.slice(0, 8)}
                </span>
              ) : null}
              <span className="text-slate-400">: </span>
              <span className="text-slate-100">{line.message}</span>
            </div>
          ))}
          {logsQuery.data && logsQuery.data.items.length === 0 && !logsQuery.isLoading && (
            <span className="text-slate-500">
              No intelligence agent logs yet. Run{' '}
              <code className="text-slate-400">pnpm dev:playwright-agent</code> with OPENAI_API_KEY and enqueue a job.
            </span>
          )}
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
        </>
      )}
    </div>
  );
}
