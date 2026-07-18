import { apiJson, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { getBootstrap } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return apiJson(await getBootstrap(user));
}
