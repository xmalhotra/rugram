import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { getItem } from '@/lib/mobile/catalog';
import { managedLibrary } from '@/lib/admin-content-store';
import { workoutCatalog } from '@/lib/exercise-store';
import { flows } from '../../../../../shared/mobile';
export const GET = observed(async (request: Request) => {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  const user = token ? await getSessionUser(tokenId(token)) : null;
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`mobile-item:${user.id}`, 120, 60000)))
    return apiError('Please slow down.', 429);
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const input = z
    .object({ kind: z.enum(['flow', 'pick', 'event']), id: z.string().min(1).max(128) })
    .strict()
    .safeParse(params);
  if (!input.success) return apiError('Choose a valid item.');
  const { kind, id } = input.data;
  if (kind === 'flow') {
    const workouts = await workoutCatalog();
    const library = await managedLibrary([...flows, ...workouts.workouts], workouts.exercises);
    const item = library.flows.find(flow => flow.id === id);
    return item ? apiJson({ kind, item }) : apiError('This item is no longer available.', 404);
  }
  const item = await getItem(id);
  if (
    !item ||
    item.status !== 'published' ||
    (kind === 'pick' ? !('category' in item) : !('city' in item))
  )
    return apiError('This item is no longer available.', 404);
  return apiJson({ kind, item });
});
