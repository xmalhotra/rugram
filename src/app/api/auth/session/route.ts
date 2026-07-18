import { apiJson, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  return user ? apiJson({ user }) : unauthorized();
}
