import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyFollowOccurrences,
  followPlan,
  followShowsOn,
  keptCustomflow,
  nextFollowState,
  publicSnapshot,
  sessionsLeft,
  stoppedFollow,
  suggestReplacement,
  type FollowMap,
  type FollowRecord,
  type TheirFlow,
} from '../shared/follow';
import type { SeriesOccurrence } from '../shared/flow-series';

const today = '2026-11-16';

function day(id: string, effort: FollowMap['days'][number]['effort'] = 'upper'): FollowMap['days'][number] {
  return { name: id, effort, flows: [{ kind: 'flow', id }], items: [] };
}

function mapOf(days: FollowMap['days']): FollowMap {
  return { repeat: 'in-turn', days, released: [] };
}

function upperFlow(): TheirFlow {
  return {
    title: 'Size upper',
    fromName: 'q_ava',
    kind: 'custom',
    source: { kind: 'qram-flow', id: 'gym-splits-size-upper', version: null },
    items: [{ exerciseId: 'dumbbell-bench-press', sets: 4, repsMin: 8, repsMax: 12, weightKg: 80, logs: [{ at: 1 }] }],
    changes: { order: ['dumbbell-bench-press', 'incline-dumbbell-press'] },
    weightKg: 70,
    logs: ['private'],
    bodyWeightKg: 71,
    ticks: [1],
  };
}

function record(patch: Partial<FollowRecord> = {}): FollowRecord {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    pausedSeriesId: '00000000-0000-4000-8000-000000000011',
    replacementSeriesId: '00000000-0000-4000-8000-000000000012',
    replacedFlowId: 'gym-splits-power-upper',
    sessionsTotal: 4,
    after: 'return',
    where: 'replace',
    fromName: 'q_ava',
    title: 'Size upper',
    ownTitle: 'Power upper',
    startedOn: today,
    dates: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'],
    status: 'active',
    source: { kind: 'qram-flow', id: 'gym-splits-size-upper', version: null },
    items: [{ exerciseId: 'dumbbell-bench-press', sets: 4 }],
    changes: { order: ['dumbbell-bench-press'] },
    finishedDates: [],
    reviewLine: null,
    adopted: false,
    recurrence: { kind: 'daily', every: 1 },
    time: { checkpoint: 'Morning' },
    ...patch,
  };
}

function occurrence(date: string, itemId: string, status: 'open' | 'done' = 'open'): SeriesOccurrence {
  return {
    seriesId: '00000000-0000-4000-8000-000000000011',
    itemKind: 'flow',
    itemId,
    date,
    time: { checkpoint: 'Morning' },
    original: date,
    moved: false,
    status,
  };
}

