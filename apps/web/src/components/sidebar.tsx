"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavId } from "@shipgate/shared";

const navItems: { href: string; label: string; id: NavId }[] = [
  { href: "/", label: "Overview", id: "overview" },
  { href: "/applications", label: "Applications", id: "applications" },
  { href: "/suites", label: "Test Suites", id: "suites" },
  { href: "/cases", label: "Test Cases", id: "cases" },
  { href: "/runs", label: "Test Runs", id: "runs" },
  { href: "/run-center", label: "Run Center", id: "run-center" },
  { href: "/stories", label: "Stories", id: "stories" },
  { href: "/integrations", label: "Integrations", id: "integrations" },
  { href: "/admin", label: "Admin", id: "admin" },
];

function NavIcon({ id }: { id: NavId }) {
  const common = "h-5 w-5 shrink-0";
  switch (id) {
    case "overview":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    case "applications":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25a2.25 2.25 0 01-2.25 2.25H15.75a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case "suites":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m0 0a2.25 2.25 0 00-.75 1.128v5.25c0 .414.336.75.75.75h15a.75.75 0 00.75-.75v-5.25a2.25 2.25 0 00-.75-1.128m-12 0h12" />
        </svg>
      );
    case "cases":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      );
    case "runs":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
      );
    case "run-center":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75v-6z" />
        </svg>
      );
    case "stories":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c1.052 0 2.062.18 3 .512V7.512A8.967 8.967 0 0012 6.042zm0 0c1.125 0 2.25.18 3 .512v14.25A8.987 8.987 0 0018 18c1.052 0 2.062.18 3 .512V7.512A8.967 8.967 0 0015 6.042c-1.125 0-2.25.18-3 .512z" />
        </svg>
      );
    case "integrations":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      );
    case "admin":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      );
    case "conductor":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.756-.542 1.194-.542s.877.158 1.195.542l2.5 3.03M11.42 15.17L6.98 9.73a2.652 2.652 0 010-3.75l.75-.75a2.652 2.652 0 013.75 0l5.44 5.44" />
        </svg>
      );
    case "pipelines":
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15-3.75v3.75m0 0h3.75m-3.75 0H9m3.75 0H12m0 0h3.75m-3.75 0v3.75M4.5 15.75v3.75m0-3.75h3.75m-3.75 0H9m3.75 0H12m0 0h3.75m-3.75 0v3.75" />
        </svg>
      );
  }
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-[220px] shrink-0 flex-col border-r py-5"
      style={{
        background: "var(--sidebar-bg)",
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <Link href="/" className="mb-6 flex items-center gap-2.5 px-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-md"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          QA
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-tight" style={{ color: "var(--sidebar-text)" }}>
            Control Center
          </div>
          <div className="text-[11px] leading-tight" style={{ color: "var(--sidebar-muted)" }}>
            QA operations
          </div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main">
        {navItems.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-[13px] font-medium transition-colors ${
                active ? "bg-white/15 border-white/80" : "hover:bg-white/10"
              }`}
              style={{
                color: active ? "#fff" : "var(--sidebar-text)",
              }}
            >
              <NavIcon id={item.id} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t px-5 pt-4 text-[11px]" style={{ borderColor: "rgba(255,255,255,0.12)", color: "var(--sidebar-muted)" }}>
        v1 · Internal
      </div>
    </aside>
  );
}
