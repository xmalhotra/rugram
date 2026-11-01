import 'server-only';
import { isDemoMode } from '.././store';
import { type PublicUser } from '.././types';
import { getItem } from './catalog';
import { trackMobile } from './analytics';
import { state, initialProfile, sqlClient } from './state';

export async function rsvpEvent(user: PublicUser, id: string, enabled = true) {
  const event = await getItem(id);
  if (!event || !('city' in event)) throw new Error('Event not available.');
  if (enabled && event.registrationMode === 'approval')
    throw new Error('This event requires a registration request and organizer approval.');
  if (enabled && event.registrationUrl)
    throw new Error('This event requires registration on the organiser website.');
  if (enabled && event.status !== 'published')
    throw new Error('This event is no longer available.');
  if (enabled && new Date(event.startsAt).getTime() <= Date.now())
    throw new Error('This event has already started.');
  let changed = false;
  if (isDemoMode()) {
    const profile = (state.profiles[user.id] ??= initialProfile());
    const joined = profile.eventIds.includes(id);
    if (enabled && joined) return;
    if (enabled && (state.attendance[id] ?? 0) >= event.capacity)
      throw new Error('This event is full.');
    changed = joined !== enabled;
    profile.eventIds = enabled
      ? [...new Set([...profile.eventIds, id])]
      : profile.eventIds.filter(value => value !== id);
    if (changed) state.attendance[id] = (state.attendance[id] ?? 0) + (enabled ? 1 : -1);
  } else {
    const sql = sqlClient();
    if (!enabled)
      changed =
        (
          await sql`DELETE FROM mobile_rsvps WHERE event_id=${id} AND user_id=${user.id} RETURNING event_id`
        ).length > 0;
    else {
      const result = await sql.transaction([
        sql`SELECT id FROM mobile_catalog WHERE id=${id} FOR UPDATE`,
        sql`INSERT INTO mobile_rsvps(event_id,user_id) SELECT ${id},${user.id} WHERE (SELECT count(*) FROM mobile_rsvps WHERE event_id=${id}) < (SELECT (data->>'capacity')::int FROM mobile_catalog WHERE id=${id} AND data->>'status'='published' AND (data->>'startsAt')::timestamptz > now()) ON CONFLICT DO NOTHING RETURNING event_id`,
      ]);
      changed = result[1].length > 0;
      if (
        !changed &&
        !(await sql`SELECT event_id FROM mobile_rsvps WHERE event_id=${id} AND user_id=${user.id}`)
          .length
      )
        throw new Error('This event is full or no longer available.');
    }
  }
  if (changed)
    await trackMobile(user, enabled ? 'event_joined' : 'event_left', {
      kind: 'event',
      id,
    });
}