test('the most similar flow is replaced, and no shared area adds a day', () => {
  const upper = mapOf([day('gym-splits-power-upper'), day('gym-splits-power-lower', 'heavy-lower')]);
  const suggested = suggestReplacement(upperFlow(), upper, today);
  assert.equal(suggested.where.kind, 'replace');
  if (suggested.where.kind === 'replace') assert.equal(suggested.where.flowId, 'gym-splits-power-upper');
  assert.match(suggested.reason, /Both train chest/);
  const legs = mapOf([day('gym-splits-power-lower', 'heavy-lower')]);
  const added = suggestReplacement(upperFlow(), legs, today);
  assert.equal(added.where.kind, 'add');
  assert.match(added.reason, /same areas/);
  if (added.where.kind === 'add') assert.match(added.where.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('a snapshot keeps the public shape and drops weights, logs and body weight', () => {
  const shot = publicSnapshot(upperFlow());
  const text = JSON.stringify(shot);
  assert.equal(text.includes('"weightKg"'), false);
  assert.equal(text.includes('"logs"'), false);
  assert.equal(text.includes('"bodyWeightKg"'), false);
  assert.equal(text.includes('"ticks"'), false);
  assert.equal(shot.fromName, 'q_ava');
  assert.equal(shot.items[0]?.exerciseId, 'dumbbell-bench-press');
  assert.equal(shot.items[0]?.sets, 4);
  assert.deepEqual(shot.changes.order, ['dumbbell-bench-press', 'incline-dumbbell-press']);
  const plan = followPlan({
    theirFlow: upperFlow(),
    myMapFlow: mapOf([day('gym-splits-power-upper')]),
    where: { kind: 'replace', flowId: 'gym-splits-power-upper' },
    sessions: 4,
    after: 'return',
    today,
  });
  assert.equal(plan.kind, 'series');
  if (plan.kind !== 'series') return;
  assert.equal(plan.pause?.flowId, 'gym-splits-power-upper');
  assert.equal(plan.dates.length, 4);
  assert.equal(JSON.stringify(plan).includes('"weightKg"'), false);
});

test('a shared Daily flow is one day, and a Map flow copies into a free slot', () => {
  const daily = followPlan({
    theirFlow: { ...upperFlow(), kind: 'daily' },
    myMapFlow: mapOf([day('gym-splits-power-upper')]),
    where: { kind: 'replace', flowId: 'gym-splits-power-upper' },
    sessions: 4,
    after: 'return',
    today,
  });
  assert.equal(daily.kind, 'series');
  if (daily.kind === 'series') {
    assert.equal(daily.sessions, 1);
    assert.equal(daily.dates.length, 1);
  }
  const copied = followPlan({
    theirFlow: {
      title: 'Upper and lower',
      fromName: 'q_ava',
      kind: 'map',
      map: {
        name: 'Upper and lower',
        styleId: 'body-part',
        purposeIds: ['gain-muscle'],
        repeat: 'in-turn',
        weightKg: 80,
        logs: ['no'],
        days: [{ name: 'Upper', effort: 'upper', flows: [{ kind: 'flow', id: 'gym-splits-size-upper', weightKg: 40, logs: [1] }], items: [] }],
      },
    },
    myMapFlow: null,
    where: { kind: 'add', date: today },
    sessions: 4,
    after: 'keep',
    today,
    slots: [{ slot: 1 }, { slot: 2 }],
  });
  assert.equal(copied.kind, 'map');
  if (copied.kind !== 'map') return;
  assert.equal(copied.slot, 3);
  assert.equal(JSON.stringify(copied.source).includes('"weightKg"'), false);
  assert.equal(JSON.stringify(copied.source).includes('"logs"'), false);
});

test('each finished session counts down, then the pause lifts or the flow is kept', () => {
  const open = record();
  const once = nextFollowState(open, ['2026-11-16']);
  assert.equal(once.status, 'active');
  assert.equal(sessionsLeft(once), 3);
  assert.deepEqual(once.finishedDates, ['2026-11-16']);
  const back = nextFollowState({ ...once, sessionsTotal: 1, dates: ['2026-11-16'] }, ['2026-11-16']);
  assert.equal(back.status, 'returned');
  assert.equal(sessionsLeft(back), 0);
  assert.match(back.reviewLine ?? '', /Power upper is back/);
  assert.match(back.reviewLine ?? '', /q_ava/);
  const kept = nextFollowState({ ...open, sessionsTotal: 1, dates: ['2026-11-16'], after: 'keep' }, ['2026-11-16']);
  assert.equal(kept.status, 'kept');
  assert.equal(kept.reviewLine, null);
  const custom = keptCustomflow(kept, '2026-11-16T12:00:00.000Z');
  assert.equal(custom?.fromName, 'q_ava');
  assert.deepEqual(custom?.changes.order, ['dumbbell-bench-press']);
  assert.equal(JSON.stringify(custom).includes('"weightKg"'), false);
  const early = stoppedFollow(once);
  assert.equal(early.status, 'stopped');
  assert.equal(followShowsOn(early, '2026-11-16'), true);
  assert.equal(followShowsOn(early, '2026-11-17'), false);
  assert.equal(followShowsOn(back, '2026-11-17'), false);
  assert.equal(followShowsOn(kept, '2026-11-17'), true);
});

test('days before the trial keep their flow, and a stopped trial does not rewrite the rest', () => {
  const follow = record({ sessionsTotal: 1, dates: ['2026-11-16'], finishedDates: ['2026-11-16'], status: 'returned' });
  const rows = [
    occurrence('2026-11-10', 'gym-splits-power-upper', 'done'),
    occurrence('2026-11-16', 'gym-splits-power-upper'),
    occurrence('2026-11-17', 'gym-splits-power-upper'),
  ];
  const shown = applyFollowOccurrences(rows, [follow], [{ itemKind: 'flow', itemId: 'gym-splits-size-upper', date: '2026-11-16' }], '2026-11-10', '2026-11-17');
  const on = (date: string) => shown.find(row => row.date === date);
  assert.equal(on('2026-11-10')?.itemId, 'gym-splits-power-upper');
  assert.equal(on('2026-11-10')?.status, 'done');
  assert.equal(on('2026-11-16')?.itemId, 'gym-splits-size-upper');
  assert.equal(on('2026-11-16')?.status, 'done');
  assert.equal(on('2026-11-17')?.itemId, 'gym-splits-power-upper');
});
