import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import {
  ExerciseLogError,
  clearExerciseLogs,
  exerciseLogSchema,
  logExerciseSets,
  readExerciseSessions,
} from '@/lib/exercise-log-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

function failure(error: unknown) {
  if (error instanceof ExerciseLogError) return apiError(error.message, error.status);
  if (error instanceof z.ZodError) return apiError('Check the request and try again.');
  throw error;
}

export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`exercise-logs-read:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  const ids = (new URL(request.url).searchParams.get('ids') ?? '').split(',');
  try {
    return apiJson(await readExerciseSessions(user, ids));
  } catch (error) {
    return failure(error);
  }
});

export const DELETE = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`exercise-logs-write:${user.id}`, 40, 60000)))
    return apiError('Please slow down and try again.', 429);
  const id = new URL(request.url).searchParams.get('id') ?? '';
  try {
    await clearExerciseLogs(user, id);
    return apiJson({ cleared: id });
  } catch (error) {
    return failure(error);
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`exercise-logs-write:${user.id}`, 40, 60000)))
    return apiError('Please slow down and try again.', 429);
  const parsed = exerciseLogSchema.safeParse(await readMobileJson(request));
  if (!parsed.success) return apiError('Check the request and try again.');
  try {
    return apiJson({ session: await logExerciseSets(user, parsed.data) });
  } catch (error) {
    return failure(error);
  }
});
