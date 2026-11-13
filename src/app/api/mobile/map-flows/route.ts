import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { changeMapFlow, listMapFlows, MapFlowError } from '@/lib/map-flow-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

function onDate(request: Request) {
  const date = new URL(request.url).searchParams.get('date');
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
}

/** The member's Map flows, with the predicted figure for each. Private. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`map-flow-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  try {
    return apiJson(await listMapFlows(user, undefined, onDate(request)));
  } catch (error) {
    if (error instanceof MapFlowError) return apiError(error.message, error.status);
    throw error;
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`map-flow-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  try {
    return apiJson(await changeMapFlow(user, await readMobileJson(request), undefined, onDate(request)));
  } catch (error) {
    if (error instanceof MapFlowError) return apiError(error.message, error.status);
    throw error;
  }
});
