"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useChatStore } from "@/lib/chat-store";

export function ChatAssistant() {
  const { open, setOpen } = useChatStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Ask about failures, runs, or scenarios. Context-aware help is available in this workspace." },
  ]);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const userMsg = { role: "user" as const, content: text };
      const next = [...messagesRef.current, userMsg];
      setMessages(next);
      const res = await api.chat({ messages: next });
      const withAssistant = [...next, { role: "assistant" as const, content: res.message.content }];
      setMessages(withAssistant);
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 shadow-lg ring-1 ring-zinc-300 hover:bg-white"
      >
        {open ? "Close assistant" : "QA Assistant"}
      </button>
      {open ? (
        <div className="fixed bottom-20 right-6 z-40 flex h-[420px] w-[380px] flex-col rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
          <div className="border-b border-zinc-800 px-4 py-3">
            <div className="text-sm font-semibold text-zinc-100">Assistant</div>
            <div className="text-xs text-zinc-500">Optional · context-aware QA help</div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-md px-3 py-2 ${
                  m.role === "user" ? "ml-6 bg-zinc-800 text-zinc-100" : "mr-6 bg-zinc-900 text-zinc-300"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800 p-3">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
                placeholder="e.g. Summarize the last failed run…"
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
                onClick={() => {
                  if (!input.trim()) return;
                  const t = input.trim();
                  setInput("");
                  send.mutate(t);
                }}
                className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
