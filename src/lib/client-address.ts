/**
 * Each trusted proxy appends the address it received the request from, so the client is the entry
 * `hops` places from the right. Entries further left are client-supplied and must not be trusted.
 * TRUSTED_PROXY_HOPS=0 ignores X-Forwarded-For entirely (direct exposure).
 */
export function clientAddress(
  headers: Headers,
  hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1),
): string {
  if (!Number.isInteger(hops) || hops < 1) return 'direct';
  const entries = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  const candidate = entries[entries.length - hops];
  return candidate && /^[0-9a-fA-F:.]{2,45}$/.test(candidate) ? candidate : 'unknown';
}
