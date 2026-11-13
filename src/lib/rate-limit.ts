import "server-only";
import { database } from './database';
import { isDemoMode } from './store';

type Bucket = { count: number; resetAt: number };

declare global {
  var rugramRateBuckets: Map<string, Bucket> | undefined;
}

const buckets = globalThis.rugramRateBuckets ?? new Map<string, Bucket>();
globalThis.rugramRateBuckets = buckets;

/** Local safeguard. Use a distributed rate limiter before multi-instance production traffic. */
export function allowRequest(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  if (buckets.size > 10000) for (const [name, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(name);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/** Atomic shared limiter across backend instances. Database unavailability fails closed. */
export async function allowSharedRequest(key: string, limit: number, windowMs: number) {
  if (isDemoMode()) return allowRequest(key, limit, windowMs);
  const sql = database();
  const rows = await sql`INSERT INTO request_buckets(key,count,reset_at) VALUES(${key},1,now()+${windowMs} * interval '1 millisecond') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN request_buckets.reset_at <= now() THEN 1 ELSE request_buckets.count+1 END,reset_at=CASE WHEN request_buckets.reset_at <= now() THEN now()+${windowMs} * interval '1 millisecond' ELSE request_buckets.reset_at END RETURNING count`;
  return Number(rows[0].count) <= limit;
}
