import assert from 'node:assert/strict';
import test from 'node:test';
import { eventDayKey, groupEventsByDay } from '../shared/event-timeline';
import type { CityEvent } from '../shared/mobile';

const event = (id: string, startsAt: string) => ({ id, startsAt }) as CityEvent;

test('events group by their India calendar day, with Today and Tomorrow named', () => {
  // 20:00 UTC on 1 Nov is 01:30 on 2 Nov in India.
  assert.equal(eventDayKey('2026-11-01T20:00:00.000Z'), '2026-11-02');
  const now = new Date('2026-11-02T04:00:00.000Z');
  const days = groupEventsByDay(
    [
      event('a', '2026-11-02T10:00:00.000Z'),
      event('b', '2026-11-03T05:00:00.000Z'),
      event('c', '2026-11-09T08:00:00.000Z'),
      event('d', '2026-11-09T12:00:00.000Z'),
    ],
    now,
  );
  assert.deepEqual(
    days.map(day => [day.title, day.weekday, day.events.map(item => item.id)]),
    [
      ['Today', 'Monday', ['a']],
      ['Tomorrow', 'Tuesday', ['b']],
      ['9 November', 'Monday', ['c', 'd']],
    ],
  );
});
