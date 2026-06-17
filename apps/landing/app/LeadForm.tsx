"use client";

import { useState } from "react";

export function LeadForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          company: form.get("company"),
          message: form.get("message"),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }
      setStatus("ok");
    } catch (err) {
      setStatus("err");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "ok") {
    return (
      <div className="lead-done">
        Thanks — we&apos;ll be in touch about a managed-QA instance for your team.
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <div className="lead-row">
        <input name="email" type="email" placeholder="Work email" required />
        <input name="company" placeholder="Company" />
      </div>
      <input name="message" placeholder="What would you like QA agents to cover?" />
      <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request access"}
      </button>
      {status === "err" ? <span className="lead-err">{error}</span> : null}
    </form>
  );
}
