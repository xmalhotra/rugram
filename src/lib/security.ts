import "server-only";

/** Reject cross-site browser mutations. SameSite cookies are a second layer, not the only one. */
export function isTrustedMutation(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const expected = new URL(process.env.APP_URL ?? request.url).origin;
  return origin === expected;
}
