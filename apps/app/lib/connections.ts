import { prisma, type ConnectionType } from "@qa/store";
import { encryptSecret, maskToken } from "@qa/crypto";
import { clientConfig } from "@qa/config/client";

/** The single client this instance serves. Created lazily if missing. */
export async function getClient() {
  const slug = clientConfig.slug;
  const existing = await prisma.client.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.client.create({
    data: { slug, name: slug.toUpperCase() },
  });
}

export interface ConnectionView {
  type: ConnectionType;
  status: string;
  hasToken: boolean;
  tokenHint: string | null;
  metadata: Record<string, unknown>;
}

export async function getConnections(): Promise<
  Record<ConnectionType, ConnectionView>
> {
  const client = await getClient();
  const rows = await prisma.connection.findMany({
    where: { clientId: client.id },
  });

  const view = (type: ConnectionType): ConnectionView => {
    const row = rows.find((r) => r.type === type);
    const meta = (row?.metadata ?? {}) as Record<string, unknown>;
    return {
      type,
      status: row?.status ?? "disconnected",
      hasToken: Boolean(row?.encryptedToken),
      tokenHint: typeof meta.tokenHint === "string" ? meta.tokenHint : null,
      metadata: meta,
    };
  };

  return {
    jira: view("jira"),
    bitbucket: view("bitbucket"),
    confluence: view("confluence"),
  };
}

/** Persist a connection. Tokens are encrypted at rest; never stored in plaintext. */
export async function upsertConnection(input: {
  type: ConnectionType;
  token?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const client = await getClient();
  const existing = await prisma.connection.findUnique({
    where: { clientId_type: { clientId: client.id, type: input.type } },
  });

  const metadata: Record<string, unknown> = {
    ...((existing?.metadata as Record<string, unknown>) ?? {}),
    ...(input.metadata ?? {}),
  };

  let encryptedToken = existing?.encryptedToken ?? null;
  if (input.token) {
    encryptedToken = encryptSecret(input.token);
    metadata.tokenHint = maskToken(input.token);
  }

  const status = encryptedToken ? "connected" : "disconnected";

  return prisma.connection.upsert({
    where: { clientId_type: { clientId: client.id, type: input.type } },
    update: { encryptedToken, metadata: metadata as never, status },
    create: {
      clientId: client.id,
      type: input.type,
      encryptedToken,
      metadata: metadata as never,
      status,
    },
  });
}

export async function setStagingUrl(url: string) {
  const client = await getClient();
  return prisma.client.update({
    where: { id: client.id },
    data: { stagingUrl: url || null },
  });
}
