import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { tokenId } from '@/lib/session';
import { readGraduation } from '@/lib/graduation-store';
import { getSessionUser, isDemoMode } from '@/lib/store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

/** Whether this member has outgrown one flow. Private to the member. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`graduation-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  const flowId = new URL(request.url).searchParams.get('flowId')?.trim() ?? '';
  if (!flowId || flowId.length > 120) return apiError('Check the request and try again.');
  return apiJson(await readGraduation(user, flowId, isDemoMode()));
});
