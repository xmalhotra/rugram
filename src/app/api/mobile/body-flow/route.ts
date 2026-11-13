import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { tokenId } from '@/lib/session';
import { bodyFlowGet } from '@/lib/body-flow-store';
import { getSessionUser, isDemoMode } from '@/lib/store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

/** Body map built from logged sets and cardio in the chosen range. Private to the member. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`body-flow-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  const result = await bodyFlowGet(request.url, { user, allow: true, demo: isDemoMode() });
  if (result.status !== 200) {
    const message = typeof result.body.error === 'string' ? result.body.error : 'Check the request and try again.';
    return apiError(message, result.status);
  }
  return apiJson(result.body);
});
