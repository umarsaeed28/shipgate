import type { ReactNode } from "react";

export function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MetricPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-rose-400"
        : tone === "warn"
          ? "text-amber-400"
          : "text-zinc-200";
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/80 hover:bg-zinc-900/80">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-zinc-300">
                  {cell === null || cell === undefined || cell === "" ? "—" : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "ok" | "err" }) {
  const cls =
    variant === "ok"
      ? "bg-emerald-950 text-emerald-300 ring-emerald-800"
      : variant === "err"
        ? "bg-rose-950 text-rose-300 ring-rose-800"
        : "bg-zinc-800 text-zinc-300 ring-zinc-700";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${cls}`}>{children}</span>;
}
