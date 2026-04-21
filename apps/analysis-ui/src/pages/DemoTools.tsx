import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDemoSettings,
  useInjectBug,
  useRunRegression,
  useRunStatus,
  useResetDemo,
} from '../api/queries';

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DemoTools() {
  const navigate = useNavigate();
  const demoSettings = useDemoSettings();
  const injectBug = useInjectBug();
  const runRegression = useRunRegression();
  const resetDemo = useResetDemo();

  const [activeToken, setActiveToken] = useState<string | null>(null);
  const runStatus = useRunStatus(activeToken);

  const logRef = useRef<HTMLPreElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [runStatus.data?.log]);

  const currentSettings = demoSettings.data ?? { simulateBug: false, simulateDelay: false };

  const handleToggle = useCallback(
    (field: 'simulateBug' | 'simulateDelay') => {
      injectBug.mutate({
        ...currentSettings,
        [field]: !currentSettings[field],
      });
    },
    [currentSettings, injectBug],
  );

  const handleRunRegression = useCallback(async () => {
    try {
      const result = await runRegression.mutateAsync();
      setActiveToken(result.token);
      window.open(`/jenkins/console/${result.token}`, '_blank');
    } catch {
      // 409 = already running
    }
  }, [runRegression]);

  const handleReset = useCallback(() => {
    resetDemo.mutate();
    setActiveToken(null);
  }, [resetDemo]);

  const isDone = runStatus.data?.status === 'passed' || runStatus.data?.status === 'failed';
  const isRunning = activeToken != null && !isDone;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Demo Tools</h2>
          <p className="text-sm text-slate-500 mt-1">
            Inject bugs, run the regression suite, and analyze results - all from one place.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetDemo.isPending}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          {resetDemo.isPending ? 'Resetting…' : 'Reset Demo'}
        </button>
      </div>

      {/* Bug Injection */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 text-base">🧪</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Bug Injection</h3>
            <p className="text-xs text-slate-500">Toggle bugs on the Mortgage Calculator app remotely</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <ToggleRow
            label="Inject Calculation Bug: +$50 to P&I"
            description="Adds $50 to the Principal & Interest calculation. A $280K loan at 6.5%/30yr should be ~$1,770/mo - with this bug it becomes ~$1,820/mo. Tests that assert on P&I ranges (01_calculations) will fail; other tests remain unaffected."
            checked={currentSettings.simulateBug}
            onChange={() => handleToggle('simulateBug')}
            disabled={injectBug.isPending}
            color="red"
          />
          <ToggleRow
            label="Inject Delay Bug: 5s Calculation Lag"
            description="Adds a 5-second delay before the mortgage calculator returns results. Tests with tight wait timeouts may fail with TimeoutError while waiting for the results panel to appear."
            checked={currentSettings.simulateDelay}
            onChange={() => handleToggle('simulateDelay')}
            disabled={injectBug.isPending}
            color="amber"
          />
          <div className="flex items-center gap-3 pt-2">
            <a
              href="http://localhost:3099"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              Open Mortgage App ↗
            </a>
            {currentSettings.simulateBug && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-100">
                +$50 P&I Bug Active
              </span>
            )}
            {currentSettings.simulateDelay && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                5s Delay Active
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Run Regression Suite */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-base">▶</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Run Regression Suite</h3>
            <p className="text-xs text-slate-500">Execute CodeceptJS tests and auto-analyze results</p>
          </div>
        </div>
        <div className="p-5">
          {!activeToken ? (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm mb-4">
                {currentSettings.simulateBug && currentSettings.simulateDelay
                  ? 'Both bugs active: P&I will be off by $50 and calculations will lag 5s. Expect calculation assertion failures and possible timeouts.'
                  : currentSettings.simulateBug
                  ? 'P&I calculation bug active (+$50). Tests in 01_calculations that check P&I ranges will fail; other test suites should pass.'
                  : currentSettings.simulateDelay
                  ? 'Delay bug active (5s lag). Tests with tight timeouts may fail with TimeoutError.'
                  : 'No bugs injected - all regression tests should pass cleanly.'}
              </p>
              <button
                onClick={handleRunRegression}
                disabled={runRegression.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {runRegression.isPending ? (
                  <>
                    <Spinner /> Starting…
                  </>
                ) : (
                  <>▶ Run Regression Suite</>
                )}
              </button>
              {runRegression.isError && (
                <p className="text-red-600 text-xs mt-3">
                  {(runRegression.error as Error)?.message?.includes('409')
                    ? 'A run is already in progress.'
                    : `Error: ${(runRegression.error as Error).message}`}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isRunning ? (
                    <>
                      <Spinner />
                      <span className="text-sm font-medium text-blue-700">Running…</span>
                    </>
                  ) : runStatus.data?.status === 'passed' ? (
                    <>
                      <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
                      <span className="text-sm font-medium text-green-700">Passed</span>
                    </>
                  ) : (
                    <>
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">✕</span>
                      <span className="text-sm font-medium text-red-700">Failed</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {formatElapsed(runStatus.data?.elapsed ?? 0)}
                </span>
              </div>

              {/* Progress bar (indeterminate while running) */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                {isRunning ? (
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      runStatus.data?.status === 'passed' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: '100%' }}
                  />
                )}
              </div>

              {/* Live log */}
              <pre
                ref={logRef}
                className="bg-slate-900 text-slate-200 text-[11px] leading-relaxed font-mono p-4 rounded-lg max-h-80 overflow-y-auto whitespace-pre-wrap break-words"
              >
                {runStatus.data?.log || 'Waiting for output…'}
              </pre>

              {/* Actions after completion */}
              {isDone && (
                <div className="flex items-center gap-3 pt-2">
                  {runStatus.data?.runId && (
                    <button
                      onClick={() => navigate(`/runs/${runStatus.data!.runId}`)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      View Results →
                    </button>
                  )}
                  <button
                    onClick={() => setActiveToken(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    New Run
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 text-base">⚡</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction
            label="Open Mortgage App"
            description="View the SUT in a new tab"
            href="http://localhost:3099"
            icon="🏠"
          />
          <QuickAction
            label="View Overview"
            description="Dashboard with pass rates & trends"
            onClick={() => navigate('/')}
            icon="📊"
          />
          <QuickAction
            label="View Failures"
            description="All classified test failures"
            onClick={() => navigate('/failures')}
            icon="⚠️"
          />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  color,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  color: 'red' | 'amber';
}) {
  const bgColor = checked
    ? color === 'red'
      ? 'bg-red-500'
      : 'bg-amber-500'
    : 'bg-slate-200';

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50 ${bgColor}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          } mt-0.5`}
        />
      </button>
    </div>
  );
}

function QuickAction({
  label,
  description,
  href,
  onClick,
  icon,
}: {
  label: string;
  description: string;
  href?: string;
  onClick?: () => void;
  icon: string;
}) {
  const cls =
    'flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer';

  const content = (
    <>
      <span className="text-lg mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={cls + ' text-left w-full'}>
      {content}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
