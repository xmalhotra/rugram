import assert from 'node:assert/strict';
import test from 'node:test';
import { addDailyItem, emptyDailyChecks, tickDailyItem } from '../shared/daily-checks';
import { dailyFlowAddList, dailyFlowDay, type DailyFlowAddSource } from '../shared/daily-flow';
import type { SeriesOccurrence, SeriesTime } from '../shared/flow-series';
import { gymEstimatedMinutes, gymFlowById } from '../shared/gym-flows';
import { catalogFlows } from '../shared/flow-catalog';

const day = '2026-11-11';

function flow(partial: {
  seriesId: string;
  itemId: string;
  date?: string;
  time: SeriesTime;
  status?: 'open' | 'done';
  original?: string;
}): SeriesOccurrence {
  const date = partial.date ?? day;
  return {
    seriesId: partial.seriesId,
    itemKind: 'flow',
    itemId: partial.itemId,
    date,
    time: partial.time,
    original: partial.original ?? date,
    moved: false,
    status: partial.status ?? 'open',
  };
}

function names(entries: { kind: string; name?: string; itemId?: string }[]) {
  return entries.map(entry => (entry.kind === 'item' ? entry.name : entry.itemId));
}

test('a day is ordered by time, then by checkpoint', () => {
  const checks = addDailyItem(
    addDailyItem(addDailyItem(emptyDailyChecks(), 'Creatine', 1, 'creatine', 'Morning'), 'Water is out', 1, 'bed', 'Before bed'),
    'Wake stretch',
    1,
    'wake',
    'Wake up',
  );
  const entries = dailyFlowDay(
    day,
    [
      flow({ seriesId: 's-lunch', itemId: 'early-lunch', time: { checkpoint: 'Lunch', at: '07:00' } }),
      flow({ seriesId: 's-morn', itemId: 'later-morning', time: { checkpoint: 'Morning', at: '09:00' } }),
      flow({ seriesId: 's-wake-late', itemId: 'late-wake', time: { checkpoint: 'Wake up', at: '07:00' } }),
      flow({ seriesId: 's-other', itemId: 'tomorrow', date: '2026-11-12', time: { checkpoint: 'Morning', at: '06:00' } }),
    ],
    checks,
  );
  assert.deepEqual(names(entries), [
    'Wake stretch',
    'late-wake',
    'early-lunch',
    'Creatine',
    'later-morning',
    'Water is out',
  ]);
});

test('done stays on the flow that was done and the item whose servings are ticked', () => {
  let checks = addDailyItem(emptyDailyChecks(), 'Creatine', 2, 'creatine', 'Morning');
  checks = addDailyItem(checks, 'Magnesium', 1, 'mag', 'Before bed');
  checks = tickDailyItem(checks, 'creatine', day);
  checks = tickDailyItem(checks, 'mag', day);
  checks = tickDailyItem(checks, 'mag', '2026-11-12');
  const entries = dailyFlowDay(
    day,
    [
      flow({ seriesId: 's-done', itemId: 'push', time: { checkpoint: 'Morning' }, status: 'done' }),
      flow({ seriesId: 's-open', itemId: 'pull', time: { checkpoint: 'Lunch' }, status: 'open' }),
    ],
    checks,
  );
  const byId = Object.fromEntries(entries.map(entry => [entry.kind === 'flow' ? entry.itemId : entry.id, entry.status]));
  assert.deepEqual(byId, { push: 'done', creatine: 'open', pull: 'open', mag: 'done' });
  const creatine = entries.find(entry => entry.kind === 'item' && entry.id === 'creatine');
  assert.equal(creatine?.kind === 'item' ? creatine.ticked : 0, 1);
});

