import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { StrengthError, changeStrength, readStrength, strengthActionSchema } from '@/lib/strength-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

function failure(error: unknown) {
  if (error instanceof StrengthError) return apiError(error.message, error.status);
  if (error instanceof z.ZodError) return apiError('Check the weight and reps and try again.');
  throw error;
}

/** The member's own anchors and estimated strength. Private. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`strength-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  try {
    return apiJson(await readStrength(user));
  } catch (error) {
    return failure(error);
  }
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`strength-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  const body = await readMobileJson(request);
  const parsed = strengthActionSchema.safeParse(body);
  if (!parsed.success)
    return apiError(
      (body as { action?: unknown } | null)?.action === 'body'
        ? 'Enter a body weight from 20 to 300 kg and how active you are.'
        : 'Enter a weight up to 500 kg and 1 to 12 reps.',
    );
  try {
    return apiJson(await changeStrength(user, parsed.data));
  } catch (error) {
    return failure(error);
  }
});
