import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { demoModeEnabled } from './runtime-config';
import { setMemberEmail } from './store';
import type { PublicUser } from './types';

type Challenge = {
  userId: string;
  email: string;
  hash: Buffer;
  expiresAt: number;
  attempts: number;
  used: boolean;
};
const challenges = new Map<string, Challenge>();
const digest = (id: string, code: string) => createHash('sha256').update(`${id}:${code}`).digest();

export function normalizeEmail(input: string) {
  const email = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 160 ? email : null;
}

async function deliver(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your Qram verification code',
      text: `Your Qram verification code is ${code}. It expires in 5 minutes.`,
    }),
  });
  if (!response.ok) throw new Error('Account email could not be sent. Try again.');
  return true;
}

export async function requestMemberEmail(user: PublicUser, email: string) {
  const clean = normalizeEmail(email);
  if (!clean) throw new Error('Account email is not valid.');
  const now = Date.now();
  for (const [id, item] of challenges) if (item.expiresAt <= now || item.used) challenges.delete(id);
  const challengeId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  challenges.set(challengeId, {
    userId: user.id,
    email: clean,
    hash: digest(challengeId, code),
    expiresAt: now + 5 * 60_000,
    attempts: 0,
    used: false,
  });
  const sent = await deliver(clean, code);
  const demo = demoModeEnabled(process.env);
  if (!sent && !demo) throw new Error('Account email delivery is not configured.');
  return { challengeId, email: clean, ...(sent || !demo ? {} : { mockCode: code }) };
}

export async function verifyMemberEmail(user: PublicUser, challengeId: string, code: string) {
  const item = challenges.get(challengeId);
  if (!item || item.userId !== user.id || item.used || item.expiresAt <= Date.now() || item.attempts >= 5)
    throw new Error('Account email code expired. Request a new code.');
  item.attempts += 1;
  const match =
    /^\d{6}$/.test(code) && timingSafeEqual(item.hash, digest(challengeId, code));
  if (!match)
    throw new Error(
      item.attempts >= 5
        ? 'Account email code expired. Request a new code.'
        : 'Account email code is incorrect.',
    );
  item.used = true;
  await setMemberEmail(user, item.email);
}
