import { useState, useEffect, useCallback } from 'react';
import { useSettings, useUpdateSettings } from '../api/queries';
import type { Settings as SettingsType } from '../types';

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export function Settings() {
  const { data, isLoading, error } = useSettings();
  const updateMutation = useUpdateSettings();
  const [form, setForm] = useState<SettingsType | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (data && !form) setForm(structuredClone(data));
  }, [data, form]);

  const copyText = useCallback((label: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <div className="card text-center py-12">
          <p className="text-red-600 font-medium mb-2">Failed to load settings</p>
          <p className="text-sm text-slate-500">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-56 bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  async function handleSave() {
    if (!form) return;
    try {
      const next = await updateMutation.mutateAsync(form);
      setForm(structuredClone(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      /* mutation error surfaced below */
    }
  }

  const webhookUrl = `${apiBase}/api/regression/webhooks/jenkins`;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">
            All values below are stored in the API data store and apply to regression analysis and Pipeline polling. Set
            the <span className="font-medium text-slate-700">git repository</span> URL so the
            analyzer can connect Playwright/Codecept behavior with source logic. Secrets and database URLs stay on the
            server - see <span className="font-medium text-slate-700">Server environment</span> at the bottom.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
          {updateMutation.isError && (
            <span className="text-sm text-red-600 font-medium max-w-xs text-right">
              {(updateMutation.error as Error).message}
            </span>
          )}
          <button className="btn-primary" onClick={() => void handleSave()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              'Save all'
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card border-l-4 border-l-blue-500/90">
          <h3 className="text-sm font-semibold text-slate-800">Jenkins</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Used by the API to poll job status for the Pipeline screen. Must match the job that posts webhooks (or use
            Demo Tools without Jenkins).
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Base URL</label>
              <input
                className="input font-mono text-sm"
                value={form.jenkins.url}
                onChange={(e) =>
                  setForm({ ...form, jenkins: { ...form.jenkins, url: e.target.value } })
                }
                placeholder="http://127.0.0.1:8080"
              />
            </div>
            <div>
              <label className="label">Job name</label>
              <input
                className="input"
                value={form.jenkins.jobName}
                onChange={(e) =>
                  setForm({ ...form, jenkins: { ...form.jenkins, jobName: e.target.value } })
                }
                placeholder="shipgate-regression"
              />
              <p className="text-[11px] text-slate-400 mt-1">Folder jobs: use segments e.g. folder/job-name</p>
            </div>
          </div>
        </section>

        <section className="card border-l-4 border-l-violet-500/80">
          <h3 className="text-sm font-semibold text-slate-800">Application under test</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            The app URL recorded for demos and docs (e.g. mortgage calculator for Codecept). E2E uses its own env; this
            keeps Shipgate aligned with your SUT.
          </p>
          <div>
            <label className="label">App URL</label>
            <input
              className="input font-mono text-sm"
              value={form.application.url}
              onChange={(e) =>
                setForm({ ...form, application: { ...form.application, url: e.target.value } })
              }
              placeholder="http://localhost:3099"
            />
          </div>
        </section>

        <section className="card border-l-4 border-l-emerald-600/70">
          <h3 className="text-sm font-semibold text-slate-800">Application git repository</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Remote URL of the repo that contains the app and test logic. The regression analyzer uses this to relate
            what Codecept/Playwright and Allure show at runtime to the implementation (product vs test vs environment).
          </p>
          <div>
            <label className="label">Git remote URL</label>
            <input
              className="input font-mono text-sm"
              value={form.repository.url}
              onChange={(e) =>
                setForm({ ...form, repository: { ...form.repository, url: e.target.value } })
              }
              placeholder="https://github.com/org/shipgate.git"
            />
          </div>
        </section>

        <section className="card">
          <h3 className="text-sm font-semibold text-slate-800">Allure</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Paths on the API host for locating raw results and generated HTML (analysis and Jenkins artifact download).
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Results directory</label>
              <input
                className="input font-mono text-sm"
                value={form.allure.resultsDir}
                onChange={(e) =>
                  setForm({ ...form, allure: { ...form.allure, resultsDir: e.target.value } })
                }
                placeholder="./allure-results or tests/e2e/allure-results"
              />
            </div>
            <div>
              <label className="label">Report directory</label>
              <input
                className="input font-mono text-sm"
                value={form.allure.reportDir}
                onChange={(e) =>
                  setForm({ ...form, allure: { ...form.allure, reportDir: e.target.value } })
                }
                placeholder="./allure-report"
              />
            </div>
          </div>
        </section>

        <section className="card">
          <h3 className="text-sm font-semibold text-slate-800">Classification thresholds</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Minimum confidence to surface a classification, and the bar for automatic labeling when the model is
            confident enough.
          </p>
          <div className="space-y-6">
            <div>
              <label className="label">
                Minimum confidence - {Math.round(form.analysis.minConfidence * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(form.analysis.minConfidence * 100)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    analysis: { ...form.analysis, minConfidence: Number(e.target.value) / 100 },
                  })
                }
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            <div>
              <label className="label">
                Auto-classify at or above - {Math.round(form.analysis.autoClassifyThreshold * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(form.analysis.autoClassifyThreshold * 100)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    analysis: {
                      ...form.analysis,
                      autoClassifyThreshold: Number(e.target.value) / 100,
                    },
                  })
                }
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="card bg-slate-50/80 border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">Jenkins webhook</h3>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          POST build notifications from your Pipeline to this URL. Configure authentication via{' '}
          <code className="bg-white px-1 rounded text-[11px]">WEBHOOK_SECRET</code> on the API (header or body per your
          Jenkins script).
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 break-all">
            {webhookUrl}
          </code>
          <button
            type="button"
            className="btn-secondary text-sm whitespace-nowrap"
            onClick={() => copyText('webhook', webhookUrl)}
          >
            {copied === 'webhook' ? 'Copied' : 'Copy URL'}
          </button>
        </div>
      </section>

      <section className="card border-dashed border-slate-300">
        <h3 className="text-sm font-semibold text-slate-800">Server environment (API process)</h3>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          Not editable here - set in <code className="bg-slate-100 px-1 rounded text-[11px]">.env</code> or your host.
        </p>
        <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
          <li>
            <code className="text-xs bg-slate-100 px-1 rounded">DATABASE_URL</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">REDIS_URL</code> - persistence and queues
          </li>
          <li>
            <code className="text-xs bg-slate-100 px-1 rounded">JENKINS_INTERNAL_URL</code> - when the API runs in
            Docker and must reach Jenkins on the host (e.g. <code className="text-xs">http://host.docker.internal:8080</code>)
          </li>
          <li>
            <code className="text-xs bg-slate-100 px-1 rounded">JENKINS_USER</code> /{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">JENKINS_TOKEN</code> - if Jenkins security is on
          </li>
          <li>
            <code className="text-xs bg-slate-100 px-1 rounded">WEBHOOK_SECRET</code> - shared secret for inbound
            Jenkins webhooks
          </li>
        </ul>
      </section>
    </div>
  );
}
