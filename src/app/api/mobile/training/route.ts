import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { recordTrainingActivity } from '@/lib/mobile/community';
import { tokenId } from '@/lib/session';
import { getSessionUser, isDemoMode } from '@/lib/store';
import { trainingGet, trainingPost } from '@/lib/training-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`training-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  const result = await trainingGet(request.url, { user, allow: true, demo: isDemoMode() });
  if (result.status !== 200) {
    const message = 'error' in result.body && typeof result.body.error === 'string' ? result.body.error : 'Check the request and try again.';
    return apiError(message, result.status);
  }
  return apiJson(result.body);
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`training-write:${user.id}`, 40, 60000))) return apiError('Please slow down and try again.', 429);
  let body: unknown;
  try {
    body = await readMobileJson(request, 65536);
  } catch {
    return apiError('Request is too large.', 413);
  }
  const result = await trainingPost(user, body, { demo: isDemoMode(), recordActivity: recordTrainingActivity });
  if (result.status !== 200) {
    const message = 'error' in result.body && typeof result.body.error === 'string' ? result.body.error : 'Check the request and try again.';
    return apiError(message, result.status);
  }
  return apiJson(result.body);
});
