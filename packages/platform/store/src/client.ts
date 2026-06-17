import { PrismaClient } from "./generated/client/index.js";

// One DB per client; a single shared PrismaClient per process is enough.
// Cache on globalThis to survive Next.js dev hot-reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
