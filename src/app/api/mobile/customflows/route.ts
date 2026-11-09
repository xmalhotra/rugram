import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { CustomflowError, changeCustomflow, customflowActionSchema, readCustomflows } from '@/lib/customflow-store';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

/** The member's own Customflows. Private. */
export const GET = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`customflows-read:${user.id}`, 60, 60000))) return apiError('Please slow down.', 429);
  return apiJson({ customflows: await readCustomflows(user) });
});

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`customflows-write:${user.id}`, 60, 60000)))
    return apiError('Please slow down and try again.', 429);
  const parsed = customflowActionSchema.safeParse(await readMobileJson(request));
  if (!parsed.success) return apiError('Check the change and try again.');
  try {
    return apiJson({ customflows: await changeCustomflow(user, parsed.data) });
  } catch (error) {
    if (error instanceof CustomflowError) return apiError(error.message, error.status);
    throw error;
  }
});
