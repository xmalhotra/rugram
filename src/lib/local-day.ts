// The calendar day a workout belongs to is the member's local day, not the UTC day. The member's zone comes from
// the country code of the mobile number they sign in with (shared/phone-time.ts): +91 is India, UTC+5:30, which is
// also what a member with no number gets. Without this, a session finished before 05:30 in India would land on
// the previous day's routine and Body flow.
import { defaultOffsetMinutes, offsetForPhone } from '../../shared/phone-time';

/** The offset for a member whose number isn't known. Set QRAM_TZ_OFFSET_MINUTES to change it. */
export function appOffsetMinutes(env: Record<string, string | undefined> = process.env) {
  const raw = env.QRAM_TZ_OFFSET_MINUTES;
  const value = raw == null || raw === '' ? NaN : Number(raw);
  return Number.isFinite(value) && Math.abs(value) <= 14 * 60 ? value : defaultOffsetMinutes;
}

/** YYYY-MM-DD at `offsetMinutes` ahead of UTC for an instant (a Date, an ISO string or epoch milliseconds). */
export function localDay(value: Date | string | number, offsetMinutes = appOffsetMinutes()) {
  const at = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(at)) return String(value).slice(0, 10);
  return new Date(at + offsetMinutes * 60000).toISOString().slice(0, 10);
}

const cache = new Map<string, { offset: number; at: number }>();
const keepMs = 10 * 60 * 1000;

/** Minutes ahead of UTC for this member, from their sign-in number. Looked up once and kept for ten minutes. */
export async function memberOffsetMinutes(userId: string, demo: boolean, now = Date.now()): Promise<number> {
  const kept = cache.get(userId);
  if (kept && now - kept.at < keepMs) return kept.offset;
  let phone: string | null = null;
  try {
    if (demo) {
      const users = (globalThis as { rugramDemoStore?: { users?: { id: string; phone?: string }[] } }).rugramDemoStore?.users;
      phone = users?.find(user => user.id === userId)?.phone ?? null;
    } else {
      const { database } = await import('./database');
      const rows = await database()`SELECT phone_e164 FROM users WHERE id=${userId}`;
      phone = rows[0]?.phone_e164 ? String(rows[0].phone_e164) : null;
    }
  } catch {
    phone = null;
  }
  const offset = phone ? offsetForPhone(phone) : appOffsetMinutes();
  cache.set(userId, { offset, at: now });
  return offset;
}

/** For tests, and after a member changes their number. */
export function forgetMemberOffset(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}
