import assert from 'node:assert/strict';
import test from 'node:test';
import { countBySection, dayStreak } from '../shared/profile-stats';

const now = new Date(2026, 10, 6, 12).getTime();
const at = (day: number, hour = 9) => new Date(2026, 10, day, hour).toISOString();

test('a streak counts days in a row, once per day', () => {
  assert.equal(dayStreak([], now), 0);
  assert.equal(dayStreak([at(6), at(6, 18), at(5), at(4)], now), 3);
});

test('today stays open, and a missed day ends the streak', () => {
  assert.equal(dayStreak([at(5), at(4)], now), 2);
  assert.equal(dayStreak([at(4), at(3)], now), 0);
  assert.equal(dayStreak([at(6), at(4)], now), 1);
  assert.equal(dayStreak(['not a date', at(6)], now), 1);
});

test('the map summary counts flows per section, biggest first', () => {
  assert.deepEqual(countBySection(['Running', 'Gym', 'Gym']), [
    { title: 'Gym', count: 2 },
    { title: 'Running', count: 1 },
  ]);
});
