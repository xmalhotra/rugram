import { apiError, apiJson } from "@/lib/http";
import { healthCheck } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  try { return apiJson({ status: "ok", ...(await healthCheck()) }); }
  catch { return apiError("Service dependency unavailable.", 503); }
}
