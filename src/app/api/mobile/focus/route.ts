import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { tokenId } from '@/lib/session';
import { FocusPlanError, changeFocusPlan, readFocusPlan } from '@/lib/focus-store';
import { getSessionUser, isDemoMode } from '@/lib/store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

/** This week's review and the suggestions for next week. Private to the member. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`focus-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  const week = new URL(request.url).searchParams.get('week') ?? '';
  try {
    return apiJson(await readFocusPlan(user, week, isDemoMode()));
  } catch (error) {
    if (error instanceof FocusPlanError) return apiError(error.message, error.status);
    throw error;
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`focus-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  try {
    return apiJson(await changeFocusPlan(user, await readMobileJson(request), isDemoMode()));
  } catch (error) {
    if (error instanceof FocusPlanError) return apiError(error.message, error.status);
    throw error;
  }
});
