"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ChatAssistant } from "./chat-assistant";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[--bg-primary]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto min-h-full w-full max-w-[1440px] px-6 py-8">{children}</div>
        </main>
      </div>
      <ChatAssistant />
    </div>
  );
}
