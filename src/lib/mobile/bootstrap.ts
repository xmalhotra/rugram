import 'server-only';
import { completionHistory } from '../../../shared/completion-history';
import { notificationInbox } from '../notification-store';
import {
  aggregateAnalytics,
  flows,
  type CityEvent,
  type MobilePayload,
  type MobileProfile,
  type Product,
} from '../../../shared/mobile';
import { isDemoMode, memberContact } from '.././store';
import { type PublicUser } from '.././types';
import { workoutCatalog } from '.././exercise-store';
import { creatorEventQuota, eventMonth } from '../../../shared/creator-events';
import { managedLibrary } from '.././admin-content-store';
import { defaultSupplementDiscovery } from '../../../shared/supplement-discovery';
import { supplementPickCategories } from '../../../shared/supplement-picks';
import { role } from './analytics';
import { type Activity, type CatalogItem, state, initialProfile, sqlClient } from './state';

export async function mobileBootstrap(user: PublicUser, cursor = ''): Promise<MobilePayload> {
  const registrations = await (
    await import('../event-registration-store')
  ).userEventRegistrations(user);
  const registeredIds = registrations.map(item => item.eventId);
  const workoutLibrary = await workoutCatalog();
  const library = await managedLibrary(
    [...new Map([...flows, ...workoutLibrary.workouts].map(flow => [flow.id, flow])).values()],
    workoutLibrary.exercises,
  );
  const availableFlows = library.flows;
  let profile: MobileProfile;
  let catalog: CatalogItem[];
  let activities: Activity[] = [];
  const attendance: Record<string, number> = {};
  let analytics: MobilePayload['analytics'] = null;
  let nextCursor: string | null = null;
  if (isDemoMode()) {
    profile = state.profiles[user.id] ??= initialProfile();
    catalog = state.catalog;
    Object.assign(attendance, state.attendance);
    if (user.role === 'admin')
      activities = state.activities.filter(
        activity => new Date(activity.at).getTime() > Date.now() - 30 * 86400000,
      );
    const visible = catalog
      .filter(
        item =>
          item.status === 'published' ||
          user.role === 'admin' ||
          item.createdBy === user.id ||
          ('city' in item &&
            (profile.eventIds.includes(item.id) ||
              profile.savedEventIds?.includes(item.id) ||
              registeredIds.includes(item.id))),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const page = visible.filter(item => item.id > cursor).slice(0, 101);
    if (page.length > 100) nextCursor = page[99].id;
    catalog = [
      ...new Map(
        [
          ...page.slice(0, 100),
          ...visible.filter(
            item =>
              profile.savedProductIds.includes(item.id) ||
              profile.eventIds.includes(item.id) ||
              profile.savedEventIds?.includes(item.id) ||
              registeredIds.includes(item.id),
          ),
        ].map(item => [item.id, item]),
      ).values(),
    ];
    if (user.role === 'admin') analytics = aggregateAnalytics(activities);
  } else {
    const sql = sqlClient();
    await sql`INSERT INTO mobile_profiles(user_id) VALUES(${user.id}) ON CONFLICT DO NOTHING`;
    const [profiles, rsvps] = await Promise.all([
      sql`SELECT data FROM mobile_profiles WHERE user_id=${user.id}`,
      sql`SELECT event_id FROM mobile_rsvps WHERE user_id=${user.id}`,
    ]);
    profile = profiles[0].data as MobileProfile;
    profile.eventIds = rsvps.map(row => String(row.event_id));
    const [items, saved] = await Promise.all([
      sql`SELECT id,data FROM mobile_catalog WHERE id>${cursor} AND (data->>'status'='published' OR ${user.role}='admin' OR data->>'createdBy'=${user.id}) AND (kind='product' OR (lower(data->>'city')=ANY(${library.settings.eventCities.map(city => city.toLowerCase())}::text[]) AND data->>'topic'=ANY(${library.settings.eventTopics}::text[]) AND data->>'country'=${library.settings.eventCountry}) OR data->>'createdBy'=${user.id} OR ${user.role}='admin') ORDER BY id LIMIT 101`,
      sql`SELECT id,data FROM mobile_catalog WHERE id=ANY(${[...profile.savedProductIds, ...profile.eventIds, ...(profile.savedEventIds ?? []), ...registeredIds]}::text[])`,
    ]);
    if (items.length > 100) nextCursor = String(items[99].id);
    catalog = [
      ...new Map(
        [...items.slice(0, 100), ...saved].map(row => [String(row.id), row.data as CatalogItem]),
      ).values(),
    ];
    const eventIds = catalog.filter(item => 'city' in item).map(item => item.id);
    const counts =
      await sql`SELECT event_id,count(*)::int AS count FROM mobile_rsvps WHERE event_id=ANY(${eventIds}::text[]) GROUP BY event_id`;
    for (const row of counts) attendance[String(row.event_id)] = Number(row.count);
    if (user.role === 'admin') {
      const [totals, actions, days, roles] = await Promise.all([
        sql`SELECT count(*)::int AS actions,count(DISTINCT user_id)::int AS users FROM mobile_analytics WHERE at > now()-interval '30 days'`,
        sql`SELECT action,count(*)::int AS count FROM mobile_analytics WHERE at > now()-interval '30 days' GROUP BY action`,
        sql`SELECT to_char(at AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS date,count(*)::int AS count FROM mobile_analytics WHERE at > now()-interval '30 days' GROUP BY date ORDER BY date`,
        sql`SELECT role,count(*)::int AS count FROM mobile_analytics WHERE at > now()-interval '30 days' GROUP BY role`,
      ]);
      const byAction = Object.fromEntries(
        actions.map(row => [String(row.action), Number(row.count)]),
      );
      analytics = {
        activeUsers: Number(totals[0].users),
        actions: Number(totals[0].actions),
        completions: byAction.habit_completed ?? 0,
        saves: byAction.product_saved ?? 0,
        rsvps: byAction.event_joined ?? 0,
        byAction,
        byRole: Object.fromEntries(roles.map(row => [String(row.role), Number(row.count)])),
        daily: days.map(row => ({
          date: String(row.date),
          count: Number(row.count),
        })),
      };
    }
  }
  const visible = catalog.filter(
    item =>
      item.status === 'published' ||
      user.role === 'admin' ||
      item.createdBy === user.id ||
      ('city' in item &&
        (profile.eventIds.includes(item.id) ||
          profile.savedEventIds?.includes(item.id) ||
          registeredIds.includes(item.id))),
  );
  // Resolve connections independently of city filtering and the paginated feed.
  const useCases = [
    ...new Set(
      availableFlows.flatMap(flow =>
        flow.steps.flatMap(step => (step.pickContext ? [step.pickContext.useCase] : [])),
      ),
    ),
  ];
  const topics = [
    ...new Set(
      availableFlows.flatMap(flow => (flow.eventContext ? [flow.eventContext.topic] : [])),
    ),
  ];
  const supplementIds = [
    ...new Set(
      supplementPickCategories(
        library.settings.supplementDiscovery ?? defaultSupplementDiscovery,
      ).flatMap(topic => topic.productIds),
    ),
  ];
  let resourceProducts: Product[];
  let resourceEvents: CityEvent[];
  if (isDemoMode()) {
    resourceProducts = state.catalog
      .filter(
        (item): item is Product =>
          'category' in item &&
          item.status === 'published' &&
          (supplementIds.includes(item.id) ||
            Boolean(item.useCases?.some(tag => useCases.includes(tag)))),
      )
      .sort(
        (a, b) =>
          Number(supplementIds.includes(b.id)) - Number(supplementIds.includes(a.id)) ||
          a.price - b.price,
      )
      .slice(0, 100);
    resourceEvents = state.catalog
      .filter(
        (item): item is CityEvent =>
          'city' in item &&
          item.status === 'published' &&
          Boolean(item.topic && topics.includes(item.topic)) &&
          new Date(item.endsAt ?? item.startsAt).getTime() > Date.now(),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 100);
  } else {
    const sql = sqlClient();
    const [products, events] = await Promise.all([
      sql`SELECT data FROM mobile_catalog WHERE kind='product' AND data->>'status'='published' AND ((data->'useCases') ?| ${useCases}::text[] OR id=ANY(${supplementIds}::text[])) ORDER BY (id=ANY(${supplementIds}::text[])) DESC,(data->>'price')::numeric,id LIMIT 100`,
      sql`SELECT data FROM mobile_catalog WHERE kind='event' AND data->>'status'='published' AND data->>'topic'=ANY(${topics}::text[]) AND COALESCE(data->>'endsAt',data->>'startsAt')::timestamptz>now() ORDER BY mobile_timestamp(data->>'startsAt'),id LIMIT 100`,
    ]);
    resourceProducts = products.map(row => row.data as Product);
    resourceEvents = events.map(row => row.data as CityEvent);
  }
  const quota = user.role === 'creator' ? await getCreatorEventQuota(user, profile) : undefined;
  const contact = await memberContact(user);
  return {
    inbox: await notificationInbox(user),
    registrations,
    library: { ...library, cardResearch: undefined },
    user: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      role: role(user),
      phone: contact.phone,
      email: contact.email,
    },
    creatorEventQuota: quota,
    profile: {
      ...structuredClone(profile),
      completionHistory: completionHistory(profile.completed, availableFlows),
    },
    flows: availableFlows,
    exercises: library.exercises,
    products: visible.filter((item): item is Product => 'category' in item),
    events: visible.filter((item): item is CityEvent => 'city' in item),
    flowResources: { products: resourceProducts, events: resourceEvents },
    attendance,
    analytics,
    demoMode: isDemoMode(),
    nextCursor,
  };
}

export async function getCreatorEventQuota(user: PublicUser, profile: MobileProfile) {
  const period = eventMonth();
  let used: number;
  if (isDemoMode())
    used = state.catalog.filter(
      item =>
        'city' in item &&
        item.createdBy === user.id &&
        Boolean(item.listedAt) &&
        Date.parse(item.listedAt!) >= Date.parse(period.start) &&
        Date.parse(item.listedAt!) < Date.parse(period.end),
    ).length;
  else {
    const rows =
      await sqlClient()`SELECT count(*)::int AS used FROM mobile_catalog WHERE kind='event' AND data->>'createdBy'=${user.id} AND created_at>=${period.start}::timestamptz AND created_at<${period.end}::timestamptz`;
    used = Number(rows[0].used);
  }
  return creatorEventQuota(
    profile.creatorMonthlyEventLimit ??
      (await managedLibrary()).settings.defaultCreatorMonthlyEvents,
    used,
  );
}
