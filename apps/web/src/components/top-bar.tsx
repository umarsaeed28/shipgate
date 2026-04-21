"use client";

export function TopBar() {
  return (
    <header
      className="flex h-14 shrink-0 items-center gap-4 border-b px-6"
      style={{
        borderColor: "var(--border-primary)",
        background: "var(--bg-elevated)",
      }}
    >
      <div className="relative min-w-0 flex-1 max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--text-quaternary]" aria-hidden>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Search runs, suites, cases…"
          className="w-full rounded-xl border py-2 pl-9 pr-3 text-[13px] text-[--text-primary] placeholder:text-[--text-quaternary] outline-none transition-shadow focus:ring-2 focus:ring-[--color-primary]/25"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-surface)" }}
          aria-label="Search"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.082A2.02 2.02 0 0021 14.5V9.5a2.02 2.02 0 00-1.689-1.918 23.85 23.85 0 00-5.454-1.082M14.857 17.082A23.848 23.848 0 0012 17.5c-1.03 0-2.03-.117-2.857-.418M14.857 17.082L15 21M9.857 17.082L10 21m-5-3.5a2.02 2.02 0 01-1.689-1.918V9.5a2.02 2.02 0 011.689-1.918 23.85 23.85 0 015.454-1.082M10 7.5a3 3 0 116 0 3 3 0 01-6 0z" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[--accent-red]" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold text-white"
          style={{ background: "var(--gradient-primary)" }}
          title="User"
        >
          U
        </div>
      </div>
    </header>
  );
}
