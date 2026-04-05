import { Sidebar } from "./sidebar";
import { ChatAssistant } from "./chat-assistant";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-zinc-800 px-8 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Operations</h1>
          <p className="text-sm text-zinc-500">Test suites, runs, integrations, and release signals</p>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
      <ChatAssistant />
    </div>
  );
}
