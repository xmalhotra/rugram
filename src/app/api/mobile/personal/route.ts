import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import {
  PersonalMetricError,
  changePersonalMetric,
  personalMetricActionSchema,
  readPersonalMetrics,
} from '@/lib/personal-metric-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

/** The member's own personal metrics. Private. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`personal-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  return apiJson({ metrics: await readPersonalMetrics(user) });
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`personal-write:${user.id}`, 30, 60000)))
    return apiError('Please slow down and try again.', 429);
  const parsed = personalMetricActionSchema.safeParse(await readMobileJson(request));
  if (!parsed.success) return apiError('Check that number and try again.');
  try {
    return apiJson({ metrics: await changePersonalMetric(user, parsed.data) });
  } catch (error) {
    if (error instanceof PersonalMetricError) return apiError(error.message, error.status);
    throw error;
  }
});
