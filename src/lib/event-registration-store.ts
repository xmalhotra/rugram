import 'server-only';
import { demoInboxPut } from './notification-store';
import { database } from './database';
import { getUser, isDemoMode } from './store';
import { getItem, trackMobile, setHostedEventStatus } from './mobile-store';
import type { PublicUser } from './types';
import type { CityEvent } from '../../shared/mobile';
import type {
  EventRegistration,
  EventRegistrationView,
  EventGuest,
  RegistrationStatus,
} from '../../shared/event-registration';
import type { HostedEventAction } from '../../shared/event-registration';
import type { EventInviteInbox } from '../../shared/event-invites';
type Registry = Record<string, EventRegistration>;
declare global {
  var betterHabitsRegistrations: Registry | undefined;
}
const state = (globalThis.betterHabitsRegistrations ??= {});
export async function eventInviteInbox(user: PublicUser): Promise<EventInviteInbox> {
  if (!['admin', 'creator'].includes(user.role))
    throw new RegistrationError('Event managers only.', 403);
  if (!isDemoMode()) {
    const rows =
      await database()`SELECT r.event_id,r.user_id,r.requested_at,c.data->>'title' AS title,u.name,count(*) OVER()::int AS total FROM mobile_event_registrations r JOIN mobile_catalog c ON c.id=r.event_id JOIN users u ON u.id=r.user_id WHERE r.status='pending' AND c.data->>'registrationMode'='approval' AND c.data->>'status'='published' AND COALESCE(c.data->>'registrationStatus','')<>'Cancelled' AND (c.data->>'startsAt')::timestamptz>now() AND (${user.role}='admin' OR c.data->>'createdBy'=${user.id}) ORDER BY r.requested_at DESC,r.event_id,r.user_id LIMIT 100`;
    return {
      total: Number(rows[0]?.total ?? 0),
      requests: rows.map(row => ({
        id: `${row.event_id}:${row.user_id}:${new Date(String(row.requested_at)).toISOString()}`,
        eventId: String(row.event_id),
        eventTitle: String(row.title),
        guestId: String(row.user_id),
        guestName: String(row.name),
        requestedAt: new Date(String(row.requested_at)).toISOString(),
      })),
    };
  }
  const requests = [];
  for (const registration of Object.values(state).filter(row => row.status === 'pending')) {
    const event = await getItem(registration.eventId);
    if (
      !event ||
      !('city' in event) ||
      event.registrationMode !== 'approval' ||
      event.status !== 'published' ||
      event.registrationStatus === 'Cancelled' ||
      Date.parse(event.startsAt) <= Date.now() ||
      (user.role !== 'admin' && event.createdBy !== user.id)
    )
      continue;
    const guest = await getUser(registration.userId);
    requests.push({
      id: `${event.id}:${registration.userId}:${registration.requestedAt}`,
      eventId: event.id,
      eventTitle: event.title,
      guestId: registration.userId,
      guestName: guest?.name ?? 'Guest',
      requestedAt: registration.requestedAt,
    });
  }
  requests.sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
  return { total: requests.length, requests: requests.slice(0, 100) };
}
export class RegistrationError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function eventFor(user: PublicUser, id: string) {
  const item = await getItem(id);
  if (!item || !('city' in item)) throw new RegistrationError('Event not available.', 404);
  const manage = user.role === 'admin' || (user.role === 'creator' && item.createdBy === user.id);
  if (item.status !== 'published' && !manage) {
    const own = isDemoMode()
      ? Boolean(state[`${id}:${user.id}`])
      : (
          await database()`SELECT user_id FROM mobile_event_registrations WHERE event_id=${id} AND user_id=${user.id}`
        ).length > 0;
    if (!own) throw new RegistrationError('Event not available.', 404);
  }
  return { event: item, manage };
}
async function registrations(id: string): Promise<EventRegistration[]> {
  if (isDemoMode()) return Object.values(state).filter(item => item.eventId === id);
  return (
    await database()`SELECT * FROM mobile_event_registrations WHERE event_id=${id} ORDER BY requested_at LIMIT 10000`
  ).map(row => ({
    eventId: String(row.event_id),
    userId: String(row.user_id),
    status: row.status as RegistrationStatus,
    requestedAt: String(row.requested_at),
    updatedAt: String(row.updated_at),
  }));
}
export async function registrationView(
  user: PublicUser,
  id: string,
): Promise<EventRegistrationView> {
  const { event, manage } = await eventFor(user, id);
  if (event.registrationMode !== 'approval')
    return {
      mode: 'external',
      ownStatus: null,
      approvedCount: null,
      canManage: false,
      canViewAttendees: false,
      guests: [],
      requests: [],
      note: 'Registration, cancellations and guest information are managed by the external provider. No integration or attendee count is connected.',
    };
  const meta = {
    capacity: event.guestCapacity ?? 0,
    eventStatus: event.status,
    registrationStatus: event.registrationStatus,
  };
  if (!isDemoMode()) {
    const sql = database();
    const [mine, totals] = await Promise.all([
      sql`SELECT status FROM mobile_event_registrations WHERE event_id=${id} AND user_id=${user.id}`,
      sql`SELECT count(*) FILTER(WHERE status='approved')::int AS count,count(*) FILTER(WHERE status='pending')::int AS pending FROM mobile_event_registrations WHERE event_id=${id}`,
    ]);
    const own = mine[0]?.status as RegistrationStatus | undefined;
    const allowed =
      manage ||
      (own === 'approved' &&
        event.status === 'published' &&
        event.registrationStatus !== 'Cancelled');
    const [approved, requests] = await Promise.all([
      allowed
        ? sql`SELECT u.id,u.name,u.avatar_url,r.status FROM mobile_event_registrations r JOIN users u ON u.id=r.user_id WHERE r.event_id=${id} AND r.status='approved' ORDER BY r.requested_at LIMIT 100`
        : Promise.resolve([]),
      manage
        ? sql`SELECT u.id,u.name,u.avatar_url,r.status FROM mobile_event_registrations r JOIN users u ON u.id=r.user_id WHERE r.event_id=${id} ORDER BY CASE WHEN r.status='pending' THEN 0 ELSE 1 END,r.updated_at DESC LIMIT 100`
        : Promise.resolve([]),
    ]);
    const person = (row: Record<string, unknown>): EventGuest => ({
      id: String(row.id),
      name: String(row.name),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      status: row.status as RegistrationStatus,
    });
    return {
      ...meta,
      pendingCount: manage ? Number(totals[0].pending) : undefined,
      mode: 'approval',
      ownStatus: own ?? null,
      approvedCount: Number(totals[0].count),
      canManage: manage,
      canViewAttendees: allowed,
      guests: approved.map(person),
      requests: requests.map(person),
      note: 'Names are restricted to approved guests and managers. Showing at most 100 approved guests / requests; the approved count is the full total. Registration does not prove attendance.',
    };
  }
  const rows = await registrations(id);
  const own = rows.find(item => item.userId === user.id);
  const approved = rows.filter(item => item.status === 'approved');
  const allowed =
    manage ||
    (own?.status === 'approved' &&
      event.status === 'published' &&
      event.registrationStatus !== 'Cancelled');
  const person = async (item: EventRegistration): Promise<EventGuest> => {
    const profile = await getUser(item.userId);
    return {
      id: item.userId,
      name: profile?.name ?? 'Registered guest',
      avatarUrl: profile?.avatarUrl ?? null,
      status: item.status,
    };
  };
  const guests = allowed ? await Promise.all(approved.slice(0, 100).map(person)) : [];
  const requests = manage
    ? await Promise.all(
        [...rows]
          .sort(
            (a, b) =>
              Number(b.status === 'pending') - Number(a.status === 'pending') ||
              Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
          )
          .slice(0, 100)
          .map(person),
      )
    : [];
  return {
    ...meta,
    pendingCount: manage ? rows.filter(item => item.status === 'pending').length : undefined,
    mode: 'approval',
    ownStatus: own?.status ?? null,
    approvedCount: approved.length,
    canManage: manage,
    canViewAttendees: allowed,
    guests,
    requests,
    note: 'Guest names are visible only to approved attendees and event managers. Showing up to 100 guests and requests, with pending requests first. Counts are app registrations—not attendance or payment confirmation.',
  };
}
export async function userEventRegistrations(
  user: PublicUser,
): Promise<{ eventId: string; status: RegistrationStatus }[]> {
  if (isDemoMode())
    return Object.values(state)
      .filter(item => item.userId === user.id)
      .slice(-1000)
      .map(item => ({ eventId: item.eventId, status: item.status }));
  return (
    await database()`SELECT event_id,status FROM mobile_event_registrations WHERE user_id=${user.id} ORDER BY updated_at DESC LIMIT 1000`
  ).map(row => ({ eventId: String(row.event_id), status: row.status as RegistrationStatus }));
}
function requestOpen(event: CityEvent) {
  return (
    event.status === 'published' &&
    Date.parse(event.startsAt) > Date.now() &&
    event.registrationStatus !== 'Cancelled' &&
    event.registrationStatus !== 'Closed' &&
    event.registrationStatus !== 'Sold out' &&
    event.registrationStatus !== 'Tickets coming soon' &&
    (!event.registrationClosesAt || Date.parse(event.registrationClosesAt) > Date.now())
  );
}
export async function manageHostedEvent(user: PublicUser, id: string, action: HostedEventAction) {
  const { event, manage } = await eventFor(user, id);
  if (!manage)
    throw new RegistrationError('Only the event creator or an admin can manage this event.', 403);
  if (event.registrationMode !== 'approval')
    throw new RegistrationError('Manage external events with their provider.');
  if (event.status !== 'published' || Date.parse(event.startsAt) <= Date.now())
    throw new RegistrationError('Only upcoming published events can be changed here.');
  if (event.registrationStatus === 'Cancelled')
    throw new RegistrationError('A cancelled event cannot be reopened.');
  if (
    action === 'reopen-event' &&
    event.registrationClosesAt &&
    Date.parse(event.registrationClosesAt) <= Date.now()
  )
    throw new RegistrationError('The registration deadline has passed.');
  const next =
    action === 'cancel-event'
      ? 'Cancelled'
      : action === 'close-event'
        ? 'Closed'
        : 'Registration link available';
  if (!(await setHostedEventStatus(user, id, next)))
    throw new RegistrationError('The event changed. Refresh before trying again.', 409);
  await trackMobile(
    user,
    action === 'cancel-event'
      ? 'event_cancelled'
      : action === 'close-event'
        ? 'event_registration_closed'
        : 'event_registration_reopened',
    { kind: 'event', id },
  );
  return registrationView(user, id);
}
export async function changeRegistration(
  user: PublicUser,
  id: string,
  action: 'request' | 'cancel' | 'approve' | 'decline',
  guestId?: string,
) {
  const { event, manage } = await eventFor(user, id);
  if (event.registrationMode !== 'approval')
    throw new RegistrationError('Use the external provider for registration and cancellation.');
  if ((action === 'approve' || action === 'decline') && !manage)
    throw new RegistrationError('Only the event organiser or an admin can review guests.', 403);
  const target = action === 'request' || action === 'cancel' ? user.id : guestId;
  if (!target) throw new RegistrationError('Choose a registration.');
  const status: RegistrationStatus =
    action === 'request'
      ? 'pending'
      : action === 'cancel'
        ? 'cancelled'
        : action === 'approve'
          ? 'approved'
          : 'declined';
  let changed = false;
  if (action === 'cancel' && Date.parse(event.startsAt) <= Date.now())
    throw new RegistrationError('The event has started; registration can no longer be cancelled.');
  if (action === 'request' && !requestOpen(event))
    throw new RegistrationError('Event registration is closed or the event has started.');
  if (
    action === 'approve' &&
    (event.status !== 'published' ||
      Date.parse(event.startsAt) <= Date.now() ||
      event.registrationStatus === 'Cancelled')
  )
    throw new RegistrationError('Event is not accepting approvals.');
  if (isDemoMode()) {
    const key = `${id}:${target}`;
    const current = state[key];
    if (current?.status === status) return registrationView(user, id);
    if (action === 'request') {
      if (current && !['cancelled'].includes(current.status))
        throw new RegistrationError('Your existing registration cannot be requested again.');
      if (
        Object.values(state).filter(item => item.eventId === id && item.status === 'approved')
          .length >= (event.guestCapacity ?? 0)
      )
        throw new RegistrationError('Event is full.');
      state[key] = {
        eventId: id,
        userId: target,
        status,
        requestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    } else {
      if (!current) throw new RegistrationError('Event registration not found.', 404);
      if (action === 'approve' && current.status !== 'pending')
        throw new RegistrationError('Only a pending request can be approved.');
      if (action === 'decline' && !['pending', 'approved'].includes(current.status))
        throw new RegistrationError('This registration is no longer reviewable.');
      if (
        action === 'approve' &&
        Object.values(state).filter(item => item.eventId === id && item.status === 'approved')
          .length >= (event.guestCapacity ?? 0)
      )
        throw new RegistrationError('Event is full.');
      state[key] = { ...current, status, updatedAt: new Date().toISOString() };
      changed = true;
    }
  } else {
    const sql = database();
    const query =
      action === 'request'
        ? sql`INSERT INTO mobile_event_registrations(event_id,user_id,status) SELECT ${id},${target},'pending' WHERE EXISTS(SELECT 1 FROM mobile_catalog WHERE id=${id} AND data->>'status'='published' AND (data->>'startsAt')::timestamptz>now() AND COALESCE(data->>'registrationStatus','') NOT IN ('Cancelled','Closed','Sold out','Tickets coming soon') AND (data->>'registrationClosesAt' IS NULL OR (data->>'registrationClosesAt')::timestamptz>now()) AND (SELECT count(*) FROM mobile_event_registrations WHERE event_id=${id} AND status='approved')<COALESCE((data->>'guestCapacity')::int,0)) ON CONFLICT(event_id,user_id) DO UPDATE SET status='pending',requested_at=now(),updated_at=now() WHERE mobile_event_registrations.status='cancelled' RETURNING user_id`
        : action === 'approve'
          ? sql`UPDATE mobile_event_registrations SET status='approved',updated_at=now() WHERE event_id=${id} AND user_id=${target} AND status='pending' AND EXISTS(SELECT 1 FROM mobile_catalog WHERE id=${id} AND data->>'status'='published' AND (data->>'startsAt')::timestamptz>now() AND COALESCE(data->>'registrationStatus','')<>'Cancelled' AND (SELECT count(*) FROM mobile_event_registrations WHERE event_id=${id} AND status='approved')<COALESCE((data->>'guestCapacity')::int,0)) RETURNING user_id`
          : sql`UPDATE mobile_event_registrations SET status=${status},updated_at=now() WHERE event_id=${id} AND user_id=${target} AND status<>${status} AND (${action}='cancel' OR status IN ('pending','approved')) RETURNING user_id`;
    const result = await sql.transaction([
      sql`SELECT id FROM mobile_catalog WHERE id=${id} FOR UPDATE`,
      query,
    ]);
    changed = result[1].length > 0;
    if (!changed) {
      const current = (await registrations(id)).find(item => item.userId === target);
      if (current?.status !== status)
        throw new RegistrationError(
          'Event request could not be updated: it may be full, closed, cancelled or no longer pending.',
        );
    }
  }
  if (changed && isDemoMode()) {
    const registration = state[`${id}:${target}`];
    const key = `registration:${id}:${target}:${registration.requestedAt}:${status}`;
    if (status === 'approved' || status === 'declined')
      demoInboxPut(target, key, {
        type: `registration_${status}`,
        title: status === 'approved' ? 'Your place is approved' : 'Your request was declined',
        body: event.title,
        target: { kind: 'event', id },
      });
    else if (status === 'pending')
      demoInboxPut(event.createdBy, key, {
        type: 'registration_requested',
        title: 'New invite request',
        body: `A guest requested a place at ${event.title}.`,
        target: { kind: 'event', id },
      });
  }
  if (changed) await trackMobile(user, `registration_${status}`, { kind: 'event', id });
  return registrationView(user, id);
}
