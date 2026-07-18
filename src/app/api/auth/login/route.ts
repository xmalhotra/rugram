import { z } from "zod";
import { apiError, apiJson } from "@/lib/http";
import { allowRequest } from "@/lib/rate-limit";
import { startSession } from "@/lib/session";
import { isTrustedMutation } from "@/lib/security";
import { authenticate } from "@/lib/store";

export const runtime = "nodejs";

const schema = z.object({ handle: z.string().trim().min(2).max(64), password: z.string().min(5).max(256) });

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowRequest(`login:${ip}`)) return apiError("Too many attempts. Please wait a few minutes.", 429);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("Enter a valid account and password.");
  const user = await authenticate(parsed.data.handle, parsed.data.password);
  if (!user) return apiError("Invalid account or password.", 401);
  await startSession(user.id);
  return apiJson({ user });
}
