import type { CityEvent } from './mobile';
import { outboundHost } from './trust';
const escapeText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
function stamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}
function istDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return ['year', 'month', 'day']
    .map(type => parts.find(part => part.type === type)!.value)
    .join('');
}
function istTime(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`;
}
/** RFC 5545 lines are limited to 75 UTF-8 octets, including continuation space. */
function fold(line: string) {
  const encoder = new TextEncoder();
  let chunk = '';
  let bytes = 0;
  const chunks: string[] = [];
  for (const char of line) {
    const length = encoder.encode(char).length;
    if (bytes + length > 75) {
      chunks.push(chunk);
      chunk = ' ';
      bytes = 1;
    }
    chunk += char;
    bytes += length;
  }
  chunks.push(chunk);
  return chunks.join('\r\n');
}
export function eventCalendar(event: CityEvent, now = new Date()) {
  const start = Date.parse(event.startsAt);
  if (
    !Number.isFinite(start) ||
    event.registrationStatus === 'Cancelled' ||
    event.status !== 'published'
  )
    throw new Error('This event cannot be added to a calendar.');
  const end = event.endsAt ? Date.parse(event.endsAt) : NaN;
  if (event.endsAt && (!Number.isFinite(end) || end <= start))
    throw new Error('The event end time needs to be checked.');
  const external = event.registrationMode !== 'approval';
  const link = [event.registrationUrl, event.sourceUrl].find(value => value && outboundHost(value));
  const notes = [
    'Saved from Qram.',
    external
      ? 'Registration happens with the provider. This calendar entry is not a ticket.'
      : 'This calendar entry is not proof of an approved place.',
    !event.dateOnly && !event.endsAt ? 'End time not confirmed.' : null,
    link,
  ]
    .filter(Boolean)
    .join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Qram//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (!event.dateOnly)
    lines.push(
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Kolkata',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0530',
      'TZOFFSETTO:+0530',
      'TZNAME:IST',
      'END:STANDARD',
      'END:VTIMEZONE',
    );
  lines.push(
    'BEGIN:VEVENT',
    `UID:${encodeURIComponent(event.id)}@qram.app`,
    `DTSTAMP:${stamp(now)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText([event.venue, event.city].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${escapeText(notes)}`,
  );
  if (event.dateOnly) {
    lines.push(
      `DTSTART;VALUE=DATE:${/^\d{4}-\d{2}-\d{2}$/.test(event.startsAt) ? event.startsAt.replace(/-/g, '') : istDate(event.startsAt)}`,
    );
  } else {
    lines.push(`DTSTART;TZID=Asia/Kolkata:${istTime(event.startsAt)}`);
    if (event.endsAt) lines.push(`DTEND;TZID=Asia/Kolkata:${istTime(event.endsAt)}`);
  }
  if (link) lines.push(`URL:${link.replace(/[\r\n]/g, '')}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return {
    filename: 'qram-event.ics',
    contents: lines.map(fold).join('\r\n') + '\r\n',
    missingEnd: !event.dateOnly && !event.endsAt,
  };
}
