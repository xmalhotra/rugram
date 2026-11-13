import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { managedLibrary } from '@/lib/admin-content-store';
export const runtime = 'nodejs';
/** The card-research directory is large, so it loads on demand instead of with bootstrap. */
export const GET = observed(async (request: Request) => {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  const user = token ? await getSessionUser(tokenId(token)) : null;
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`mobile-card-research:${user.id}`, 30, 60000)))
    return apiError('Please slow down.', 429);
  return apiJson({ cardResearch: (await managedLibrary()).cardResearch });
});
