import { useAgentStatus } from '../api/queries';

export function TopBar() {
  const { data } = useAgentStatus();

  const overallStatus = data?.agents?.some((a) => a.status === 'error')
    ? 'error'
    : data?.agents?.some((a) => a.status === 'running')
      ? 'running'
      : 'idle';

  const dotColor =
    overallStatus === 'error'
      ? 'bg-red-500'
      : overallStatus === 'running'
        ? 'bg-amber-400'
        : 'bg-green-500';

  const dotPulse = overallStatus === 'running' ? 'animate-pulse' : '';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center px-6 ml-60">
      <h1 className="text-lg font-bold text-slate-900">
        Shipgate Regression Analyzer
      </h1>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${dotPulse}`} />
          <span className="capitalize">{overallStatus}</span>
        </div>
      </div>
    </header>
  );
}
