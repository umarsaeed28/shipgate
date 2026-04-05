import { Redis } from "ioredis";
import { env } from "./env.js";

/** BullMQ requires `maxRetriesPerRequest: null` on ioredis connections */
export function createRedis() {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
