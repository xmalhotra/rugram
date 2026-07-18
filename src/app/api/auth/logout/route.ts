import { apiError, apiJson } from "@/lib/http";
import { endSession } from "@/lib/session";
import { isTrustedMutation } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedMutation(request)) return apiError("Invalid request origin.", 403);
  await endSession();
  return apiJson({ ok: true });
}
