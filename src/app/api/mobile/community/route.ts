import { z } from 'zod';
import { apiJson, apiError, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import {
  CommunityError,
  communityAction,
  communityActionSchema,
  communityFeed,
  communityFlow,
  communityStatus,
} from '@/lib/mobile/community';
async function viewer(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}
function failure(error: unknown) {
  if (error instanceof CommunityError) return apiError(error.message, error.status);
  if (error instanceof z.ZodError) return apiError(error.issues[0]?.message ?? 'Check your entry.');
  throw error;
}
export const GET = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`community-read:${user.id}`, 120, 60000)))
    return apiError('Please slow down.', 429);
  const input = z
    .union([
      z.object({ tab: z.enum(['for-you', 'following']) }).strict(),
      z.object({ id: z.string().regex(/^community-[a-zA-Z0-9-]{8,80}$/) }).strict(),
      z.object({ status: z.literal('mine') }).strict(),
    ])
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!input.success) return apiError('Choose For you, Following or a flow.');
  try {
    if ('id' in input.data) return apiJson(await communityFlow(user, input.data.id));
    if ('status' in input.data) return apiJson(await communityStatus(user));
    return apiJson(await communityFeed(user, input.data.tab));
  } catch (error) {
    return failure(error);
  }
});
export const POST = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`community-write:${user.id}`, 60, 60000)))
    return apiError('Please slow down and try again.', 429);
  const input = communityActionSchema.safeParse(await readMobileJson(request));
  if (!input.success) return apiError(input.error.issues[0]?.message ?? 'Check your entry.');
  try {
    return apiJson(await communityAction(user, input.data));
  } catch (error) {
    return failure(error);
  }
});
