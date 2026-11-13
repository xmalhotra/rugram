import 'server-only';
import { aggregateAnalytics, flows } from '../../../shared/mobile';
import { isDemoMode } from '.././store';
import { type PublicUser } from '.././types';
import { workoutCatalog } from '.././exercise-store';
import { canOpenRegistration } from '../../../shared/hyderabad-tech';
import { managedLibrary } from '.././admin-content-store';
import { getItem } from './catalog';
import { type Activity, state, sqlClient } from './state';

export function role(user: PublicUser) {
  return user.role === 'member' ? 'user' : user.role;
}

export async function trackMobile(
  user: PublicUser,
  action: string,
  target?: { kind: string; id: string; activityId?: string },
) {
  if (isDemoMode()) {
    state.activities.push({
      userId: user.id,
      role: role(user),
      action,
      at: new Date().toISOString(),
      resourceKind: target?.kind,
      resourceId: target?.id,
      activityId: target?.activityId,
    });
    return;
  }
  try {
    const sql = sqlClient();
    await sql`INSERT INTO mobile_analytics(id,user_id,action,role,resource_kind,resource_id,metadata) VALUES(${crypto.randomUUID()},${user.id},${action},${role(user)},${target?.kind ?? null},${target?.id ?? null},${JSON.stringify(target?.activityId ? { activityId: target.activityId } : {})}::jsonb)`;
  } catch {
    console.error(JSON.stringify({ event: 'analytics_write_failed', action }));
  }
}

export async function itemAnalytics(
  user: PublicUser,
  kind: string,
  id: string,
  days: number,
  activityId = '',
) {
  if (user.role !== 'admin') throw new Error('Admin access required.');
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  let activities: Activity[];
  if (isDemoMode())
    activities = state.activities.filter(
      item =>
        item.at >= cutoff &&
        item.resourceKind === kind &&
        item.resourceId === id &&
        (!activityId || item.activityId === activityId),
    );
  else {
    const sql = sqlClient();
    const [totals, actions, daily] = await Promise.all([
      sql`SELECT count(*)::int AS actions,count(DISTINCT user_id)::int AS users FROM mobile_analytics WHERE at>=${cutoff}::timestamptz AND resource_kind=${kind} AND resource_id=${id} AND (${activityId}='' OR metadata->>'activityId'=${activityId})`,
      sql`SELECT action,count(*)::int AS count FROM mobile_analytics WHERE at>=${cutoff}::timestamptz AND resource_kind=${kind} AND resource_id=${id} AND (${activityId}='' OR metadata->>'activityId'=${activityId}) GROUP BY action`,
      sql`SELECT to_char(at AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS date,count(*)::int AS count FROM mobile_analytics WHERE at>=${cutoff}::timestamptz AND resource_kind=${kind} AND resource_id=${id} AND (${activityId}='' OR metadata->>'activityId'=${activityId}) GROUP BY date ORDER BY date`,
    ]);
    return {
      days,
      actions: Number(totals[0].actions),
      uniqueUsers: Number(totals[0].users),
      byAction: Object.fromEntries(actions.map(row => [String(row.action), Number(row.count)])),
      daily: daily.map(row => ({
        date: String(row.date),
        count: Number(row.count),
      })),
      note: 'Item attribution starts with this update; older unattributed actions are excluded. Link opens are not registrations or purchases.',
    };
  }
  const summary = aggregateAnalytics(activities);
  return {
    days,
    actions: summary.actions,
    uniqueUsers: summary.activeUsers,
    byAction: summary.byAction,
    daily: summary.daily,
    note: 'Item attribution starts with this update; older unattributed actions are excluded. Link opens are not registrations or purchases.',
  };
}

export async function trackEventOpen(user: PublicUser, id: string) {
  const event = await getItem(id);
  if (!event || !('city' in event) || !canOpenRegistration(event))
    throw new Error('Event not available.');
  await trackMobile(user, 'event_link_opened', { kind: 'event', id });
}

export async function trackContentView(user: PublicUser, kind: string, id: string) {
  if (kind === 'product' || kind === 'event') {
    const item = await getItem(id);
    if (
      !item ||
      item.status !== 'published' ||
      (kind === 'event' ? !('city' in item) : !('category' in item))
    )
      throw new Error('Event not available.');
  } else {
    const workout = await workoutCatalog();
    const library = await managedLibrary([...flows, ...workout.workouts], workout.exercises);
    const items =
      kind === 'flow'
        ? library.flows
        : kind === 'exercise'
          ? library.exercises
          : kind === 'card'
            ? library.cards
            : library.guides;
    if (!items.some(item => item.id === id)) throw new Error('Event not available.');
  }
  await trackMobile(user, 'content_viewed', { kind, id });
}
