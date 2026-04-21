const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  SUCCESS: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Success' },
  FAILURE: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Failure' },
  UNSTABLE: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Unstable' },
  ABORTED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Aborted' },
  PASSED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Passed' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Failed' },
};

const fallback = { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Unknown' };

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status?.toUpperCase()] ?? fallback;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
