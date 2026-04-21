import { useParams, Link } from 'react-router-dom';
import { useRun } from '../api/queries';
import { StatusBadge } from '../components/StatusBadge';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import { ClassificationChart } from '../components/TrendChart';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useRun(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-60 bg-slate-200 rounded animate-pulse" />
        <div className="card h-96 animate-pulse bg-slate-50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link to="/runs" className="btn-secondary text-sm">← Back to Runs</Link>
        <div className="card text-center py-12">
          <p className="text-slate-500">
            {error ? `Failed to load: ${(error as Error).message}` : 'Run not found'}
          </p>
        </div>
      </div>
    );
  }

  const passRate = data.total > 0 ? ((data.passed / data.total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/runs" className="hover:text-blue-600 transition-colors">Runs</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Build #{data.buildNumber}</span>
      </div>

      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              Build #{data.buildNumber}
              <StatusBadge status={data.status} />
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Started {new Date(data.startedAt).toLocaleString()} · Duration {formatDuration(data.duration)}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-600">{data.passed}</p>
              <p className="text-xs text-slate-500">Passed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{data.failed}</p>
              <p className="text-xs text-slate-500">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-400">{data.skipped}</p>
              <p className="text-xs text-slate-500">Skipped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{passRate}%</p>
              <p className="text-xs text-slate-500">Pass Rate</p>
            </div>
          </div>
        </div>
      </div>

      {data.allureReportUrl && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-sm font-semibold text-slate-700">Allure Report</h3>
            <a
              href={data.allureReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              Open in new tab ↗
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Interactive test report (suites, steps, attachments). Embedded below; use the link if the frame is blocked.
          </p>
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
            <iframe
              title="Allure Report"
              src={data.allureReportUrl}
              className="w-full min-h-[720px] bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </div>
      )}

      {data.summary && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Analysis Summary</h3>
          <pre className="whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 rounded-lg p-4 overflow-auto max-h-96 border border-slate-200">
            {data.summary.summary}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {data.failures && data.failures.length > 0 ? (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <h3 className="text-sm font-semibold text-slate-700">
                  Failures ({data.failures.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {data.failures.map((f) => (
                  <div key={f.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{f.testName}</p>
                        <p className="text-sm text-slate-500">{f.suiteName}</p>
                      </div>
                      <ClassificationBadge classification={f.classification} />
                    </div>
                    <div className="mb-2 max-w-xs">
                      <ConfidenceMeter value={f.confidence} />
                    </div>
                    {f.errorMessage && (
                      <pre className="text-xs text-red-700 bg-red-50 rounded p-2 overflow-auto max-h-32 mt-2">
                        {f.errorMessage}
                      </pre>
                    )}
                    {f.action && (
                      <p className="text-sm text-blue-600 mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                        {f.action}
                      </p>
                    )}
                    {f.evidence && f.evidence.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-slate-600 mt-2 space-y-0.5">
                        {f.evidence.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card text-center py-12 text-slate-500">
              No failures in this run.
            </div>
          )}
        </div>

        <div>
          {data.classificationBreakdown && Object.keys(data.classificationBreakdown).length > 0 && (
            <ClassificationChart breakdown={data.classificationBreakdown} />
          )}
        </div>
      </div>
    </div>
  );
}
