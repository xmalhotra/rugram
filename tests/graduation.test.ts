import assert from 'node:assert/strict';
import test from 'node:test';
import { alternativeScore } from '../shared/exercise-alternatives';
import { exerciseRestClass } from '../shared/exercise-rest';
import { exercise } from '../shared/exercises';
import type { CatalogFlow, CatalogProgramme } from '../shared/flow-catalog';
import {
  assessGraduation,
  harderVariation,
  nextFlowStep,
  routineSwitchPlan,
  routineSwitchStart,
  weightReadyLine,
  type GraduationItem,
  type GraduationSession,
  type GraduationSet,
} from '../shared/graduation';
import { gymFlowById } from '../shared/gym-flows';
import { exerciseMuscles } from '../shared/muscle-map';

const now = Date.parse('2026-11-12T12:00:00.000Z');
const day = 24 * 60 * 60 * 1000;

function at(daysAgo: number) {
  return new Date(now - daysAgo * day).toISOString();
}

function item(exerciseId: string, sets: number, min: number, max: number): GraduationItem {
  return { exerciseId, sets, repsMin: min, repsMax: max };
}

function topped(exerciseId: string, sets: number, reps: number, patch?: Partial<GraduationSet>): GraduationSession['sets'] {
  return Array.from({ length: sets }, (_, index) => ({
    exerciseId,
    set: { setIndex: index + 1, reps, durationSeconds: null, ...patch },
  }));
}

function sessions(daysAgo: number[], rows: GraduationSession['sets']): GraduationSession[] {
  return daysAgo.map(days => ({ finishedAt: at(days), sets: rows }));
}

const curl = item('barbell-curl', 3, 6, 8);
const row = item('chest-supported-dumbbell-row', 3, 10, 12);
const press = item('push-up', 2, 8, 10);

test('a flow is ready after three sessions when 70% of exercises hit the top twice', () => {
  const result = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl, row],
    sessions: sessions([1, 8, 20], [...topped('barbell-curl', 3, 8), ...topped('chest-supported-dumbbell-row', 3, 12)]),
    now,
  });
  assert.equal(result.ready, true);
  assert.deepEqual(result.exercisesReady, ['barbell-curl', 'chest-supported-dumbbell-row']);
  assert.equal(result.reason, 'Top of the range on 2 of 2 exercises, 3 sessions running');
  assert.deepEqual(result.next, {
    flowId: 'gym-back-pull-up-and-row-day',
    title: 'Pull-up and row day',
    level: 'Intermediate',
  });
  assert.deepEqual(result.variations, []);
});

test('two sessions, a short set, a failure, or a skipped set is not mastery', () => {
  const once = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1], topped('barbell-curl', 3, 8)),
    now,
  });
  assert.equal(once.ready, false);
  assert.deepEqual(once.exercisesReady, []);
  assert.equal(once.reason, '1 finished session in the last 6 weeks');

  const short = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1, 8, 15], topped('barbell-curl', 3, 7)),
    now,
  });
  assert.equal(short.ready, false);
  assert.equal(short.reason, '3 finished sessions in the last 6 weeks');

  const failed = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1, 8], topped('barbell-curl', 3, 8, { repsInReserve: 0 })),
    now,
  });
  assert.deepEqual(failed.exercisesReady, []);

  const skipped = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1, 8], topped('barbell-curl', 3, 8, { status: 'skipped' })),
    now,
  });
  assert.deepEqual(skipped.exercisesReady, []);

  const fewer = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1, 8], topped('barbell-curl', 2, 8)),
    now,
  });
  assert.deepEqual(fewer.exercisesReady, ['barbell-curl']);

  const extraShort = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1, 8], [...topped('barbell-curl', 3, 8), ...topped('barbell-curl', 1, 6)]),
    now,
  });
  assert.deepEqual(extraShort.exercisesReady, []);

  const slipped = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: [
      ...sessions([8, 15], topped('barbell-curl', 3, 8)),
      { finishedAt: at(1), sets: topped('barbell-curl', 3, 6) },
    ],
    now,
  });
  assert.deepEqual(slipped.exercisesReady, []);
});

