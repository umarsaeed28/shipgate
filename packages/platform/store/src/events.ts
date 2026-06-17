import { prisma } from "./client";

/**
 * Append a row to the history feed. This is the backbone for Agent 3 — every
 * run, failure, classification, and human decision must flow through here.
 * The feed is append-only; never update or delete Event rows.
 */
export async function recordEvent(input: {
  type: string;
  entityRef: string;
  payload?: unknown;
}) {
  return prisma.event.create({
    data: {
      type: input.type,
      entityRef: input.entityRef,
      payload: (input.payload ?? null) as never,
    },
  });
}
