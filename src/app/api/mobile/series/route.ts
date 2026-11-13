import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { FlowSeriesError, changeFlowSeries, readSeriesWindow } from '@/lib/flow-series-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

/** The member's routine series, and the occurrences in the requested dates. Private. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`series-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  const url = new URL(request.url);
  try {
    return apiJson(await readSeriesWindow(user, url.searchParams.get('from') ?? '', url.searchParams.get('to') ?? ''));
  } catch (error) {
    if (error instanceof FlowSeriesError) return apiError(error.message, error.status);
    throw error;
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`series-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  try {
    return apiJson(await changeFlowSeries(user, await readMobileJson(request)));
  } catch (error) {
    if (error instanceof FlowSeriesError) return apiError(error.message, error.status);
    throw error;
  }
});
