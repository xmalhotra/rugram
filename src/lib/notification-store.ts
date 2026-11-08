import 'server-only';
import { database } from './database';
import { isDemoMode } from './store';
import type { PublicUser } from './types';
import type { InboxItem, NotificationInbox } from '../../shared/notifications';
import type { Product, CityEvent } from '../../shared/mobile';
import { demoInboxPut } from './demo-inbox';
export { demoInboxPut };
declare global {
  /** Demo event-category subscriptions: topic -> member ids. */
  var qramTopicSubscriptions: Map<string, Set<string>> | undefined;
}
export function demoCatalogNotifications(
  previous: Product | CityEvent | undefined,
  next: Product | CityEvent,
) {
  const key = `catalog:${next.id}:${crypto.randomUUID()}`;
  if (next.status === 'pending' && previous?.status !== 'pending') {
    const count =
      globalThis.betterHabitsMobileState?.catalog.filter(item => item.status === 'pending')
        .length ?? 1;
    for (const user of globalThis.rugramDemoStore?.users ?? [])
      if (user.role === 'admin' && !user.disabled)
        demoInboxPut(user.id, key, {
          type: 'admin_queue_digest',
          title: 'Review queue updated',
          body: `${count} submissions are waiting for review.`,
          target: { kind: 'admin', id: 'review' },
        });
  }
  if (previous?.status === 'pending' && next.status !== 'pending' && !next.withdrawnAt)
    demoInboxPut(next.createdBy, key, {
      type: next.status === 'published' ? 'listing_published' : 'listing_rejected',
      title:
        next.status === 'published' ? 'Your listing is published' : 'Your listing needs changes',
      body: `${next.title}${next.status === 'archived' ? `: ${next.reviewNote ?? 'Open Studio for feedback.'}` : ''}`,
      target: { kind: 'submission', id: next.id },
    });
  // Same rule as the SQL trigger: subscribers hear once when an event in their topic goes live.
  if ('city' in next && next.status === 'published' && previous?.status !== 'published' && next.topic)
    for (const recipient of globalThis.qramTopicSubscriptions?.get(next.topic) ?? [])
      if (recipient !== next.createdBy)
        demoInboxPut(recipient, `event-topic:${next.id}`, {
          type: 'event_new_in_topic',
          title: `New ${next.topic} event`,
          body: `${next.title} · ${next.city}`,
          target: { kind: 'event', id: next.id },
        });
  if (
    previous &&
    'city' in previous &&
    'city' in next &&
    previous.status === 'published' &&
    next.status === 'published' &&
    (previous.startsAt !== next.startsAt ||
      previous.endsAt !== next.endsAt ||
      previous.venue !== next.venue ||
      (previous.registrationStatus !== 'Cancelled' && next.registrationStatus === 'Cancelled'))
  ) {
    const cancelled = next.registrationStatus === 'Cancelled';
    for (const row of Object.values(globalThis.betterHabitsRegistrations ?? {}))
      if (row.eventId === next.id && ['pending', 'approved'].includes(row.status))
        demoInboxPut(row.userId, key, {
          type: cancelled ? 'event_cancelled' : 'event_changed',
          title: cancelled ? 'Event cancelled' : 'Event details changed',
          body: `${next.title}. Update your calendar entry.`,
          target: { kind: 'event', id: next.id },
        });
  }
}
export async function notificationInbox(user: PublicUser, cursor = ''): Promise<NotificationInbox> {
  if (isDemoMode()) {
    const mine = (globalThis.betterHabitsInbox ?? [])
      .filter(
        row =>
          row.recipientId === user.id &&
          (!row.readAt || Date.parse(row.readAt) > Date.now() - 30 * 86400000),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const start = cursor ? mine.findIndex(row => row.id === cursor) + 1 : 0;
    const items = mine.slice(start, start + 50).map(({ recipientId, businessKey, ...item }) => {
      void recipientId;
      void businessKey;
      return item;
    });
    return {
      items,
      unreadCount: mine.filter(row => !row.readAt).length,
      nextCursor: start + 50 < mine.length ? items.at(-1)!.id : null,
    };
  }
  const sql = database();
  const [rows, counts] = await Promise.all([
    sql`SELECT id,type,title,body,target_kind,target_id,created_at,read_at FROM mobile_notifications WHERE recipient_id=${user.id} AND (read_at IS NULL OR read_at>now()-interval '30 days') AND (${cursor}='' OR (created_at,id)<(SELECT created_at,id FROM mobile_notifications WHERE id=${cursor} AND recipient_id=${user.id})) ORDER BY created_at DESC,id DESC LIMIT 51`,
    sql`SELECT count(*)::int AS count FROM mobile_notifications WHERE recipient_id=${user.id} AND read_at IS NULL`,
  ]);
  const items: InboxItem[] = rows.slice(0, 50).map(row => ({
    id: String(row.id),
    type: row.type as InboxItem['type'],
    title: String(row.title),
    body: String(row.body),
    target: { kind: row.target_kind as InboxItem['target']['kind'], id: String(row.target_id) },
    createdAt: new Date(String(row.created_at)).toISOString(),
    readAt: row.read_at ? new Date(String(row.read_at)).toISOString() : null,
  }));
  return {
    items,
    unreadCount: Number(counts[0]?.count ?? 0),
    nextCursor: rows.length > 50 ? items.at(-1)!.id : null,
  };
}
export async function readNotifications(user: PublicUser, id?: string) {
  if (isDemoMode()) {
    for (const row of globalThis.betterHabitsInbox ?? [])
      if (row.recipientId === user.id && (!id || row.id === id) && !row.readAt)
        row.readAt = new Date().toISOString();
    return;
  }
  await database()`UPDATE mobile_notifications SET read_at=now() WHERE recipient_id=${user.id} AND read_at IS NULL AND (${id ?? ''}='' OR id=${id ?? ''})`;
}
