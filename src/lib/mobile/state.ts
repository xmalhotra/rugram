import 'server-only';
import { database } from '.././database';
import { type CityEvent, type MobileProfile, type Product } from '../../../shared/mobile';
import { isDemoMode } from '.././store';
import { curatedFlowProducts, curatedFlowEvents } from '../../../shared/curated-flow-resources';
import { hostedDemoEvent } from '../../../shared/hosted-demo-event';

export type Activity = {
  userId: string;
  role: string;
  action: string;
  at: string;
  resourceKind?: string;
  resourceId?: string;
  activityId?: string;
};
export type CatalogItem = Product | CityEvent;
export type State = {
  profiles: Record<string, MobileProfile>;
  catalog: CatalogItem[];
  activities: Activity[];
  attendance: Record<string, number>;
  requests: Record<string, string>;
};
declare global {
  var betterHabitsMobileState: State | undefined;
}
export const initialProfile = (): MobileProfile => ({
  city: 'Hyderabad',
  flowIds: [],
  savedProductIds: [],
  completed: [],
  eventIds: [],
});
const demos: Product[] = [
  {
    id: 'demo-oats',
    title: 'Whole-grain breakfast base',
    category: 'Food',
    tier: 'Essential',
    price: 200,
    summary:
      'Compare oats or other grains you enjoy. This is a demo budget example, not a verified offer.',
    url: '',
    checkedAt: '',
    status: 'published',
    createdBy: 'admin',
    endorsements: [],
    demo: true,
  },
  {
    id: 'demo-bottle',
    title: 'Reusable water bottle',
    category: 'Gear',
    tier: 'Essential',
    price: 500,
    summary: 'A simple visible cue for your morning flow. Demo price only.',
    url: '',
    checkedAt: '',
    status: 'archived',
    createdBy: 'admin',
    endorsements: [],
    demo: true,
  },
  {
    id: 'demo-headphones',
    title: 'Focus headphones',
    category: 'Tech',
    subcategory: 'Audio',
    tier: 'Upgrade',
    price: 3000,
    summary: 'Compare comfort and isolation before paying for extra features. Demo price only.',
    url: '',
    checkedAt: '',
    status: 'published',
    createdBy: 'admin',
    endorsements: [],
    demo: true,
  },
  {
    id: 'demo-watch',
    title: 'Activity watch',
    category: 'Tech',
    subcategory: 'Wearables',
    tier: 'Premium',
    price: 15000,
    summary:
      'Optional tracking equipment. You can start a habit without buying a watch. Demo price only.',
    url: '',
    checkedAt: '',
    status: 'published',
    createdBy: 'admin',
    endorsements: [],
    demo: true,
  },
];
export const state = (globalThis.betterHabitsMobileState ??= {
  profiles: {},
  catalog: demos,
  activities: [],
  attendance: {},
  requests: {},
});
state.attendance ??= {};
state.requests ??= {};
// Demo-only example; never inserted into a production catalogue or charged to a creator quota.
if (isDemoMode() && !state.catalog.some(item => item.id === 'demo-hosted-tech-100'))
  state.catalog.push(hostedDemoEvent());
if (isDemoMode())
  for (const item of [...curatedFlowProducts, ...curatedFlowEvents]) {
    const existing = state.catalog.find(value => value.id === item.id);
    if (!existing) state.catalog.push(structuredClone(item));
    else if ('category' in existing && 'category' in item && existing.url === item.url) {
      existing.imageUrl ??= item.imageUrl;
      existing.catalogueOnly ??= item.catalogueOnly;
      if (
        existing.id === 'pick-apple-mac-mini' &&
        existing.imageUrl?.startsWith(
          'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/mac-mini-chip-unselect-202608-gallery-1',
        )
      )
        existing.imageUrl = item.imageUrl;
      if (
        existing.price === item.price &&
        existing.checkedAt === item.checkedAt &&
        item.purchaseOptions
      ) {
        existing.purchaseOptions ??= structuredClone(item.purchaseOptions);
        existing.variantLabel ??= item.variantLabel;
        // Source-identical legacy demo picks can receive newly authored shortlist metadata.
        if (existing.assessment && item.assessment?.shortlist)
          existing.assessment.shortlist ??= structuredClone(item.assessment.shortlist);
      }
    }
  }
// Update an already-running local demo without resetting profiles or sessions.
for (const item of state.catalog)
  if ('category' in item) {
    if (
      isDemoMode() &&
      item.demo &&
      ['demo-oats', 'demo-headphones', 'demo-watch'].includes(item.id)
    )
      item.status = 'archived';
    if (item.category === 'Electronics') {
      item.category = 'Tech';
      item.subcategory =
        item.id === 'demo-headphones'
          ? 'Audio'
          : item.id === 'demo-watch'
            ? 'Wearables'
            : 'Electronics';
    }
    if (item.category === 'Gear') item.status = 'archived';
  }
export const sqlClient = database;
