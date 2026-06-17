import type { ReactNode } from "react";

export function PageHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  step,
}: {
  icon: string;
  title: string;
  children: ReactNode;
  step?: string;
}) {
  return (
    <div className="empty">
      <span className="icon">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
      {step ? <span className="badge step">{step}</span> : null}
    </div>
  );
}

export function Denied({ message }: { message: string }) {
  return (
    <div className="denied">
      <h3>403 · Not permitted</h3>
      <p>{message}</p>
    </div>
  );
}
