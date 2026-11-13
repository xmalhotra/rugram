import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { categorySummaries, setCategorySubscription } from '@/lib/mobile/event-subscriptions';
export const runtime = 'nodejs';
async function viewer(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}
export const GET = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`event-categories-read:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  return apiJson({ categories: await categorySummaries(user) });
});
export const POST = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`event-categories-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  try {
    return apiJson({ category: await setCategorySubscription(user, await readMobileJson(request)) });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError('Choose a category.');
    if (error instanceof Error && error.message === 'Category not found.') return apiError(error.message, 404);
    throw error;
  }
});
