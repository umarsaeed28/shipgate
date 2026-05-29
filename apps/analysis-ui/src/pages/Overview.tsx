import { Link } from 'react-router-dom';
import { useOverview, useAnalyzeLatest } from '../api/queries';
import { KpiCard } from '../components/KpiCard';
import { PassFailTrend, ClassificationChart } from '../components/TrendChart';
import type { OverviewResponse } from '../types';

export function Overview() {
  const { data, isLoading, error } = useOverview();
  const analyze = useAnalyzeLatest();

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
        <div className="card text-center py-12">
          <p className="text-slate-500 mb-4">Unable to load overview data. Make sure the API is running.</p>
          <p className="text-sm text-slate-400">API: http://localhost:4000</p>
        </div>
      </div>
    );
  }

  const overview: OverviewResponse = data;
  const totalTests = overview.totals?.tests ?? 0;
  const totalPassed = overview.totals?.passed ?? 0;
  const totalFailed = overview.totals?.failed ?? 0;
  const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

  const trendData = overview.passFailTrend ?? [];
  const prevPassRate =
    trendData.length >= 2
      ? (trendData[trendData.length - 2].passRate ?? 0) * 100
      : passRate;
  const passRateTrend = passRate - prevPassRate;

  const buildNumber = overview.latestBuild?.buildNumber ?? null;
  const buildStatus = overview.latestBuild?.status ?? 'UNKNOWN';

  const statusColor =
    buildStatus === 'SUCCESS'
      ? 'text-green-600'
      : buildStatus === 'FAILURE'
        ? 'text-red-600'
        : 'text-amber-600';

  const agentStatus = overview.agentState?.status ?? 'unknown';
  const agentLastRun = overview.agentState?.lastRunAt;

  const latestSummary =
    overview.recentSummaries && overview.recentSummaries.length > 0
      ? overview.recentSummaries[0]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Overview</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Command center for CI quality. The regression agent ingests runs and classifications; open the{' '}
            <Link to="/agent" className="text-blue-600 hover:text-blue-800 font-medium">
              Agent console
            </Link>{' '}
            to monitor work, queue jobs, and read intelligence findings.
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
        >
          {analyze.isPending ? 'Analyzing...' : 'Run Analysis Now'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Latest Build"
          value={buildNumber != null ? `#${buildNumber}` : 'N/A'}
          subtitle={<span className={`text-xs font-semibold ${statusColor}`}>{buildStatus}</span>}
        />
        <KpiCard
          title="Pass Rate"
          value={`${passRate.toFixed(1)}%`}
          trend={passRateTrend}
        />
        <KpiCard
          title="Total Failures"
          value={totalFailed}
          subtitle={
            overview.classificationBreakdown ? (
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(overview.classificationBreakdown)
                  .filter(([, v]) => v > 0)
                  .slice(0, 3)
                  .map(([k, v]) => (
                    <span key={k} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      {k.replace(/_/g, ' ')}: {v}
                    </span>
                  ))}
              </div>
            ) : undefined
          }
        />
        <KpiCard
          title="Agent Status"
          value={<span className="capitalize">{agentStatus}</span>}
          subtitle={
            agentLastRun
              ? `Last run: ${formatRelative(agentLastRun)}`
              : 'No runs yet'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PassFailTrend data={trendData} />
        <ClassificationChart breakdown={overview.classificationBreakdown ?? {}} />
      </div>

      {latestSummary && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Latest Analysis Summary
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Build #{latestSummary.buildNumber} - {latestSummary.shortSummary}
          </p>
          <p className="text-xs text-slate-500">
            {formatRelative(latestSummary.createdAt)}
          </p>
        </div>
      )}

      {analyze.isSuccess && (
        <div className="card border-green-200 bg-green-50">
          <p className="text-green-800 text-sm font-medium">
            Analysis completed. Data refreshed.
          </p>
        </div>
      )}
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card">
            <div className="h-4 w-24 bg-slate-200 rounded mb-3 animate-pulse" />
            <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card h-72 animate-pulse bg-slate-50" />
        <div className="card h-72 animate-pulse bg-slate-50" />
      </div>
    </div>
  );
}
