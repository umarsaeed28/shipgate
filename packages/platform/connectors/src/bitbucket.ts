/**
 * Bitbucket Cloud REST connector — READ-ONLY. The client's product code is
 * never modified (see qa-platform.mdc). Provides the data Agent 1 needs to
 * derive code-deviation scenarios.
 */

export interface BitbucketCredentials {
  workspace: string;
  repo: string;
  /** Bitbucket access token (Bearer). Encrypted at rest; decrypted in memory. */
  token: string;
}

export interface PullRequest {
  id: number;
  title: string;
  description: string;
  sourceCommit: string;
  destinationBranch: string;
  state: string;
  url: string;
}

export interface BitbucketClient {
  readonly mode: "rest" | "mock";
  getPullRequest(id: number): Promise<PullRequest>;
  getDiff(id: number): Promise<string>;
  getChangedFiles(id: number): Promise<string[]>;
}

const API = "https://api.bitbucket.org/2.0";

export class RestBitbucketClient implements BitbucketClient {
  readonly mode = "rest" as const;
  private repoPath: string;
  private auth: string;

  constructor(creds: BitbucketCredentials) {
    this.repoPath = `${creds.workspace}/${creds.repo}`;
    this.auth = `Bearer ${creds.token}`;
  }

  private async req(path: string, accept = "application/json"): Promise<Response> {
    const res = await fetch(`${API}/repositories/${this.repoPath}${path}`, {
      headers: { Authorization: this.auth, Accept: accept },
    });
    if (!res.ok) {
      throw new Error(`Bitbucket ${path} -> ${res.status} ${res.statusText}`);
    }
    return res;
  }

  async getPullRequest(id: number): Promise<PullRequest> {
    const data = (await (await this.req(`/pullrequests/${id}`)).json()) as {
      id: number;
      title?: string;
      description?: string;
      state?: string;
      source?: { commit?: { hash?: string } };
      destination?: { branch?: { name?: string } };
      links?: { html?: { href?: string } };
    };
    return {
      id: data.id,
      title: data.title ?? `PR #${id}`,
      description: data.description ?? "",
      sourceCommit: data.source?.commit?.hash ?? "",
      destinationBranch: data.destination?.branch?.name ?? "",
      state: data.state ?? "OPEN",
      url: data.links?.html?.href ?? "",
    };
  }

  async getDiff(id: number): Promise<string> {
    return (await this.req(`/pullrequests/${id}/diff`, "text/plain")).text();
  }

  async getChangedFiles(id: number): Promise<string[]> {
    const data = (await (
      await this.req(`/pullrequests/${id}/diffstat?pagelen=100`)
    ).json()) as {
      values?: { new?: { path?: string }; old?: { path?: string } }[];
    };
    return (data.values ?? [])
      .map((v) => v.new?.path ?? v.old?.path)
      .filter((p): p is string => Boolean(p));
  }
}

export class MockBitbucketClient implements BitbucketClient {
  readonly mode = "mock" as const;

  async getPullRequest(id: number): Promise<PullRequest> {
    return {
      id,
      title: "Cheapest-first sorting + seat decrement on booking",
      description: "Sort search results by price ascending and decrement seats atomically.",
      sourceCommit: "a1b2c3d4e5f6",
      destinationBranch: "main",
      state: "OPEN",
      url: `https://bitbucket.org/acme/web-app/pull-requests/${id}`,
    };
  }

  async getDiff(_id: number): Promise<string> {
    return [
      "diff --git a/src/search.js b/src/search.js",
      "@@ -10,6 +10,8 @@",
      "-  return results;",
      "+  return results.sort((a, b) => a.price - b.price);",
      "diff --git a/src/booking.js b/src/booking.js",
      "@@ -22,3 +22,6 @@",
      "+  flight.seats -= 1;",
    ].join("\n");
  }

  async getChangedFiles(_id: number): Promise<string[]> {
    return ["src/search.js", "src/booking.js"];
  }
}

export function createBitbucketClient(
  creds?: BitbucketCredentials | null,
): BitbucketClient {
  if (creds?.workspace && creds.repo && creds.token) {
    return new RestBitbucketClient(creds);
  }
  return new MockBitbucketClient();
}
