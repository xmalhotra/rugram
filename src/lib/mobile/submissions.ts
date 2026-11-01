import 'server-only';
import { isDemoMode } from '../store';
import type { PublicUser } from '../types';
import { productSchema } from '../product-validation';
import { creatorEventSchema } from '../event-validation';
import { getItem } from './catalog';
import { trackMobile } from './analytics';
import { managedLibrary } from '../admin-content-store';
import { isHyderabadTech } from '../../../shared/hyderabad-tech';
import { state, sqlClient, type CatalogItem } from './state';

export async function changePendingSubmission(
  user: PublicUser,
  id: string,
  action: 'withdraw' | 'edit',
  raw?: unknown,
) {
  if (user.role !== 'creator') throw new Error('Creator access required.');
  const previous = await getItem(id);
  if (!previous || previous.createdBy !== user.id) throw new Error('Listing not found.');
  if (previous.status !== 'pending')
    throw new Error('Content only your pending submissions can be edited or withdrawn.');
  let patch: Partial<CatalogItem>;
  if (action === 'withdraw') patch = { status: 'archived', withdrawnAt: new Date().toISOString() };
  else if ('city' in previous) {
    const input = creatorEventSchema.parse(raw);
    if (!isHyderabadTech({ ...previous, ...input }, (await managedLibrary()).settings))
      throw new Error('Event not available in the enabled scope.');
    patch = { ...input, reviewRequired: true };
  } else {
    const input = productSchema.parse(raw);
    const settings = (await managedLibrary()).settings;
    if (
      !settings.productCategories.some(category => category.id === input.category) ||
      !settings.tiers.includes(input.tier)
    )
      throw new Error('Product not available in the enabled category or tier.');
    if (
      input.category === 'Tech' &&
      !settings.productCategories
        .find(category => category.id === 'Tech')
        ?.subcategories.includes(input.subcategory ?? '')
    )
      throw new Error('Product not available in the enabled Tech type.');
    patch = {
      ...input,
      assessment: input.assessment ? { ...input.assessment, shortlist: undefined } : undefined,
      recommendations: input.recommendations?.map(reference => ({ ...reference, verified: false })),
    };
  }
  // Identity, owner, submission timestamp and quota key are never taken from raw input.
  if (isDemoMode()) {
    const item = state.catalog.find(item => item.id === id);
    if (!item || item.status !== 'pending' || item.createdBy !== user.id)
      throw new Error('Content submission changed. Refresh before editing.');
    Object.assign(item, patch);
  } else {
    const sql = sqlClient();
    if (
      !(
        await sql`UPDATE mobile_catalog SET data=data||${JSON.stringify(patch)}::jsonb WHERE id=${id} AND data->>'createdBy'=${user.id} AND data->>'status'='pending' RETURNING id`
      ).length
    )
      throw new Error('Content submission changed. Refresh before editing.');
  }
  await trackMobile(user, action === 'withdraw' ? 'listing_withdrawn' : 'submission_edited', {
    kind: 'city' in previous ? 'event' : 'product',
    id,
  });
}
