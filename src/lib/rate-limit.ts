import "server-only";

type Bucket = { count: number; resetAt: number };

declare global {
  var rugramRateBuckets: Map<string, Bucket> | undefined;
}

const buckets = globalThis.rugramRateBuckets ?? new Map<string, Bucket>();
globalThis.rugramRateBuckets = buckets;

/** Local safeguard. Use a distributed rate limiter before multi-instance production traffic. */
export function allowRequest(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
