import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { FlowSeriesError } from '@/lib/flow-series-store';
import { MapFlowError } from '@/lib/map-flow-store';
import { FollowError, changeFlowFollow, readFlowFollows } from '@/lib/follow-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

function onDate(request: Request) {
  const date = new URL(request.url).searchParams.get('date');
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
}

function fail(error: unknown) {
  if (error instanceof FollowError || error instanceof FlowSeriesError || error instanceof MapFlowError) return apiError(error.message, error.status);
  return null;
}

/** Trials of someone else's flow. Private. The weekly review lines are the ones that came back this week. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`follow-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  try {
    return apiJson(await readFlowFollows(user, onDate(request)));
  } catch (error) {
    const response = fail(error);
    if (response) return response;
    throw error;
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`follow-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  try {
    return apiJson(await changeFlowFollow(user, await readMobileJson(request)));
  } catch (error) {
    const response = fail(error);
    if (response) return response;
    throw error;
  }
});
