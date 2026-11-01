import assert from 'node:assert/strict';
import test from 'node:test';
import { completionHistory, completionWeek } from '../shared/completion-history';
import type { HabitFlow } from '../shared/mobile';
const flows: HabitFlow[] = [
  {
    id: 'flow',
    title: 'Flow',
    goal: 'Focus',
    description: 'Description',
    steps: [{ id: 'step', title: 'Step', cue: 'Cue', duration: 'A minute' }],
  },
];
test('history is bounded to 28 inclusive calendar days, deduplicated and catalogue-valid', () => {
  const rows = completionHistory(
    [
      '2026-09-20:flow:step',
      '2026-09-19:flow:step',
      '2026-10-17:flow:step',
      '2026-10-17:flow:step',
      '2026-10-18:flow:step',
      '2026-10-17:missing:step',
      '2026-02-30:flow:step',
      'bad',
    ],
    flows,
    new Date('2026-10-17T12:00:00Z'),
  );
  assert.deepEqual(
    rows.map(row => row.day),
    ['2026-09-20', '2026-10-17'],
  );
});
test('week begins Monday and aggregates counts with neutral empty days', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  const history = completionHistory(['2026-10-17:flow:step'], flows, now);
  const week = completionWeek(history, now);
  assert.equal(week[0].id, '2026-10-12');
  assert.equal(week[0].label, 'Mon');
  assert.equal(week[5].done, 1);
  assert.equal(week[6].done, 0);
  assert.equal(
    completionWeek(history, now, 'Asia/Kolkata', 'missing').reduce((sum, day) => sum + day.done, 0),
    0,
  );
});
test('day boundaries follow the requested time zone', () => {
  const now = new Date('2026-10-17T20:00:00Z');
  assert.equal(completionHistory(['2026-10-18:flow:step'], flows, now, 'Asia/Kolkata').length, 1);
  assert.equal(completionHistory(['2026-10-18:flow:step'], flows, now, 'UTC').length, 0);
});
