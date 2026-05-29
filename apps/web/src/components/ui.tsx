import React from "react";

/* ── Card ────────────────────────────────────────────────── */

export function Card({
  title,
  children,
  action,
  noPadding,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`animate-fade-in overflow-hidden rounded-[var(--radius-xl)] border bg-[--bg-card] shadow-sm ${className ?? ""}`}
      style={{ borderColor: "var(--border-primary)" }}
    >
      {title && (
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: "var(--border-secondary)" }}
        >
          <h2 className="text-[16px] font-semibold tracking-tight text-[--text-primary]">{title}</h2>
          {action}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </section>
  );
}

/* ── KPI / Metric ───────────────────────────────────────── */

export function MetricPill({
  label,
  value,
  tone = "neutral",
  subtitle,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn" | "neutral";
  subtitle?: string;
}) {
  const toneColors = {
    good: "text-[--accent-green]",
    bad: "text-[--accent-red]",
    warn: "text-[--accent-orange]",
    neutral: "text-[--text-primary]",
  };

  return (
    <div
      className="animate-fade-in rounded-[var(--radius-xl)] border bg-[--bg-card] p-5 shadow-sm"
      style={{ borderColor: "var(--border-primary)" }}
    >
      <div className="text-[12px] font-medium uppercase tracking-wide text-[--text-tertiary]">{label}</div>
      <div
        className={`mt-2 text-[28px] font-bold tabular-nums leading-none tracking-tight md:text-[32px] ${toneColors[tone]}`}
      >
        {value}
      </div>
      {subtitle && <div className="mt-1.5 text-[12px] text-[--text-quaternary]">{subtitle}</div>}
    </div>
  );
}

/* ── Data Table ─────────────────────────────────────────── */

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="py-14 text-center text-[14px] text-[--text-tertiary]">No data available</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[14px]">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border-secondary)" }}>
            {columns.map((c) => (
              <th
                key={c}
                className="px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-[--text-quaternary]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b transition-colors hover:bg-[--bg-hover]"
              style={{ borderColor: "var(--border-secondary)" }}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-3 text-[--text-secondary]">
                  {cell === null || cell === undefined || cell === "" ? (
                    <span className="text-[--text-quaternary]">&mdash;</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Status badge (PASS / FAIL / FLAKY / RUNNING) ─────────── */

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "ok" | "err" | "warn" | "running";
}) {
  const styles = {
    ok: "bg-[--accent-green-soft] text-[--accent-green]",
    err: "bg-[--accent-red-soft] text-[--accent-red]",
    warn: "bg-[--accent-orange-soft] text-[--accent-orange]",
    running: "bg-[--accent-blue-soft] text-[--accent-blue]",
    default: "bg-[--color-primary-soft] text-[--color-primary]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

/* ── Skeleton ────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg ${className ?? "h-4 w-full"}`}
      style={{
        background: "var(--bg-inset)",
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, rgba(91,124,250,0.06) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.8s infinite",
      }}
    />
  );
}

/* ── Empty State ─────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      {icon && <div className="mb-3 text-[--text-quaternary]">{icon}</div>}
      <h3 className="text-[16px] font-semibold text-[--text-secondary]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-[--text-tertiary]">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Button ──────────────────────────────────────────────── */

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary: "text-white hover:brightness-[1.03] active:scale-[0.98]",
    secondary:
      "bg-[--bg-card] text-[--text-primary] border border-[--border-primary] hover:bg-[--bg-hover]",
    ghost: "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]",
    danger: "bg-[--accent-red-soft] text-[--accent-red] hover:bg-[--accent-red] hover:text-white",
  };

  const sizes = {
    sm: "px-3.5 py-1.5 text-[12px] gap-1.5",
    md: "px-5 py-2.5 text-[14px] gap-2",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]}`}
      style={
        variant === "primary"
          ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-primary)" }
          : undefined
      }
    >
      {children}
    </button>
  );
}
