import { useBugs } from '../api/queries';
import type { Bug } from '../types';

const severityColors: Record<Bug['severity'], string> = {
  critical: 'bg-red-100 text-red-800',
  major: 'bg-orange-100 text-orange-800',
  minor: 'bg-yellow-100 text-yellow-800',
};

const statusColors: Record<Bug['status'], string> = {
  open: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  resolved: 'bg-green-50 text-green-700 ring-1 ring-green-200',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Bugs() {
  const { data: bugs, isLoading } = useBugs();

  const open = bugs?.filter((b) => b.status === 'open') ?? [];
  const resolved = bugs?.filter((b) => b.status === 'resolved') ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Bugs</h2>
        <div className="card animate-pulse h-48 bg-slate-50" />
      </div>
    );
  }

  if (!bugs || bugs.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Bugs</h2>
        <div className="card text-center py-16">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-lg font-medium text-slate-700">No bugs tracked</p>
          <p className="text-sm text-slate-500 mt-1">
            Inject a bug from Demo Tools to see it tracked here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Bugs</h2>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {open.length} Open
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {resolved.length} Resolved
          </span>
        </div>
      </div>

      {open.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Open Bugs</h3>
          {open.map((bug) => (
            <BugCard key={bug.id} bug={bug} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resolved</h3>
          {resolved.map((bug) => (
            <BugCard key={bug.id} bug={bug} />
          ))}
        </div>
      )}
    </div>
  );
}

function BugCard({ bug }: { bug: Bug }) {
  return (
    <div className={`card border-l-4 ${bug.status === 'open' ? 'border-l-red-500' : 'border-l-green-500'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900">{bug.title}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[bug.severity]}`}>
              {bug.severity}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[bug.status]}`}>
              {bug.status}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-2">{bug.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-slate-700">Component:</span> {bug.component}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-slate-700">Injected:</span> {timeAgo(bug.injectedAt)}
            </span>
            {bug.resolvedAt && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium text-slate-700">Resolved:</span> {timeAgo(bug.resolvedAt)}
              </span>
            )}
            {bug.relatedRunIds.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium text-slate-700">Runs:</span> {bug.relatedRunIds.length}
              </span>
            )}
            {bug.relatedFailureIds.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="font-medium text-slate-700">Failures:</span> {bug.relatedFailureIds.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
