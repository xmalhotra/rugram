import 'server-only';
import { demoCatalogNotifications } from '../notification-store';
import { getCreatorAccount, isDemoMode } from '.././store';
import { type PublicUser } from '.././types';
import { isHyderabadTech } from '../../../shared/hyderabad-tech';
import { managedLibrary } from '.././admin-content-store';
import { getProfile } from './profile';
import { trackMobile } from './analytics';
import { type CatalogItem, state, sqlClient } from './state';

export async function getItem(id: string): Promise<CatalogItem | undefined> {
  if (isDemoMode()) return state.catalog.find(item => item.id === id);
  const rows = await sqlClient()`SELECT data FROM mobile_catalog WHERE id=${id}`;
  return rows[0]?.data as CatalogItem | undefined;
}

export async function adminCatalogSnapshot(user: PublicUser): Promise<CatalogItem[]> {
  if (user.role !== 'admin') throw new Error('Admin access required.');
  return isDemoMode()
    ? structuredClone(state.catalog)
    : (await sqlClient()`SELECT data FROM mobile_catalog ORDER BY id LIMIT 5000`).map(
        row => row.data as CatalogItem,
      );
}

export function projectDemoContent(
  kind: string,
  id: string,
  data: Record<string, unknown> | null,
  status: string,
) {
  if (!isDemoMode() || !['product', 'event'].includes(kind) || !data) return;
  const item = {
    ...data,
    id,
    status: status === 'archived' ? 'archived' : 'published',
  } as CatalogItem;
  const index = state.catalog.findIndex(value => value.id === id);
  const previous = index >= 0 ? state.catalog[index] : undefined;
  if (index < 0) state.catalog.push(item);
  else state.catalog[index] = item;
  demoCatalogNotifications(previous, item);
}

export async function submitItem(user: PublicUser, item: CatalogItem, requestId: string) {
  // Any member can host an event; product listings stay with creators and admins.
  if (!('city' in item) && user.role !== 'creator' && user.role !== 'admin')
    throw new Error('Only creators and admins can submit listings.');
  if (
    'city' in item &&
    (item.registrationUrl || item.registrationMode === 'approval') &&
    !isHyderabadTech(item, (await managedLibrary()).settings)
  )
    throw new Error('Event not available in the enabled city and topic scope.');
  if ('category' in item) {
    const settings = (await managedLibrary()).settings;
    if (
      !settings.productCategories.some(category => category.id === item.category) ||
      !settings.tiers.includes(item.tier)
    )
      throw new Error('Product not available in an enabled category or tier.');
    if (
      item.category === 'Tech' &&
      !settings.productCategories
        .find(category => category.id === 'Tech')
        ?.subcategories.includes(item.subcategory ?? '')
    )
      throw new Error('Product not available in an enabled Tech type.');
  }
  const creatorEvent = 'city' in item && user.role !== 'admin';
  const requestKey = `${user.id}:${creatorEvent ? 'event:' : ''}${requestId}`;
  if (isDemoMode() && state.requests[requestKey]) return;
  const created = {
    ...item,
    id: crypto.randomUUID(),
    createdBy: user.id,
    status: user.role === 'admin' ? 'published' : 'pending',
    ...('city' in item ? { listedAt: new Date().toISOString() } : {}),
    ...(creatorEvent ? { editorialPriority: undefined, reviewRequired: true } : {}),
    ...('category' in item && user.role === 'creator'
      ? {
          assessment: item.assessment ? { ...item.assessment, shortlist: undefined } : undefined,
          recommendations: (item.recommendations ?? []).map(reference => ({
            ...reference,
            verified: false,
          })),
        }
      : {}),
  } as CatalogItem;
  // Creators host as many events as they like; each one waits for admin review.
  if (isDemoMode()) {
    state.catalog.push(created);
    demoCatalogNotifications(undefined, created);
    state.requests[requestKey] = created.id;
  } else {
    const sql = sqlClient();
    const result =
      await sql`INSERT INTO mobile_catalog(id,kind,data,request_key) VALUES(${created.id},${'city' in created ? 'event' : 'product'},${JSON.stringify(created)}::jsonb,${requestKey}) ON CONFLICT (request_key) WHERE request_key IS NOT NULL DO NOTHING RETURNING id`;
    if (!result.length) return;
  }
  await trackMobile(user, 'city' in created ? 'event_submitted' : 'product_submitted', {
    kind: 'city' in created ? 'event' : 'product',
    id: created.id,
  });
}

export async function setCreatorEventLimit(admin: PublicUser, handle: string, limit: number) {
  if (admin.role !== 'admin') throw new Error('Admin access required.');
  if (!Number.isInteger(limit) || limit < 0 || limit > 100)
    throw new Error('Creator event limit must be an integer between 0 and 100.');
  const creator = await getCreatorAccount(handle);
  if (!creator) throw new Error('Creator not found.');
  await getProfile(creator);
  if (isDemoMode()) state.profiles[creator.id].creatorMonthlyEventLimit = limit;
  else
    await sqlClient()`UPDATE mobile_profiles SET data=jsonb_set(data,'{creatorMonthlyEventLimit}',${JSON.stringify(limit)}::jsonb),updated_at=now() WHERE user_id=${creator.id}`;
  await trackMobile(admin, 'creator_event_limit_updated');
}
