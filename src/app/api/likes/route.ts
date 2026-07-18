import { z } from "zod";
import { apiError, apiJson, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { setLike } from "@/lib/store";
import { isTrustedMutation } from "@/lib/security";

export const runtime = "nodejs";
const schema = z.object({ creatorId: z.string().min(1).max(128), componentId: z.string().min(1).max(128), liked: z.boolean() });

export async function PUT(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid like request.");
  await setLike(user, parsed.data.creatorId, parsed.data.componentId, parsed.data.liked);
  return apiJson({ ok: true });
}
