import { z } from "zod";
import { apiError, apiJson, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { addTimelineEntry, removeTimelineEntry } from "@/lib/store";
import { isTrustedMutation } from "@/lib/security";

export const runtime = "nodejs";
const entrySchema = z.object({ componentId: z.string().min(1).max(128), scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^\d{2}:\d{2}$/), sourceCreatorId: z.string().min(1).max(128).nullable(), timeZone: z.string().min(1).max(64) });

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = entrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("Choose a valid date and time.");
  try { return apiJson({ entry: await addTimelineEntry(user, parsed.data) }, 201); }
  catch (error) { return apiError(error instanceof Error ? error.message : "Could not add this component."); }
}

export async function DELETE(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  const user = await currentUser();
  if (!user) return unauthorized();
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 128) return apiError("A valid timeline item is required.");
  await removeTimelineEntry(user, id);
  return apiJson({ ok: true });
}
