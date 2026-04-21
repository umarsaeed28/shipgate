"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useChatStore } from "@/lib/chat-store";

export function ChatAssistant() {
  const { open, setOpen } = useChatStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I can help analyze failures, suggest tests, or explain run results. What do you need?" },
  ]);
  const messagesRef = useRef(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const userMsg = { role: "user" as const, content: text };
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      const res = await api.chat({ messages: next });
      setMessages([...next, { role: "assistant" as const, content: res.message.content }]);
    },
  });

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-11 items-center gap-2 rounded-2xl px-5 text-[13px] font-semibold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-primary)" }}
      >
        {open ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
        )}
        {open ? "Close" : "AI Assistant"}
      </button>

      {/* Floating panel */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 flex h-[480px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-[--bg-card] shadow-xl animate-slide-up"
          style={{ borderColor: "var(--border-primary)", boxShadow: "var(--shadow-lg)" }}
        >
          {/* Header */}
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--border-secondary)" }}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px]" style={{ background: "var(--gradient-primary)" }}>
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[--text-primary]">QA Assistant</div>
                <div className="text-[11px] text-[--text-quaternary]">Context-aware AI help</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto text-white"
                    : "mr-auto bg-[--bg-surface] text-[--text-primary] border"
                }`}
                style={
                  m.role === "user"
                    ? { background: "var(--gradient-primary)" }
                    : { borderColor: "var(--border-secondary)" }
                }
              >
                {m.content}
              </div>
            ))}
            {send.isPending && (
              <div className="mr-auto flex gap-1.5 rounded-2xl border bg-[--bg-surface] px-4 py-3" style={{ borderColor: "var(--border-secondary)" }}>
                {[0, 1, 2].map((n) => (
                  <div key={n} className="h-1.5 w-1.5 rounded-full bg-[--color-primary] animate-bounce" style={{ animationDelay: `${n * 150}ms` }} />
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3" style={{ borderColor: "var(--border-secondary)" }}>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-xl border bg-[--bg-inset] px-4 py-2.5 text-[14px] text-[--text-primary] placeholder:text-[--text-quaternary] outline-none transition-colors focus:border-[--color-primary] focus:ring-2 focus:ring-[--color-primary]/20"
                style={{ borderColor: "var(--border-primary)" }}
                placeholder="Ask about tests, failures, runs…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !send.isPending && input.trim()) {
                    const t = input.trim();
                    setInput("");
                    send.mutate(t);
                  }
                }}
              />
              <button
                type="button"
                disabled={send.isPending || !input.trim()}
                onClick={() => { if (!input.trim()) return; const t = input.trim(); setInput(""); send.mutate(t); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all hover:brightness-110 disabled:opacity-30"
                style={{ background: "var(--gradient-primary)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
