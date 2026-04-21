import { useState, useMemo } from 'react';
import { useFailures, useBuilds } from '../api/queries';
import { DataTable, type Column } from '../components/DataTable';
import { ClassificationBadge } from '../components/ClassificationBadge';
import { ConfidenceMeter } from '../components/ConfidenceMeter';
import type { TestFailure } from '../types';

const CLASSIFICATIONS = [
  { value: '', label: 'All Classifications' },
  { value: 'BUG', label: 'Bug' },
  { value: 'TEST_SCRIPT_ISSUE', label: 'Script Issue' },
  { value: 'TIMEOUT', label: 'Timeout' },
  { value: 'INFRASTRUCTURE_OR_ENVIRONMENT', label: 'Infrastructure' },
  { value: 'UNKNOWN_NEEDS_REVIEW', label: 'Needs Review' },
];

const columns: Column<TestFailure>[] = [
  {
    key: 'testName',
    header: 'Test Name',
    sortable: true,
    sortValue: (f) => f.testName,
    render: (f) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate max-w-xs">{f.testName}</p>
        <p className="text-xs text-slate-500">{f.suiteName}</p>
      </div>
    ),
  },
  {
    key: 'classification',
    header: 'Classification',
    render: (f) => <ClassificationBadge classification={f.classification} />,
  },
  {
    key: 'confidence',
    header: 'Confidence',
    sortable: true,
    sortValue: (f) => f.confidence,
    className: 'min-w-[140px]',
    render: (f) => <ConfidenceMeter value={f.confidence} />,
  },
  {
    key: 'error',
    header: 'Error Summary',
    render: (f) => (
      <p className="text-sm text-slate-600 truncate max-w-xs" title={f.errorMessage}>
        {f.errorMessage}
      </p>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (f) => (
      <span className="text-sm text-teal-600 truncate max-w-[180px] inline-block">
        {f.action ?? '-'}
      </span>
    ),
  },
  {
    key: 'build',
    header: 'Build',
    sortable: true,
    sortValue: (f) => f.buildNumber ?? 0,
    render: (f) => (
      <span className="text-sm text-slate-600">
        {f.buildNumber ? `#${f.buildNumber}` : '-'}
      </span>
    ),
  },
];

export function Failures() {
  const [classFilter, setClassFilter] = useState('');
  const [buildFilter, setBuildFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState(0);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (classFilter) params.classification = classFilter;
    if (buildFilter) params.buildNumber = buildFilter;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [classFilter, buildFilter]);

  const { data, isLoading } = useFailures(queryParams);
  const { data: builds } = useBuilds();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (minConfidence === 0) return data;
    return data.filter((f) => f.confidence >= minConfidence / 100);
  }, [data, minConfidence]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Failure Analysis</h2>

      <div className="card">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[180px]">
            <label className="label">Classification</label>
            <select
              className="select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="label">Build #</label>
            <select
              className="select"
              value={buildFilter}
              onChange={(e) => setBuildFilter(e.target.value)}
            >
              <option value="">All Builds</option>
              {builds?.map((b) => (
                <option key={b.number} value={String(b.number)}>#{b.number}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="label">Min Confidence: {minConfidence}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
          {(classFilter || buildFilter || minConfidence > 0) && (
            <button
              className="btn-secondary text-sm"
              onClick={() => {
                setClassFilter('');
                setBuildFilter('');
                setMinConfidence(0);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-64 bg-slate-50" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(f) => f.id}
          expandable
          renderExpanded={(f) => (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Full Error</p>
                <pre className="text-xs text-red-700 bg-red-50 rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                  {f.errorMessage}
                </pre>
              </div>
              {f.stackTrace && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Stack Trace</p>
                  <pre className="text-xs text-slate-200 bg-slate-900 rounded-lg p-3 overflow-auto max-h-48">
                    {f.stackTrace}
                  </pre>
                </div>
              )}
              {f.action && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Suggested Action</p>
                  <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3">
                    {f.action}
                  </p>
                </div>
              )}
              {f.evidence && f.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Evidence</p>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                    {f.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          emptyMessage="No failures found matching the current filters"
        />
      )}
    </div>
  );
}
