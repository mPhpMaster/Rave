import Redis, { type Redis as RedisClient } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server } from "socket.io";

export function isRedisConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

// Returns a pub/sub pair if REDIS_URL is set, else null.
export function makeRedisAdapter(io: Server): RedisClient[] | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const pub = new Redis(url, { maxRetriesPerRequest: null });
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));
  console.log(`[redis] socket.io adapter attached → ${maskUrl(url)}`);
  return [pub, sub];
}

function maskUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    return u;
  }
}
