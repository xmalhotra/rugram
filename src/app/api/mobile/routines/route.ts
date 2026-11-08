import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { routineGet } from '@/lib/routine-store';
import { tokenId } from '@/lib/session';
import { getSessionUser, isDemoMode } from '@/lib/store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`routines-read:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  const result = await routineGet(request.url, { user, allow: true, demo: isDemoMode() });
  if (result.status !== 200) return apiError('error' in result.body ? result.body.error : 'Check the request and try again.', result.status);
  return apiJson(result.body);
});