test('70% is the line, a hold uses seconds, and a max set has no top', () => {
  const twoOfThree = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl, row, press],
    sessions: sessions([1, 8, 15], [...topped('barbell-curl', 3, 8), ...topped('chest-supported-dumbbell-row', 3, 12), ...topped('push-up', 2, 8)]),
    now,
  });
  assert.equal(twoOfThree.ready, false);
  assert.equal(twoOfThree.reason, 'Top of the range on 2 of 3 exercises');
  assert.equal(weightReadyLine(twoOfThree.exercisesReady), 'Ready to add weight on Barbell Curl and Chest-Supported Dumbbell Row');

  const hold = item('superman-hold', 2, 30, 40);
  hold.target = { kind: 'hold', minSeconds: 30, maxSeconds: 40 };
  const held = assessGraduation({
    flowId: 'cal-upper-beginner',
    items: [hold],
    sessions: [1, 8, 15].map(days => ({
      finishedAt: at(days),
      sets: [1, 2].map(setIndex => ({
        exerciseId: 'superman-hold',
        set: { setIndex, reps: null, durationSeconds: 40 },
      })),
    })),
    now,
  });
  assert.equal(held.ready, true);

  const maxed = assessGraduation({
    flowId: 'cal-upper-beginner',
    items: [{ exerciseId: 'seated-leg-lift', sets: 2, repsMin: 1, repsMax: 1, target: { kind: 'max', measure: 'reps' } }],
    sessions: [1, 8, 15].map(days => ({
      finishedAt: at(days),
      sets: [1, 2].map(setIndex => ({
        exerciseId: 'seated-leg-lift',
        set: { setIndex, reps: 30, durationSeconds: null },
      })),
    })),
    now,
  });
  assert.equal(maxed.ready, false);
  assert.deepEqual(maxed.exercisesReady, []);
});

test('the third session has to fall inside six weeks', () => {
  const inside = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: sessions([1, 8, 42], topped('barbell-curl', 3, 8)),
    now,
  });
  assert.equal(inside.ready, true);

  const outside = assessGraduation({
    flowId: 'gym-back-chest-supported-row',
    items: [curl],
    sessions: [
      ...sessions([1, 8], topped('barbell-curl', 3, 8)),
      { finishedAt: new Date(now - 42 * day - 1).toISOString(), sets: topped('barbell-curl', 3, 8) },
    ],
    now,
  });
  assert.equal(outside.ready, false);
  assert.deepEqual(outside.exercisesReady, ['barbell-curl']);
});

test('a split day moves to the matching day of a heavier programme, and nowhere when there is not one', () => {
  const real = assessGraduation({
    flowId: 'gym-splits-upper-a',
    items: [press],
    sessions: sessions([1, 8, 15], topped('push-up', 2, 10)),
    now,
  });
  assert.equal(real.ready, true);
  assert.equal(real.next, null);

  const light: CatalogFlow = {
    id: 'gym-splits-upper-a',
    title: 'Upper A',
    tileId: 'gym-splits',
    level: 'Beginner',
    tags: [],
    status: 'live',
    flowId: 'gym-splits-upper-a',
  };
  const heavy: CatalogFlow = {
    id: 'gym-splits-power-upper',
    title: 'Upper A',
    tileId: 'gym-splits',
    level: 'Intermediate',
    tags: [],
    status: 'live',
    flowId: 'gym-splits-power-upper',
  };
  const programmes: CatalogProgramme[] = [
    { id: 'light', title: 'Light', tileId: 'gym-splits', level: 'Beginner', days: ['gym-splits-upper-a'] },
    { id: 'heavy', title: 'Heavy', tileId: 'gym-splits', level: 'Intermediate', days: ['gym-splits-power-upper'] },
  ];
  assert.ok(gymFlowById('gym-splits-power-upper')?.items.length);
  const moved = assessGraduation(
    {
      flowId: 'gym-splits-upper-a',
      items: [press],
      sessions: sessions([1, 8, 15], topped('push-up', 2, 10)),
      now,
    },
    { flows: [light, heavy], programmes },
  );
  assert.deepEqual(moved.next, { flowId: 'gym-splits-power-upper', title: 'Upper A', level: 'Intermediate' });
});

test('an advanced flow suggests a harder variation instead of a higher level', () => {
  assert.equal(harderVariation('barbell-curl'), null);
  const push = harderVariation('push-up');
  assert.ok(push);
  const from = exercise('push-up');
  const to = exercise(push.exerciseId);
  assert.ok(from && to);
  assert.equal(exerciseMuscles['push-up']?.main[0], exerciseMuscles[push.exerciseId]?.main[0]);
  const restUp = restRank(push.exerciseId) > restRank('push-up');
  const loadUp = loadRank(to.load) > loadRank(from.load);
  assert.ok(restUp || loadUp);
  assert.ok(restRank(push.exerciseId) >= restRank('push-up'));
  assert.ok(loadRank(to.load) >= loadRank(from.load));
  const score = alternativeScore('push-up', push.exerciseId);
  assert.ok(score != null);

  const advanced: CatalogFlow = {
    id: 'adv-push',
    title: 'Push',
    tileId: 'gym-chest',
    level: 'Advanced',
    tags: [],
    status: 'live',
    flowId: 'adv-push',
  };
  const result = assessGraduation(
    {
      flowId: 'adv-push',
      items: [press],
      sessions: sessions([1, 8, 15], topped('push-up', 2, 10)),
      now,
    },
    { flows: [advanced], programmes: [] },
  );
  assert.equal(result.ready, true);
  assert.equal(result.next, null);
  assert.equal(nextFlowStep('adv-push', { flows: [advanced], programmes: [] }), null);
  assert.equal(result.variations[0]?.exerciseId, 'push-up');
  assert.equal(result.variations[0]?.nextId, push.exerciseId);
  assert.match(result.reason, /Top of the range on 1 of 1 exercises, 3 sessions running/);
});

