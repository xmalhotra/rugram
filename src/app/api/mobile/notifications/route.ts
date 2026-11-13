import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { notificationInbox, readNotifications } from '@/lib/notification-store';
async function viewer(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}
export const GET = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`inbox:${user.id}`, 120, 60000)))
    return apiError('Please slow down.', 429);
  const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
  if (cursor.length > 128) return apiError('Invalid cursor.');
  return apiJson(await notificationInbox(user, cursor));
});
export const POST = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`inbox-read:${user.id}`, 120, 60000)))
    return apiError('Please slow down.', 429);
  const input = z
    .discriminatedUnion('action', [
      z.object({ action: z.literal('read'), id: z.string().min(1).max(128) }).strict(),
      z.object({ action: z.literal('read-all') }).strict(),
    ])
    .safeParse(await readMobileJson(request));
  if (!input.success) return apiError('Choose an inbox item.');
  await readNotifications(user, input.data.action === 'read' ? input.data.id : undefined);
  return apiJson(await notificationInbox(user));
});
