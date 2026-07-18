import { z } from "zod";
import { apiError, apiJson, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { setFollow } from "@/lib/store";
import { isTrustedMutation } from "@/lib/security";

export const runtime = "nodejs";
const schema = z.object({ creatorId: z.string().min(1).max(128), follows: z.boolean() });

export async function PUT(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid follow request.");
  try { await setFollow(user, parsed.data.creatorId, parsed.data.follows); return apiJson({ ok: true }); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Could not update follow.", 403); }
}
