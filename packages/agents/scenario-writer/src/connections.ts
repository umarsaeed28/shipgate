import { prisma } from "@qa/store";
import { decryptSecret } from "@qa/crypto";
import type { AtlassianCredentials } from "@qa/mcp";
import type { BitbucketCredentials } from "@qa/connectors";

/** One client per instance — connections are unambiguous. */
async function conn(type: "jira" | "bitbucket" | "confluence") {
  return prisma.connection.findFirst({ where: { type } });
}

export async function atlassianCreds(): Promise<AtlassianCredentials | null> {
  const c = (await conn("jira")) ?? (await conn("confluence"));
  if (!c?.encryptedToken) return null;
  const meta = (c.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.siteUrl !== "string" || typeof meta.email !== "string") {
    return null;
  }
  return {
    siteUrl: meta.siteUrl,
    email: meta.email,
    token: decryptSecret(c.encryptedToken),
  };
}

export async function bitbucketCreds(): Promise<BitbucketCredentials | null> {
  const c = await conn("bitbucket");
  if (!c?.encryptedToken) return null;
  const meta = (c.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.workspace !== "string" || typeof meta.repo !== "string") {
    return null;
  }
  return {
    workspace: meta.workspace,
    repo: meta.repo,
    token: decryptSecret(c.encryptedToken),
  };
}