test('a day with only items keeps them and their ticks', () => {
  let checks = addDailyItem(emptyDailyChecks(), 'Creatine', 1, 'creatine', 'Morning');
  checks = tickDailyItem(checks, 'creatine', day);
  checks = addDailyItem(checks, 'Eggs', 1, 'eggs', 'Wake up');
  const entries = dailyFlowDay(day, [], checks);
  assert.deepEqual(
    entries.map(entry => (entry.kind === 'item' ? [entry.id, entry.name, entry.status, entry.ticked] : [])),
    [
      ['eggs', 'Eggs', 'open', 0],
      ['creatine', 'Creatine', 'done', 1],
    ],
  );
});

test('a day with only flows keeps each flow and whether it was done', () => {
  const entries = dailyFlowDay(
    day,
    [
      flow({ seriesId: 's-b', itemId: 'legs', time: { checkpoint: 'Afternoon', at: '16:00' }, status: 'done' }),
      flow({ seriesId: 's-a', itemId: 'push', time: { checkpoint: 'Morning', at: '07:30' } }),
    ],
    emptyDailyChecks(),
  );
  assert.deepEqual(
    entries.map(entry => (entry.kind === 'flow' ? [entry.seriesId, entry.itemId, entry.status] : [])),
    [
      ['s-a', 'push', 'open'],
      ['s-b', 'legs', 'done'],
    ],
  );
});

test('a rest day is an empty list', () => {
  assert.deepEqual(dailyFlowDay(day, [], emptyDailyChecks()), []);
  const elsewhere = flow({
    seriesId: 's',
    itemId: 'push',
    date: '2026-11-10',
    time: { checkpoint: 'Morning' },
  });
  assert.deepEqual(dailyFlowDay(day, [elsewhere], emptyDailyChecks()), []);
});

test('flows that share a name are one row, and a reason is suggested once', () => {
  const sources: DailyFlowAddSource[] = [
    { id: 'arms-advanced', name: 'Arms', body: 'Arms', level: 'Advanced', minutes: 60, exercises: 8 },
    { id: 'arms-beginner', name: 'Arms', body: 'Arms', level: 'Beginner', minutes: 35, exercises: 6, reason: 'Covers biceps, which is behind' },
    { id: 'arms-intermediate', name: 'Arms', body: 'Arms', level: 'Intermediate', minutes: 45, exercises: 7 },
    { id: 'chest', name: 'Flat and incline press', body: 'Chest', level: 'Intermediate', minutes: 50, exercises: 5 },
    { id: 'arms-beginner', name: 'Arms', body: 'Arms', level: 'Beginner', minutes: 35, exercises: 6 },
  ];
  const list = dailyFlowAddList(sources);
  assert.equal(list.suggested.length, 1);
  assert.equal(list.suggested[0]?.name, 'Arms');
  assert.deepEqual(
    list.suggested[0]?.levels.map(level => level.level),
    ['Beginner', 'Intermediate', 'Advanced'],
  );
  assert.equal(list.groups.some(group => group.rows.some(row => row.name === 'Arms')), false);
  assert.deepEqual(
    list.groups.map(group => group.body),
    ['Chest'],
  );
});

test('the live Arms flow is one row with a level, minutes and an exercise count', () => {
  const sources: DailyFlowAddSource[] = catalogFlows.flatMap(flow => {
    const gym = flow.flowId ? gymFlowById(flow.flowId) : undefined;
    if (flow.title !== 'Arms' || !gym?.items.length || !flow.flowId) return [];
    return [{ id: flow.flowId, name: flow.title, body: 'Arms', level: flow.level, minutes: gymEstimatedMinutes(gym), exercises: gym.items.length }];
  });
  const list = dailyFlowAddList(sources);
  const row = list.groups.find(group => group.body === 'Arms')?.rows[0];
  assert.ok(row);
  assert.equal(row?.name, 'Arms');
  assert.deepEqual(
    row?.levels.map(level => level.level),
    ['Beginner', 'Intermediate', 'Advanced'],
  );
  assert.ok(row?.levels.every(level => level.minutes > 0 && level.exercises > 0));
});
