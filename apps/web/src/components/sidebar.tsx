"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavId } from "@shipgate/shared";

const items: { href: string; label: string; id: NavId }[] = [
  { href: "/", label: "Overview", id: "overview" },
  { href: "/applications", label: "Applications", id: "applications" },
  { href: "/suites", label: "Test Suites", id: "suites" },
  { href: "/cases", label: "Test Cases", id: "cases" },
  { href: "/runs", label: "Test Runs", id: "runs" },
  { href: "/run-center", label: "Run Center", id: "run-center" },
  { href: "/stories", label: "Stories", id: "stories" },
  { href: "/conductor", label: "Test Conductor", id: "conductor" },
  { href: "/pipelines", label: "AI Pipeline", id: "pipelines" },
  { href: "/integrations", label: "Integrations", id: "integrations" },
  { href: "/admin", label: "Admin", id: "admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Shipgate</div>
        <div className="text-sm font-semibold text-zinc-100">AI QA Control Center</div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3 text-xs text-zinc-500">Phase 1 · Local MVP</div>
    </aside>
  );
}
