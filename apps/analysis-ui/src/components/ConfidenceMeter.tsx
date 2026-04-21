interface ConfidenceMeterProps {
  value: number;
  showLabel?: boolean;
}

export function ConfidenceMeter({ value, showLabel = true }: ConfidenceMeterProps) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-teal-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-600 tabular-nums w-9 text-right">
          {pct}%
        </span>
      )}
    </div>
  );
}
