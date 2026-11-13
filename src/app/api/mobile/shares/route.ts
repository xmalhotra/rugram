import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { FollowError } from '@/lib/follow-store';
import { MapFlowError } from '@/lib/map-flow-store';
import { followedAuthors } from '@/lib/mobile/community';
import { ShareError, changeShare, shareFeed, sharePost, shareYours } from '@/lib/share-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

function fail(error: unknown) {
  if (error instanceof ShareError || error instanceof FollowError || error instanceof MapFlowError) return apiError(error.message, error.status);
  return null;
}

/** Posts that carry a flow the member has done, and the remarks under them. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`share-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  const params = new URL(request.url).searchParams;
  try {
    if (params.get('view') === 'yours') return apiJson(await shareYours(user));
    const id = params.get('id');
    if (id) return apiJson(await sharePost(user, id));
    return apiJson(await shareFeed(user, undefined, await followedAuthors(user)));
  } catch (error) {
    const response = fail(error);
    if (response) return response;
    throw error;
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`share-write:${user.id}`, 30, 60000))) return apiError('Please slow down and try again.', 429);
  try {
    return apiJson(await changeShare(user, await readMobileJson(request)));
  } catch (error) {
    const response = fail(error);
    if (response) return response;
    throw error;
  }
});