test('the routine switch keeps the scheduled day and starts on the next occurrence', () => {
  assert.deepEqual(
    routineSwitchStart(
      [
        { seriesId: 'older', itemKind: 'flow', itemId: 'gym-back', date: '2026-11-09', original: '2026-11-09' },
        { seriesId: 'next', itemKind: 'flow', itemId: 'gym-back', date: '2026-11-17', original: '2026-11-16' },
        { seriesId: 'later', itemKind: 'flow', itemId: 'gym-back', date: '2026-11-23', original: '2026-11-23' },
      ],
      'gym-back',
      '2026-11-12',
    ),
    { seriesId: 'next', start: '2026-11-16' },
  );
  assert.deepEqual(
    routineSwitchStart(
      [{ seriesId: 'moved', itemKind: 'flow', itemId: 'gym-back', date: '2026-11-13', original: '2026-11-10' }],
      'gym-back',
      '2026-11-12',
    ),
    { seriesId: 'moved', start: '2026-11-13' },
  );
  assert.equal(routineSwitchStart([], 'gym-back', '2026-11-12'), null);
  assert.equal(weightReadyLine(['barbell-curl']), 'Ready to add weight on Barbell Curl');
});

function restRank(id: string) {
  const order = ['mobility', 'conditioning', 'core', 'isolation', 'compound', 'heavy-compound'];
  return order.indexOf(exerciseRestClass[id] ?? 'compound');
}

function loadRank(load: string) {
  return ['assisted', 'bodyweight', 'weight'].indexOf(load);
}

test('switching a routine keeps the old flow\'s past days and carries the repeat on', () => {
  const series = {
    id: '6b64695d-333b-46e3-b0d2-829d2f376b0a',
    itemKind: 'flow' as const,
    itemId: 'gym-arms-beginner',
    start: '2026-11-02',
    time: { checkpoint: 'Morning' as const, at: '06:30' },
    recurrence: { kind: 'weekly' as const, every: 1, days: [1] },
    end: { kind: 'after' as const, count: 8 },
    createdAt: '2026-11-01T00:00:00.000Z',
  };
  const plan = routineSwitchPlan(series, '2026-11-23', 'gym-arms-intermediate');
  assert.equal(plan.kind, 'split');
  if (plan.kind !== 'split') return;
  // The old series stops the day before, so 2, 9 and 16 Nov stay on the calendar.
  assert.deepEqual(plan.endOld, { kind: 'on', date: '2026-11-22' });
  assert.equal(plan.create.itemId, 'gym-arms-intermediate');
  assert.equal(plan.create.start, '2026-11-23');
  assert.deepEqual(plan.create.time, series.time);
  assert.deepEqual(plan.create.recurrence, series.recurrence);
  // Three of the eight are used, so five remain.
  assert.deepEqual(plan.create.end, { kind: 'after', count: 5 });
});

test('a series with nothing before the switch, or a once-only one, is just pointed at the new flow', () => {
  const base = {
    id: '6b64695d-333b-46e3-b0d2-829d2f376b0a',
    itemKind: 'flow' as const,
    itemId: 'gym-arms-beginner',
    time: { checkpoint: 'Morning' as const },
    end: { kind: 'never' as const },
    createdAt: '2026-11-01T00:00:00.000Z',
  };
  assert.deepEqual(routineSwitchPlan({ ...base, start: '2026-11-23', recurrence: { kind: 'weekly', every: 1, days: [1] } }, '2026-11-23', 'x'), {
    kind: 'retarget',
    seriesId: base.id,
    itemId: 'x',
  });
  assert.equal(routineSwitchPlan({ ...base, start: '2026-11-02', recurrence: { kind: 'once' } }, '2026-11-23', 'x').kind, 'retarget');
});

test('a harder variation is a standard free-weight step up, never a band or a different kind of lift', () => {
  assert.equal(harderVariation('push-up')?.exerciseId, 'barbell-bench-press');
  assert.equal(harderVariation('dumbbell-goblet-squat')?.exerciseId, 'barbell-back-squat');
  assert.equal(harderVariation('machine-biceps-curl')?.exerciseId, 'barbell-curl');
  assert.equal(harderVariation('cable-lateral-raise')?.exerciseId, 'dumbbell-lateral-raise');
  // A single-joint exercise with no harder single-joint version says nothing rather than naming a press.
  assert.equal(harderVariation('dumbbell-lateral-raise'), null);
  for (const id of ['push-up', 'leg-press', 'machine-seated-row', 'rope-pushdown']) {
    const next = harderVariation(id);
    assert.ok(next);
    assert.notEqual(exercise(next.exerciseId)?.equipment, 'band');
  }
});
