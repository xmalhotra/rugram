import assert from 'node:assert/strict';
import test from 'node:test';
import { dayLevel, trainingCalendar } from '../shared/training-calendar';

const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

test('a year of weeks, Monday first, ending with this week', () => {
  const now = new Date(2026, 10, 8, 18).getTime(); // Sunday 8 Nov 2026
  const calendar = trainingCalendar([], now);
  assert.equal(calendar.weeks.length, 53);
  assert.ok(calendar.weeks.every(week => week.days.length === 7));
  const last = calendar.weeks.at(-1)!;
  assert.equal(last.days[0].date, '2026-11-02');
  assert.equal(last.days[6].date, '2026-11-08');
  assert.equal(last.days[6].future, false);
});

test('counts workouts per local day and marks the future empty', () => {
  const now = new Date(2026, 10, 4, 9).getTime(); // Wednesday
  const calendar = trainingCalendar([local(2026, 11, 2), local(2026, 11, 2, 19), local(2026, 11, 3), 'nonsense'], now);
  const week = calendar.weeks.at(-1)!;
  assert.deepEqual(week.days.slice(0, 3).map(day => day.count), [2, 1, 0]);
  assert.deepEqual(week.days.slice(0, 2).map(day => day.level), [2, 1]);
  assert.equal(week.days[4].future, true);
  assert.equal(calendar.total, 3);
  assert.equal(calendar.activeDays, 2);
});

test('levels cap at four and months label the week their first Monday falls in', () => {
  assert.deepEqual([0, 1, 3, 4, 9].map(dayLevel), [0, 1, 3, 4, 4]);
  const calendar = trainingCalendar([], new Date(2026, 10, 8).getTime());
  const labelled = calendar.weeks.filter(week => week.month).map(week => `${week.month}:${week.days[0].date}`);
  assert.ok(labelled.includes('Nov:2026-11-02'));
  assert.ok(labelled.includes('Oct:2026-10-05'));
  assert.ok(calendar.weeks.filter(week => week.month).length >= 11);
});
