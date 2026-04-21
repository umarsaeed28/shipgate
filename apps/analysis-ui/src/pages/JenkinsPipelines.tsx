import { Link, useNavigate } from 'react-router-dom';
import { useJenkinsPipeline, useAnalyzeLatest, useAnalyzeBuild } from '../api/queries';

function formatTs(ms: number): string {
  if (!ms) return '-';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '-';
  }
}

export function JenkinsPipelines() {
  const navigate = useNavigate();
  const { data, isLoading, error, isFetching } = useJenkinsPipeline();
  const analyzeLatest = useAnalyzeLatest();
  const analyzeBuild = useAnalyzeBuild();

  const handleAnalyzeOne = async (buildId: string) => {
    const res = await analyzeBuild.mutateAsync(buildId);
    const runId = res.analysis?.runId;
    if (runId) navigate(`/runs/${runId}`);
  };

  const mode = data?.pipelineMode ?? 'jenkins';
  const isLocal = mode === 'local';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {isLocal ? 'Regression pipeline' : 'Jenkins · Regression pipeline'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isLocal ? (
              <>
                Runs started from <Link to="/demo-tools" className="text-blue-600 font-medium hover:underline">Demo Tools</Link> appear
                here - same flow as a CI job, without a live Jenkins server.
              </>
            ) : (
              <>
                Live status from your Jenkins server (job name matches{' '}
                <span className="font-mono text-slate-700">Settings → Jenkins job name</span>). Webhook
                builds appear in Shipgate until you run analysis.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLocal ? (
            <Link to="/demo-tools" className="btn-secondary text-sm">
              Open Demo Tools ↗
            </Link>
          ) : (
            data?.jobUiUrl && (
              <a
                href={data.jobUiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                Open Jenkins job ↗
              </a>
            )
          )}
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={analyzeLatest.isPending}
            onClick={() => analyzeLatest.mutate()}
          >
            {analyzeLatest.isPending ? 'Analyzing…' : 'Run analysis (next pending)'}
          </button>
        </div>
      </div>

      {isLocal && data?.liveJenkinsError && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <span className="font-medium">Analyzer mode:</span> live Jenkins is not reachable. Showing runs
          recorded by this API ({data.jenkinsUrl}). For real CI, start Jenkins and align Settings, or set{' '}
          <code className="bg-white/80 px-1 rounded text-xs">JENKINS_INTERNAL_URL</code> if the API runs in Docker.
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400">Refreshing…</p>
      )}

      {isLoading && (
        <div className="card h-40 animate-pulse bg-slate-50" />
      )}

      {error && (
        <div className="card text-center py-8 text-red-600 text-sm">
          {(error as Error).message}
        </div>
      )}

      {data && (
        <>
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Configuration</h3>
            <p className="text-xs text-slate-500 font-mono break-all">
              {data.jenkinsUrl} · job <span className="text-slate-800">{data.jobName}</span>
            </p>
            {data.jenkinsFetchBase && (
              <p className="text-xs text-slate-600 mt-2">
                API connects to Jenkins at{' '}
                <span className="font-mono text-slate-700">{data.jenkinsFetchBase}</span> (
                <code className="bg-slate-100 px-1 rounded">JENKINS_INTERNAL_URL</code>).
              </p>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {isLocal ? 'Recent runs (analyzer)' : 'Running on Jenkins'}
              </h3>
              <span className="text-[11px] text-slate-400">Polls every 4s</span>
            </div>
            {data.remote.ok ? (
              data.remote.job.builds.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-500 text-center">
                  {isLocal
                    ? 'No analyzer runs yet. Go to Demo Tools and click “Run Regression Suite”.'
                    : 'No builds yet. Trigger the job in Jenkins or push a commit.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-5 py-2.5 font-medium">#</th>
                        <th className="px-5 py-2.5 font-medium">Status</th>
                        <th className="px-5 py-2.5 font-medium">When</th>
                        <th className="px-5 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.remote.job.builds.map((b) => (
                        <tr key={b.number} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-mono font-semibold text-blue-700">#{b.number}</td>
                          <td className="px-5 py-3">
                            {b.building ? (
                              <span className="text-amber-600 font-medium">Building…</span>
                            ) : (
                              <span
                                className={
                                  b.result === 'SUCCESS'
                                    ? 'text-green-600'
                                    : b.result === 'FAILURE'
                                      ? 'text-red-600'
                                      : 'text-slate-600'
                                }
                              >
                                {b.result ?? '-'}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs">{formatTs(b.timestamp)}</td>
                          <td className="px-5 py-3 text-right">
                            {isLocal && (b.url === '#' || !(b.url ?? '').startsWith('http')) ? (
                              <Link
                                to="/demo-tools"
                                className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                              >
                                Demo Tools
                              </Link>
                            ) : (
                              <a
                                href={b.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                              >
                                Console ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="px-5 py-6 text-sm text-amber-800 bg-amber-50/80 border-t border-amber-100">
                <p className="font-medium mb-1">Could not use Jenkins response</p>
                <p className="text-xs text-amber-900/90">{data.remote.error}</p>
                <p className="text-xs text-slate-600 mt-2">
                  Fix auth or job name in Settings, or use Demo Tools for an analyzer-only run.
                </p>
              </div>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80">
              <h3 className="text-sm font-semibold text-slate-800">Ingested in Shipgate</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLocal
                  ? 'Builds created when a regression finishes (Demo Tools or webhook). Run analysis to open the run.'
                  : 'After a Jenkins build finishes, the webhook records it here. Run analysis to classify failures and open the run.'}
              </p>
            </div>
            {data.recorded.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">
                {isLocal ? (
                  <>
                    No builds in the store yet. Complete a run from{' '}
                    <Link to="/demo-tools" className="text-blue-600 font-medium hover:underline">Demo Tools</Link>.
                  </>
                ) : (
                  <>
                    No Jenkins builds recorded yet. Configure the pipeline to POST to{' '}
                    <code className="text-xs bg-slate-100 px-1 rounded">/api/regression/webhooks/jenkins</code>.
                  </>
                )}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-2.5 font-medium">Job</th>
                      <th className="px-5 py-2.5 font-medium">Build</th>
                      <th className="px-5 py-2.5 font-medium">Jenkins</th>
                      <th className="px-5 py-2.5 font-medium">Analysis</th>
                      <th className="px-5 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recorded.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-slate-700">{r.jobName}</td>
                        <td className="px-5 py-3 font-mono">#{r.buildNumber}</td>
                        <td className="px-5 py-3">
                          <span
                            className={
                              r.status === 'SUCCESS'
                                ? 'text-green-600'
                                : r.status === 'FAILURE'
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {r.processed ? (
                            <span className="text-green-600 text-xs font-medium">Done</span>
                          ) : (
                            <span className="text-amber-600 text-xs font-medium">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right space-x-2">
                          {!r.processed && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                              disabled={analyzeBuild.isPending}
                              onClick={() => handleAnalyzeOne(r.id)}
                            >
                              Analyze
                            </button>
                          )}
                          {r.jenkinsBuildUrl && (
                            <a
                              href={r.jenkinsBuildUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-500 hover:text-slate-800"
                            >
                              Jenkins ↗
                            </a>
                          )}
                          {r.allureReportUrl && (
                            <a
                              href={r.allureReportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-teal-600 hover:text-teal-800"
                            >
                              Allure ↗
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
              Tip: use <Link to="/" className="text-blue-600 hover:underline">Overview → Run Analysis Now</Link> to
              process the next pending build in queue.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
