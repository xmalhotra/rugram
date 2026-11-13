import 'server-only';
import { demoCatalogNotifications } from '../notification-store';
import { type CityEvent, type Product } from '../../../shared/mobile';
import { isDemoMode } from '.././store';
import { type PublicUser } from '.././types';
import { isHyderabadTech } from '../../../shared/hyderabad-tech';
import { eventLinkSchema } from '.././event-validation';
import { managedLibrary } from '.././admin-content-store';
import { hostedEventEditError } from '../../../shared/event-registration';
import { getItem } from './catalog';
import { trackMobile } from './analytics';
import { state, sqlClient } from './state';
import { reviewReason, type ReviewCode } from '../../../shared/moderation';

export async function reviewItem(
  user: PublicUser,
  id: string,
  status: 'published' | 'archived',
  note?: string,
  code?: ReviewCode,
) {
  if (user.role !== 'admin') throw new Error('Admin access required.');
  const previous = await getItem(id);
  if (!previous) throw new Error('Listing not found.');
  if (previous.withdrawnAt) throw new Error('Content withdrawn submissions cannot be reviewed.');
  if (previous.status === status) return;
  const decision = {
    ...(status === 'archived' ? reviewReason(note, code) : {}),
    reviewedAt: new Date().toISOString(),
    reviewedBy: user.id,
  };
  if (status === 'published' && previous && 'city' in previous && previous.reviewRequired)
    throw new Error(
      'Event not available for publication: verify sources and save the curated event editor first.',
    );
  if (isDemoMode()) {
    const item = state.catalog.find(item => item.id === id);
    if (!item) throw new Error('Listing not found.');
    if (item.status === status) return;
    const before = structuredClone(item);
    item.status = status;
    Object.assign(item, decision);
    demoCatalogNotifications(before, item);
  } else {
    const sql = sqlClient();
    const result =
      await sql`WITH changed AS (UPDATE mobile_catalog SET data=jsonb_set(data,'{status}',${JSON.stringify(status)}::jsonb)||${JSON.stringify(decision)}::jsonb WHERE id=${id} AND data=${JSON.stringify(previous)}::jsonb AND NOT(data?'withdrawnAt') RETURNING id),
      logged AS (INSERT INTO mobile_content_audit(id,kind,item_id,action,actor_id,version,data) SELECT ${crypto.randomUUID()},${'city' in previous ? 'event' : 'product'},id,${status},${user.id},0,${JSON.stringify(decision)}::jsonb FROM changed) SELECT id FROM changed`;
    if (!result.length) {
      throw new Error('Content submission changed. Refresh before reviewing.');
    }
  }
  await trackMobile(user, `listing_${status}`, {
    kind: previous && 'city' in previous ? 'event' : 'product',
    id,
  });
}

export async function updateCuratedEvent(user: PublicUser, id: string, raw: unknown) {
  if (user.role !== 'admin') throw new Error('Admin access required to curate events.');
  const input = eventLinkSchema.parse(raw);
  const previous = await getItem(id);
  if (
    !previous ||
    !('city' in previous) ||
    !isHyderabadTech(previous, (await managedLibrary()).settings)
  )
    throw new Error('Event not available in the Hyderabad tech editor.');
  const item: CityEvent = {
    ...input,
    id,
    capacity: 0,
    price: 0,
    createdBy: previous.createdBy,
    status: previous.status,
    listedAt: previous.listedAt,
    simulation: previous.simulation,
  };
  if (isDemoMode()) {
    assertDemoHostedEventEdit(previous, item);
    const index = state.catalog.findIndex(value => value.id === id);
    state.catalog[index] = item;
    demoCatalogNotifications(previous, item);
  } else {
    const sql = sqlClient();
    await sql`UPDATE mobile_catalog SET data=${JSON.stringify(item)}::jsonb WHERE id=${id} AND kind='event'`;
  }
  await trackMobile(user, 'event_updated', { kind: 'event', id });
}

export async function setHostedEventStatus(
  user: PublicUser,
  id: string,
  status: 'Closed' | 'Cancelled' | 'Registration link available',
) {
  if (!['admin', 'creator'].includes(user.role)) return false;
  if (isDemoMode()) {
    const item = state.catalog.find(
      (value): value is CityEvent => 'city' in value && value.id === id,
    );
    if (
      !item ||
      item.registrationMode !== 'approval' ||
      item.status !== 'published' ||
      item.registrationStatus === 'Cancelled' ||
      Date.parse(item.startsAt) <= Date.now() ||
      (user.role !== 'admin' && item.createdBy !== user.id)
    )
      return false;
    if (
      status === 'Registration link available' &&
      item.registrationClosesAt &&
      Date.parse(item.registrationClosesAt) <= Date.now()
    )
      return false;
    const before = structuredClone(item);
    item.registrationStatus = status;
    demoCatalogNotifications(before, item);
    return true;
  }
  const sql = sqlClient();
  return (
    (
      await sql`UPDATE mobile_catalog SET data=jsonb_set(data,'{registrationStatus}',${JSON.stringify(status)}::jsonb) WHERE id=${id} AND kind='event' AND data->>'registrationMode'='approval' AND data->>'status'='published' AND COALESCE(data->>'registrationStatus','')<>'Cancelled' AND (data->>'startsAt')::timestamptz>now() AND (${status}<>'Registration link available' OR data->>'registrationClosesAt' IS NULL OR (data->>'registrationClosesAt')::timestamptz>now()) AND (${user.role}='admin' OR data->>'createdBy'=${user.id}) RETURNING id`
    ).length > 0
  );
}

export function assertDemoHostedEventEdit(previous: CityEvent, next: CityEvent) {
  const rows = Object.values(globalThis.betterHabitsRegistrations ?? {}).filter(
    row => row.eventId === previous.id,
  );
  const error = hostedEventEditError(
    previous,
    next,
    rows.filter(row => row.status === 'approved').length,
    rows.length,
  );
  if (error) throw new Error(error);
}

export async function endorseProduct(
  user: PublicUser,
  id: string,
  sourceUrl: string,
  disclosure: string,
) {
  if (user.role !== 'creator') throw new Error('Creator access required.');
  const product = await getItem(id);
  if (!product || !('category' in product) || product.status !== 'published')
    throw new Error('Product not available.');
  const endorsement = {
    creatorId: user.id,
    creatorName: user.name,
    sourceUrl,
    disclosure,
  };
  if (isDemoMode()) {
    const item = state.catalog.find(item => item.id === id) as Product;
    item.endorsements = [...item.endorsements.filter(e => e.creatorId !== user.id), endorsement];
  } else {
    const sql = sqlClient();
    await sql`UPDATE mobile_catalog SET data=jsonb_set(data,'{endorsements}',COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements(data->'endorsements') e WHERE e->>'creatorId'<>${user.id}),'[]'::jsonb) || ${JSON.stringify([endorsement])}::jsonb) WHERE id=${id}`;
  }
  await trackMobile(user, 'product_vouched', { kind: 'product', id });
}
