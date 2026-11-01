import assert from 'node:assert/strict';
import test from 'node:test';
import type { CityEvent } from '../shared/mobile';
import { eventCalendar } from '../shared/calendar';
const event = {
  id: 'event-1',
  title: 'Build together',
  venue: 'Test space',
  city: 'Hyderabad',
  startsAt: '2026-10-18T03:30:00Z',
  endsAt: '2026-10-18T05:30:00Z',
  status: 'published',
  registrationMode: 'approval',
} as CityEvent;
test('calendar exports explicit IST start/end without guest details', () => {
  const result = eventCalendar(event, new Date('2026-10-17T00:00Z'));
  assert.match(result.contents, /DTSTART;TZID=Asia\/Kolkata:20261018T090000/);
  assert.match(result.contents, /DTEND;TZID=Asia\/Kolkata:20261018T110000/);
  assert.match(result.contents, /TZID:Asia\/Kolkata/);
  assert.doesNotMatch(result.contents, /ATTENDEE|ORGANIZER/);
  assert.match(result.contents.replace(/\r\n /g, ''), /not proof of an approved place/);
});
test('calendar does not invent missing ends and labels provider registration', () => {
  const result = eventCalendar({
    ...event,
    endsAt: undefined,
    registrationMode: 'external',
    registrationUrl: 'https://lu.ma/example',
  });
  assert.doesNotMatch(result.contents, /DTEND/);
  assert.match(result.contents, /End time not confirmed/);
  assert.match(result.contents.replace(/\r\n /g, ''), /Registration happens with the provider/);
  assert.equal(result.missingEnd, true);
});
test('date-only export remains an all-day date', () => {
  const result = eventCalendar({
    ...event,
    startsAt: '2026-10-18',
    endsAt: undefined,
    dateOnly: true,
  });
  assert.match(result.contents, /DTSTART;VALUE=DATE:20261018/);
  assert.doesNotMatch(result.contents, /DTEND|VTIMEZONE/);
});
test('calendar escapes text injection, folds UTF8 and refuses invalid/cancelled events', () => {
  const result = eventCalendar({
    ...event,
    title: 'अ'.repeat(80) + '\nATTENDEE:fake,semi;slash\\',
  });
  assert.doesNotMatch(result.contents, /\r\nATTENDEE:/);
  assert.ok(
    result.contents.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75),
  );
  assert.throws(() => eventCalendar({ ...event, registrationStatus: 'Cancelled' }));
  assert.throws(() => eventCalendar({ ...event, startsAt: 'invalid' }));
  assert.throws(() => eventCalendar({ ...event, endsAt: event.startsAt }));
});
