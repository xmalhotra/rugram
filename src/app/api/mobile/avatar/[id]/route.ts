import { apiError } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { getAvatar } from '@/lib/avatar-store';

export const runtime = 'nodejs';

export const GET = observed(async (request: Request) => {
  const id = new URL(request.url).pathname.split('/').filter(Boolean).at(-1) ?? '';
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(id)) return apiError('Profile photo not found.', 404);
  const avatar = await getAvatar(id);
  if (!avatar) return apiError('Profile photo not found.', 404);
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      'Content-Type': avatar.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});
