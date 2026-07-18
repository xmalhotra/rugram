import { z } from "zod";
import { apiError, apiJson, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { setPublication } from "@/lib/store";
import { isTrustedMutation } from "@/lib/security";

export const runtime = "nodejs";
const schema = z.object({ componentId: z.string().min(1).max(128), weekday: z.string().min(1).max(32), startTime: z.string().regex(/^\d{2}:\d{2}$/), published: z.boolean() });

export async function PUT(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Invalid publication request.");
  try { await setPublication(user, { creatorId: user.id, componentId: parsed.data.componentId, weekday: parsed.data.weekday, startTime: parsed.data.startTime }, parsed.data.published); return apiJson({ ok: true }); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Could not update publication.", 403); }
}
