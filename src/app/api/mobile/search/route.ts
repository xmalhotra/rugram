import { apiError, apiJson, unauthorized } from '@/lib/http';
import { observed } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { database } from '@/lib/database';
import { isDemoMode } from '@/lib/store';
import { managedLibrary } from '@/lib/admin-content-store';
import { searchCatalogue } from '../../../../../shared/search';
import type { CityEvent, Product } from '../../../../../shared/mobile';
export const GET = observed(async (request: Request) => {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  const user = token ? await getSessionUser(tokenId(token)) : null;
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`mobile-search:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 80) return apiError('Search with 2–80 characters.');
  if (isDemoMode()) {
    // Explicit demo mode uses process state, still respecting publication.
    const catalog = globalThis.betterHabitsMobileState?.catalog ?? [];
    const settings = (await managedLibrary()).settings;
    const result = searchCatalogue(
      {
        flows: [],
        exercises: [],
        products: catalog.filter((item): item is Product => 'category' in item),
        events: catalog
          .filter((item): item is CityEvent => 'city' in item)
          .filter(
            item =>
              settings.eventCities.some(city => city.toLowerCase() === item.city.toLowerCase()) &&
              settings.eventTopics.includes(item.topic!) &&
              item.country === settings.eventCountry,
          ),
        demoMode: true,
      },
      query,
    );
    return apiJson({ products: result.picks, events: result.events });
  }
  const words = query.split(/\s+/).slice(0, 8);
  const patterns = words.map(word => `%${word.replace(/[\\%_]/g, '\\$&')}%`);
  const settings = (await managedLibrary()).settings;
  const rows = await database()`SELECT kind,data FROM (
    SELECT kind,data,row_number() OVER(PARTITION BY kind ORDER BY data->>'title',id) AS position
    FROM mobile_catalog WHERE data->>'status'='published'
    AND concat_ws(' ',data->>'title',data->>'summary',data->>'description',data->>'city',data->>'venue',data->>'category',data->>'subcategory',data->>'topic') ILIKE ALL(${patterns}::text[])
    AND (kind='product' OR (lower(data->>'city')=ANY(${settings.eventCities.map(city => city.toLowerCase())}::text[]) AND data->>'topic'=ANY(${settings.eventTopics}::text[]) AND data->>'country'=${settings.eventCountry}))
  ) matches WHERE position<=40 ORDER BY kind,position`;
  return apiJson({
    products: rows.filter(row => row.kind === 'product').map(row => row.data),
    events: rows.filter(row => row.kind === 'event').map(row => row.data),
  });
});
