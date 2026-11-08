import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { removeAvatar, setAvatar } from '@/lib/avatar-store';
import { decodeAvatarData, validateAvatar } from '../../../../../shared/avatar';

export const runtime = 'nodejs';

async function actor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}

export const POST = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`avatar-write:${user.id}`, 30, 3600000)))
    return apiError('Please wait before changing your photo again.', 429);
  const body = await readMobileJson(request, 1_200_000);
  if (!body || typeof body !== 'object') return apiError('Use a JPEG or PNG photo.');
  const mime = (body as { mime?: unknown }).mime;
  const bytes = decodeAvatarData((body as { data?: unknown }).data);
  if (!bytes) return apiError('Use a JPEG or PNG photo.');
  const checked = validateAvatar(mime, bytes);
  if (!checked.ok) return apiError(checked.error);
  const avatarUrl = await setAvatar(user, checked.mime, bytes);
  return apiJson({ avatarUrl });
});

export const DELETE = observed(async (request: Request) => {
  const user = await actor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`avatar-write:${user.id}`, 30, 3600000)))
    return apiError('Please wait before changing your photo again.', 429);
  await removeAvatar(user);
  return apiJson({ avatarUrl: null });
});
