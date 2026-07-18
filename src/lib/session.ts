import "server-only";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { createSession, deleteSession, getSessionUser } from "./store";
import type { PublicUser } from "./types";

export const SESSION_COOKIE = "rugram_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function secureCookie() {
  return process.env.NODE_ENV === "production";
}

function tokenId(token: string) {
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
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(tokenId(token));
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(tokenId(token));
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, secure: secureCookie(), sameSite: "lax", path: "/", maxAge: 0 });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
