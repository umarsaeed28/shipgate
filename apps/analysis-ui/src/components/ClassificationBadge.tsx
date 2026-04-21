const classConfig: Record<string, { bg: string; text: string; label: string }> = {
  BUG: { bg: 'bg-red-50', text: 'text-red-700', label: 'Bug' },
  product_bug: { bg: 'bg-red-50', text: 'text-red-700', label: 'Product Bug' },
  TEST_SCRIPT_ISSUE: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Script Issue' },
  test_bug: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Test Bug' },
  TIMEOUT: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Timeout' },
  INFRASTRUCTURE_OR_ENVIRONMENT: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    label: 'Infrastructure',
  },
  environment: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Environment' },
  UNKNOWN_NEEDS_REVIEW: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Needs Review' },
  unknown: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Unknown' },
  flaky: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Flaky' },
};

const fallback = { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Unknown' };

export function ClassificationBadge({ classification }: { classification: string }) {
  const config = classConfig[classification] ?? fallback;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
