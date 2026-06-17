import type {
  AtlassianClient,
  AtlassianCredentials,
  ConfluencePage,
  JiraStory,
  JiraStorySummary,
} from "./types";

/** Flatten Atlassian Document Format (ADF) to plain text, best-effort. */
function adfToText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === "text" && typeof n.text === "string") return n.text;
  const children = Array.isArray(n.content)
    ? n.content.map(adfToText).join(n.type === "paragraph" ? "" : "\n")
    : "";
  return children;
}

function extractAcceptanceCriteria(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const out: string[] = [];
  for (const l of lines) {
    if (/^[-*•]\s+/.test(l)) out.push(l.replace(/^[-*•]\s+/, ""));
    else if (/^(given|when|then)\b/i.test(l)) out.push(l);
  }
  return out;
}

/**
 * Headless Atlassian access via API token (Basic auth). This is the
 * "stored token for headless agent calls" path. The in-app OAuth 2.1 flow
 * targets ATLASSIAN_MCP_URL and is wired in the connection UI.
 */
export class RestAtlassianClient implements AtlassianClient {
  readonly mode = "rest" as const;
  private base: string;
  private authHeader: string;

  constructor(creds: AtlassianCredentials) {
    this.base = creds.siteUrl.replace(/\/$/, "");
    this.authHeader =
      "Basic " +
      Buffer.from(`${creds.email}:${creds.token}`).toString("base64");
  }

  private async get(path: string): Promise<unknown> {
    const res = await fetch(`${this.base}${path}`, {
      headers: { Authorization: this.authHeader, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Atlassian ${path} -> ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  async getStory(key: string): Promise<JiraStory> {
    const data = (await this.get(
      `/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status`,
    )) as {
      fields?: {
        summary?: string;
        description?: unknown;
        status?: { name?: string };
      };
    };
    const description = adfToText(data.fields?.description);
    return {
      key,
      title: data.fields?.summary ?? key,
      description,
      acceptanceCriteria: extractAcceptanceCriteria(description),
      status: data.fields?.status?.name ?? "unknown",
      url: `${this.base}/browse/${key}`,
    };
  }

  async searchStories(jql: string): Promise<JiraStorySummary[]> {
    const data = (await this.get(
      `/rest/api/3/search?maxResults=25&fields=summary,status&jql=${encodeURIComponent(jql)}`,
    )) as {
      issues?: { key: string; fields?: { summary?: string; status?: { name?: string } } }[];
    };
    return (data.issues ?? []).map((i) => ({
      key: i.key,
      title: i.fields?.summary ?? i.key,
      status: i.fields?.status?.name ?? "unknown",
    }));
  }

  async getConfluencePage(id: string): Promise<ConfluencePage> {
    const data = (await this.get(
      `/wiki/api/v2/pages/${encodeURIComponent(id)}?body-format=storage`,
    )) as { id?: string; title?: string; body?: { storage?: { value?: string } } };
    const html = data.body?.storage?.value ?? "";
    return {
      id,
      title: data.title ?? id,
      body: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      url: `${this.base}/wiki/pages/${id}`,
    };
  }

  async searchConfluence(query: string): Promise<ConfluencePage[]> {
    const data = (await this.get(
      `/wiki/rest/api/content/search?limit=10&cql=${encodeURIComponent(`text ~ "${query}"`)}`,
    )) as { results?: { id: string; title?: string }[] };
    return (data.results ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? r.id,
      body: "",
      url: `${this.base}/wiki/pages/${r.id}`,
    }));
  }
}
