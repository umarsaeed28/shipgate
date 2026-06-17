"use client";

import { useState } from "react";
import { basePath } from "../../lib/base-path";

interface ChatResult {
  answer: string;
  source: string;
  rows: unknown[];
}

export function ChatBox() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/agent3/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chatbox">
      <form onSubmit={ask} className="chat-row">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask: pass rate over time, flake rate, coverage growth, top failing tests…"
        />
        <button className="btn-save" type="submit" disabled={loading}>
          {loading ? "Querying…" : "Ask"}
        </button>
      </form>
      {result ? (
        <div className="chat-answer">
          <p>{result.answer}</p>
          <div className="chat-meta">
            grounded in <span className="mono">{result.source}</span> ·{" "}
            {result.rows.length} row(s)
          </div>
          {result.rows.length > 0 ? (
            <pre className="chat-rows">
              {JSON.stringify(result.rows, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
