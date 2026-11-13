import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { CommunityError } from '@/lib/mobile/community';
import {
  FlowRunError,
  beginRun,
  deleteMetrics,
  finishRun,
  flowHistoryQuerySchema,
  recentRunsQuerySchema,
  flowRunSchema,
  postRun,
  readFlowHistory,
  readFlowRuns,
  saveMetrics,
  saveRun,
} from '@/lib/flow-run-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

function failure(error: unknown) {
  if (error instanceof FlowRunError) return apiError(error.message, error.status);
  if (error instanceof CommunityError) return apiError(error.message, error.status);
  if (error instanceof z.ZodError) return apiError('Check the request and try again.');
  throw error;
}

export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`flow-runs-read:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    if ('recent' in params) {
      const parsed = recentRunsQuerySchema.safeParse(params);
      if (!parsed.success) return apiError('Check the request and try again.');
      return apiJson(await readFlowHistory(user, { recent: true }));
    }
    if ('history' in params || 'kind' in params) {
      const parsed = flowHistoryQuerySchema.safeParse(params);
      if (!parsed.success) return apiError('Check the request and try again.');
      return apiJson(await readFlowHistory(user, parsed.data));
    }
    return apiJson(await readFlowRuns(user));
  } catch (error) {
    return failure(error);
  }
});

export const DELETE = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`flow-runs-write:${user.id}`, 40, 60000)))
    return apiError('Please slow down and try again.', 429);
  if (new URL(request.url).searchParams.get('scope') !== 'metrics') return apiError('Unknown scope.');
  try {
    await deleteMetrics(user);
    return apiJson({ metrics: null });
  } catch (error) {
    return failure(error);
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`flow-runs-write:${user.id}`, 40, 60000)))
    return apiError('Please slow down and try again.', 429);
  const parsed = flowRunSchema.safeParse(await readMobileJson(request));
  if (!parsed.success) return apiError('Check the request and try again.');
  try {
    const body = parsed.data;
    if (body.action === 'metrics')
      return apiJson({ metrics: await saveMetrics(user, body) });
    if (body.action === 'start') return apiJson(await beginRun(user, body));
    if (body.action === 'save') return apiJson({ run: await saveRun(user, body.runId, body.state, undefined, Date.now(), body.effort) });
    if (body.action === 'finish') return apiJson({ run: await finishRun(user, body.runId, body.state, undefined, Date.now(), body.effort) });
    const posted = await postRun(user, body.runId, body.note ?? '');
    return apiJson(posted);
  } catch (error) {
    return failure(error);
  }
});
