/**
 * Minimal Jenkins REST client for the pipeline status page (server-side, no CORS).
 */

import fs from "node:fs";
import { env } from "../env.js";

function explainFetchError(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") {
      return "Request timed out after 12s - Jenkins may be overloaded or unreachable.";
    }
    const anyE = e as Error & { cause?: unknown; code?: string };
    const cause = anyE.cause;
    let causeCode: string | undefined;
    let causeMsg = "";
    if (typeof cause === "object" && cause !== null) {
      if ("code" in cause && cause.code !== undefined) causeCode = String(cause.code);
      if ("message" in cause && cause.message !== undefined) causeMsg = String(cause.message);
    }
    const code = anyE.code ?? causeCode;

    if (code === "ECONNREFUSED" || causeMsg.includes("ECONNREFUSED")) {
      return (
        "Connection refused - nothing is accepting connections at this URL from the API process. " +
        "Start Jenkins (e.g. docker compose up -d jenkins), or set JENKINS_INTERNAL_URL if the API runs in Docker " +
        "and must use host.docker.internal instead of localhost."
      );
    }
    if (code === "ENOTFOUND" || causeMsg.includes("ENOTFOUND")) {
      return `Host not found: ${causeMsg || anyE.message}`;
    }
    if (code === "ETIMEDOUT" || causeMsg.includes("ETIMEDOUT")) {
      return "Connection timed out - check firewall, VPN, and Jenkins URL.";
    }
    if (anyE.message === "fetch failed") {
      if (causeMsg) return `Network error: ${causeMsg}`;
      if (cause !== undefined) return `Network error: ${String(cause)}`;
    }
    return anyE.message || String(e);
  }
  return String(e);
}

export interface JenkinsBuildEntry {
  number: number;
  url: string;
  building: boolean;
  result: string | null;
  duration: number;
  timestamp: number;
}

export interface JenkinsJobRemote {
  name: string;
  url: string;
  builds: JenkinsBuildEntry[];
}

function jobRestPath(jenkinsUrl: string, jobName: string): string {
  const base = jenkinsUrl.replace(/\/$/, "");
  const segments = jobName.split("/").filter(Boolean);
  const path = segments.map((s) => `job/${encodeURIComponent(s)}`).join("/");
  return `${base}/${path}`;
}

function runningInDocker(): boolean {
  if (process.env.SHIPGATE_IN_DOCKER === "1") return true;
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

/** Ordered list of base URLs to try (settings URL, IPv4/IPv6 variants, host.docker.internal in containers). */
export function resolveJenkinsFetchBases(settingsUrl: string): string[] {
  const internal = env.JENKINS_INTERNAL_URL?.trim();
  if (internal) return [internal.replace(/\/$/, "")];

  const primary = settingsUrl.replace(/\/$/, "");
  const out: string[] = [primary];
  const add = (u: string) => {
    if (!out.includes(u)) out.push(u);
  };

  try {
    const raw = primary.includes("://") ? primary : `http://${primary}`;
    const u = new URL(raw);
    const host = u.hostname;

    if (host === "localhost") {
      add(primary.replace(/localhost/gi, "127.0.0.1"));
    } else if (host === "127.0.0.1") {
      add(primary.replace("127.0.0.1", "localhost"));
    }

    if (runningInDocker() && (host === "localhost" || host === "127.0.0.1")) {
      const p = u.port || "8080";
      add(`http://host.docker.internal:${p}`);
    }
  } catch {
    /* ignore malformed URLs */
  }

  return out;
}

function isConnectFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("connection refused") ||
    m.includes("econnrefused") ||
    m.includes("nothing is accepting connections") ||
    m.includes("network unreachable") ||
    m.includes("ehostdown") ||
    (m.includes("network error:") && (m.includes("econnrefused") || m.includes("refused")))
  );
}

/**
 * Tries resolveJenkinsFetchBases in order; only advances to the next URL on connection-level failures
 * (so HTTP 401/404 from Jenkins does not trigger wasteful retries).
 */
export async function fetchJenkinsJobJsonWithFallbacks(
  settingsUrl: string,
  jobName: string,
): Promise<
  | { ok: true; job: JenkinsJobRemote; usedBase: string }
  | { ok: false; error: string; triedBases: string[] }
> {
  const bases = resolveJenkinsFetchBases(settingsUrl);
  const tried: string[] = [];
  let lastError = "";
  for (const base of bases) {
    tried.push(base);
    const r = await fetchJenkinsJobJson(base, jobName);
    if (r.ok) return { ok: true, job: r.job, usedBase: base };
    lastError = r.error;
    if (!isConnectFailure(lastError)) {
      return { ok: false, error: lastError, triedBases: tried };
    }
  }
  return {
    ok: false,
    error:
      lastError +
      (tried.length > 1 ? ` - tried: ${tried.join(" → ")}` : ""),
    triedBases: tried,
  };
}

export async function fetchJenkinsJobJson(
  jenkinsUrl: string,
  jobName: string,
): Promise<{ ok: true; job: JenkinsJobRemote } | { ok: false; error: string }> {
  const tree = encodeURIComponent(
    "name,url,builds[number,url,building,result,duration,timestamp]{0,25}",
  );
  const url = `${jobRestPath(jenkinsUrl, jobName)}/api/json?tree=${tree}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const user = process.env.JENKINS_USER;
  const token = process.env.JENKINS_TOKEN;
  if (user && token) {
    headers.Authorization =
      "Basic " + Buffer.from(`${user}:${token}`, "utf-8").toString("base64");
  }

  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 12_000);
    const res = await fetch(url, { headers, signal: ac.signal }).finally(() => clearTimeout(to));
    if (!res.ok) {
      return {
        ok: false,
        error: `Jenkins returned ${res.status}: ${res.statusText}. Check JENKINS_USER/JENKINS_TOKEN if security is enabled.`,
      };
    }
    const data = (await res.json()) as {
      name?: string;
      url?: string;
      builds?: JenkinsBuildEntry[];
    };
    return {
      ok: true,
      job: {
        name: data.name ?? jobName,
        url: data.url ?? jobRestPath(jenkinsUrl, jobName),
        builds: Array.isArray(data.builds) ? data.builds : [],
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: explainFetchError(e),
    };
  }
}
