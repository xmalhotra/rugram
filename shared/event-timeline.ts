import type { CityEvent } from './mobile';
import { eventTimeZone } from './format';

/** The calendar day an event starts on, in India time (the timezone events are listed in). */
export function eventDayKey(at: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: eventTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(at));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export type EventDay = { key: string; title: string; weekday: string; events: CityEvent[] };

/** Events grouped under "Today / Tomorrow / 9 November" headers, keeping the given order inside a day. */
export function groupEventsByDay(events: CityEvent[], now = new Date()): EventDay[] {
  const today = eventDayKey(now.toISOString());
  const tomorrow = eventDayKey(new Date(now.getTime() + 86400000).toISOString());
  const days = new Map<string, EventDay>();
  for (const event of events) {
    const key = eventDayKey(event.startsAt);
    let day = days.get(key);
    if (!day) {
      const date = new Date(event.startsAt);
      const format = (options: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat('en-IN', { ...options, timeZone: eventTimeZone }).format(date);
      day = {
        key,
        title: key === today ? 'Today' : key === tomorrow ? 'Tomorrow' : format({ day: 'numeric', month: 'long' }),
        weekday: format({ weekday: 'long' }),
        events: [],
      };
      days.set(key, day);
    }
    day.events.push(event);
  }
  return [...days.values()];
}
