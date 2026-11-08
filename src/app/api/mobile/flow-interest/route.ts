import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import {
  FlowInterestError,
  adminInterest,
  flowInterestSchema,
  notifyRequesters,
  unwantFlow,
  wantFlow,
  wantedIds,
} from '@/lib/flow-interest-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`flow-interest-read:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  const scope = new URL(request.url).searchParams.get('scope');
  try {
    if (scope === 'admin') return apiJson(await adminInterest(user));
    if (scope) return apiError('Unknown scope.');
    return apiJson({ catalogFlowIds: await wantedIds(user) });
  } catch (error) {
    if (error instanceof FlowInterestError) return apiError(error.message, error.status);
    throw error;
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`flow-interest-write:${user.id}`, 40, 60000)))
    return apiError('Please slow down and try again.', 429);
  const parsed = flowInterestSchema.safeParse(await readMobileJson(request));
  if (!parsed.success) return apiError('Check the request and try again.');
  try {
    const body = parsed.data;
    if (body.action === 'want') return apiJson({ catalogFlowIds: await wantFlow(user, body.catalogFlowId) });
    if (body.action === 'unwant')
      return apiJson({ catalogFlowIds: await unwantFlow(user, body.catalogFlowId) });
    return apiJson({ notified: await notifyRequesters(user, body.catalogFlowId) });
  } catch (error) {
    if (error instanceof z.ZodError) return apiError('Check the request and try again.');
    if (error instanceof FlowInterestError) return apiError(error.message, error.status);
    throw error;
  }
});
