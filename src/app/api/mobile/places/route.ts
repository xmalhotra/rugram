import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { clientAddress } from '@/lib/client-address';
import { PlacesUnavailable, placeDetails, placesEnabled, searchPlaces, staticMap } from '@/lib/places';
export const runtime = 'nodejs';
const input = z.union([
  z.object({ q: z.string().trim().min(2).max(120), session: z.string().max(80).optional() }).strict(),
  z.object({ placeId: z.string().min(3).max(300), session: z.string().max(80).optional() }).strict(),
  z.object({ map: z.string().regex(/^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/), scheme: z.enum(['dark', 'light']).optional() }).strict(),
  z.object({ status: z.literal('1') }).strict(),
]);
// Search and details need a signed-in host; the map image is public for web event pages.
export const GET = observed(async (request: Request) => {
  const parsed = input.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return apiError('Type at least two letters of the venue.');
  const query = parsed.data;
  try {
    if ('status' in query) return apiJson({ enabled: placesEnabled() });
    if ('map' in query) {
      if (!(await allowSharedRequest(`places-map:${clientAddress(request.headers)}`, 120, 60000)))
        return apiError('Please slow down.', 429);
      const [lat, lng] = query.map.split(',').map(Number);
      return new Response(await staticMap(lat, lng, query.scheme ?? 'dark'), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }
    const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
    const user = token ? await getSessionUser(tokenId(token)) : null;
    if (!user) return unauthorized();
    if (!(await allowSharedRequest(`places:${user.id}`, 60, 60000)))
      return apiError('Please slow down.', 429);
    if ('q' in query) return apiJson({ places: await searchPlaces(query.q, query.session) });
    return apiJson({ place: await placeDetails(query.placeId, query.session) });
  } catch (error) {
    if (error instanceof PlacesUnavailable) return apiError(error.message, 503);
    throw error;
  }
});
