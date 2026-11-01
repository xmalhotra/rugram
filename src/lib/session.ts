import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { createSession, deleteSession, getSessionUser } from "./store";
import type { PublicUser } from "./types";

export const SESSION_COOKIE = "qram_session";
/** Read for existing sessions and cleared on logout; never written. */
export const LEGACY_SESSION_COOKIES = ["betterhabits_session", "rugram_session"] as const;
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

export function tokenId(token: string) {
  const secret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "rugram-local-demo-secret");
  if (!secret) throw new Error("AUTH_SECRET is required in production.");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function startSession(userId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await createSession(userId, tokenId(token), expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function currentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE)?.value ??
    LEGACY_SESSION_COOKIES.map(name => cookieStore.get(name)?.value).find(Boolean);
  if (!token) return null;
  return getSessionUser(tokenId(token));
}

export async function endSession() {
  const cookieStore = await cookies();
  for (const name of [SESSION_COOKIE, ...LEGACY_SESSION_COOKIES]) {
    const token = cookieStore.get(name)?.value;
    if (token) await deleteSession(tokenId(token));
    cookieStore.set(name, "", { httpOnly: true, secure: secureCookie(), sameSite: "lax", path: "/", maxAge: 0 });
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
