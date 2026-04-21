import { useState } from 'react';
import { useSummaries } from '../api/queries';
import { StatusBadge } from '../components/StatusBadge';
import type { RunSummary } from '../types';

export function Reports() {
  const { data, isLoading, error } = useSummaries();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
        <div className="card text-center py-12">
          <p className="text-red-500 font-medium mb-2">Failed to load reports</p>
          <p className="text-sm text-slate-500">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Reports</h2>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">No reports generated yet</p>
          <p className="text-sm text-slate-400 mt-1">Run an analysis to generate reports</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({
  report,
  expanded,
  onToggle,
}: {
  report: RunSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lines = report.summary.split('\n');
  const preview = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">Build #{report.buildNumber}</h3>
            <p className="text-sm text-slate-500">{new Date(report.createdAt).toLocaleString()}</p>
          </div>
          <StatusBadge status={report.status} />
        </div>
        <div className="flex items-center gap-3">
          {report.allureReportUrl && (
            <a
              href={report.allureReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              Allure Report ↗
            </a>
          )}
          <button className="text-slate-400 hover:text-slate-600 transition-colors text-xl px-2">
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-lg p-4 border border-slate-200">
        {expanded ? report.summary : preview}
        {hasMore && !expanded && '...'}
      </div>

      {hasMore && (
        <button
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          onClick={onToggle}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
