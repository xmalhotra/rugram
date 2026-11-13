import assert from 'node:assert/strict';
import test from 'node:test';
import { areaPicture, bodyFlow, muscleSetWeights, type LoggedSet } from '../shared/body-flow';
import { customflowKey, type Customflow, type Customflows } from '../shared/customflows';
import { targetBand } from '../shared/focus-targets';
import { addCalendarDays, calendarWeekday, type FlowSeries } from '../shared/flow-series';
import { gymFlowById } from '../shared/gym-flows';
import { focusLevelFor } from '../shared/member-level';
import { muscleAreas, type MuscleArea } from '../shared/muscle-map';
import { flowLevelOf, memberGymItems } from '../shared/priority-finisher';
import {
  comparePredictions,
  planAddingFlow,
  planFromSeries,
  predictBodyFlow,
  type BodyPlan,
  type PlannedFlow,
  type PredictionMember,
} from '../shared/predicted-body-flow';

const member: PredictionMember = { level: 'Intermediate' };

const threeDay: BodyPlan = {
  days: [
    { flows: [{ id: 'gym-splits-push', kind: 'flow' }] },
    { flows: [{ id: 'gym-splits-pull', kind: 'flow' }] },
    { flows: [{ id: 'gym-splits-legs', kind: 'flow' }] },
  ],
};

function stateOf(rows: { area: MuscleArea; state: string }[], area: MuscleArea) {
  return rows.find(row => row.area === area)?.state;
}

function stepOf(rows: { area: MuscleArea; step: number }[], area: MuscleArea) {
  return rows.find(row => row.area === area)?.step;
}

/** What logging exactly these planned sets would paint, over the same number of days. */
function loggedFigure(plan: BodyPlan, who: PredictionMember) {
  const sets: LoggedSet[] = [];
  const date = '2026-11-02';
  for (const day of plan.days) {
    for (const flow of day.flows) {
      const gym = flow.kind === 'flow' ? gymFlowById(flow.id) : undefined;
      const items = gym
        ? memberGymItems(gym.items, who.priorities ?? [], flowLevelOf(gym.level), who.customflows?.[customflowKey('qram-flow', flow.id)])
        : (flow.items ?? []);
      for (const item of items) {
        for (let index = 0; index < item.sets; index += 1) sets.push({ date, exerciseId: item.exerciseId });
      }
    }
  }
  const from = date;
  const to = plan.days.length ? addCalendarDays(from, plan.days.length - 1) : from;
  const result = bodyFlow(sets, [], { from, to });
  const level = focusLevelFor(who.level);
  return result.areas.map(area => {
    const picture = areaPicture({
      sets: area.sets,
      band: targetBand(area.area, level),
      weeks: result.weeks,
      planned: false,
      priority: false,
    });
    return { area: area.area, state: picture.state, step: picture.step };
  });
}

test('one set weights are shared by logged and planned work', () => {
  assert.deepEqual(muscleSetWeights('barbell-bench-press'), [
    { area: 'chest', main: 1, helper: 0 },
    { area: 'front-delts', main: 0, helper: 0.5 },
    { area: 'triceps', main: 0, helper: 0.5 },
  ]);
  assert.deepEqual(muscleSetWeights('stationary-bike'), []);
  assert.deepEqual(muscleSetWeights('ankle-circles'), []);
});

test('a three-day plan lights the areas those flows train, and never marks missed', () => {
  const picture = predictBodyFlow(threeDay, member);
  const worked = picture.filter(row => row.state === 'worked').map(row => row.area);
  assert.deepEqual(worked, [
    'traps',
    'front-delts',
    'side-delts',
    'rear-delts',
    'upper-chest',
    'chest',
    'lats',
    'mid-back',
    'lower-back',
    'biceps',
    'triceps',
    'forearms',
    'lower-abs',
    'hip-flexors',
    'glutes',
    'quads',
    'hamstrings',
  ]);
  assert.equal(stateOf(picture, 'calves'), 'quiet');
  assert.equal(stateOf(picture, 'neck'), 'quiet');
  assert.equal(stepOf(picture, 'chest'), 1);
  assert.equal(stepOf(picture, 'quads'), 2);
  assert.ok(picture.every(row => row.state !== 'missed'));
});

test('a swap changes the picture', () => {
  const custom: Customflow = {
    source: { kind: 'qram-flow', id: 'gym-splits-legs', version: null },
    changes: { swaps: { 'lying-leg-curl': 'standing-calf-raise' } },
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
  const customflows: Customflows = { [customflowKey('qram-flow', 'gym-splits-legs')]: custom };
  const swapped = predictBodyFlow(threeDay, { ...member, customflows });
  const plain = predictBodyFlow(threeDay, member);
  assert.equal(stateOf(plain, 'calves'), 'quiet');
  assert.equal(stateOf(swapped, 'calves'), 'worked');
  assert.equal(stateOf(swapped, 'hamstrings'), 'worked');
  assert.ok(comparePredictions(plain, swapped).includes('Adds calves'));
  assert.notDeepEqual(plain, swapped);
});

test('a priority finisher lights an area the written flow leaves quiet', () => {
  const picture = predictBodyFlow(threeDay, { ...member, priorities: ['calves'] });
  assert.equal(stateOf(picture, 'calves'), 'worked');
  assert.equal(stateOf(picture, 'neck'), 'quiet');
  assert.ok(picture.every(row => row.state !== 'missed'));
});

test('removing the only leg day marks legs missed in the comparison', () => {
  const withoutLegs: BodyPlan = { days: threeDay.days.slice(0, 2) };
  const lines = comparePredictions(predictBodyFlow(threeDay, member), predictBodyFlow(withoutLegs, member));
  assert.ok(lines.includes('Legs are missed'));
  assert.equal(lines.includes('Quads are no longer covered'), false);
  assert.ok(lines.includes('Core is missed'));
});

test('an empty plan is all quiet', () => {
  const empty = predictBodyFlow({ days: [] }, { level: 'Beginner' });
  assert.equal(empty.length, muscleAreas.length);
  assert.ok(empty.every(row => row.state === 'quiet' && row.step === 0));
  const rest: BodyPlan = { days: [{ flows: [] }, { flows: [] }, { flows: [] }] };
  assert.ok(predictBodyFlow(rest, { level: 'Beginner' }).every(row => row.state === 'quiet'));
  const conditioning: PlannedFlow = {
    id: 'bike-day',
    kind: 'flow',
    items: [
      { exerciseId: 'stationary-bike', sets: 8 },
      { exerciseId: 'ankle-circles', sets: 3 },
    ],
  };
  assert.ok(predictBodyFlow({ days: [{ flows: [conditioning] }] }, member).every(row => row.state === 'quiet'));
});

test('prediction for a plan equals the actual figure after logging exactly that plan', () => {
  assert.deepEqual(predictBodyFlow(threeDay, member), loggedFigure(threeDay, member));
  const customflows: Customflows = {
    [customflowKey('qram-flow', 'gym-splits-legs')]: {
      source: { kind: 'qram-flow', id: 'gym-splits-legs', version: null },
      changes: { swaps: { 'lying-leg-curl': 'standing-calf-raise' } },
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
  };
  const swapped: PredictionMember = { ...member, customflows, priorities: ['calves'] };
  assert.deepEqual(predictBodyFlow(threeDay, swapped), loggedFigure(threeDay, swapped));
  const nine: BodyPlan = {
    days: [
      { flows: [{ id: 'press-day', kind: 'flow', items: [{ exerciseId: 'barbell-bench-press', sets: 7 }] }] },
      ...Array.from({ length: 8 }, () => ({ flows: [] })),
    ],
  };
  const ninePicture = predictBodyFlow(nine, { level: 'Beginner' });
  assert.equal(stepOf(ninePicture, 'chest'), 1);
  assert.deepEqual(ninePicture, loggedFigure(nine, { level: 'Beginner' }));
  assert.deepEqual(predictBodyFlow({ days: [] }, { level: 'Beginner' }), loggedFigure({ days: [] }, { level: 'Beginner' }));
});

test('one area dropping out says it is no longer covered', () => {
  const withCalves: BodyPlan = {
    days: [
      {
        flows: [
          {
            id: 'legs',
            kind: 'flow',
            items: [
              { exerciseId: 'barbell-back-squat', sets: 4 },
              { exerciseId: 'standing-calf-raise', sets: 3 },
            ],
          },
        ],
      },
    ],
  };
  const squatOnly: BodyPlan = {
    days: [{ flows: [{ id: 'legs', kind: 'flow', items: [{ exerciseId: 'barbell-back-squat', sets: 4 }] }] }],
  };
  const lines = comparePredictions(predictBodyFlow(withCalves, member), predictBodyFlow(squatOnly, member));
  assert.ok(lines.includes('Calves are no longer covered'));
  assert.equal(lines.includes('Legs are missed'), false);
  const added = comparePredictions(predictBodyFlow(squatOnly, member), predictBodyFlow(withCalves, member));
  assert.ok(added.includes('Adds calves'));
});

function series(id: string, itemId: string, days: number[]): FlowSeries {
  return {
    id,
    itemKind: 'flow',
    itemId,
    start: '2026-11-02',
    time: { checkpoint: 'Morning' },
    recurrence: { kind: 'weekly', every: 1, days },
    end: { kind: 'never' },
    createdAt: '2026-11-01T00:00:00.000Z',
  };
}

test('a weekly pattern becomes one pass with rest days, and a new flow lands on the first rest day', () => {
  assert.equal(calendarWeekday('2026-11-02'), 1);
  const list = [
    series('push', 'gym-splits-push', [1]),
    series('pull', 'gym-splits-pull', [3]),
    series('legs', 'gym-splits-legs', [5]),
  ];
  const plan = planFromSeries(list, '2026-11-02');
  assert.equal(plan.days.length, 7);
  assert.deepEqual(plan.days.map(day => day.flows.map(flow => flow.id)), [
    ['gym-splits-push'],
    [],
    ['gym-splits-pull'],
    [],
    ['gym-splits-legs'],
    [],
    [],
  ]);
  const added = planAddingFlow(plan, { id: 'gym-core-dead-bug-and-plank', kind: 'flow' });
  assert.equal(added.days.length, 7);
  assert.deepEqual(added.days[1]?.flows.map(flow => flow.id), ['gym-core-dead-bug-and-plank']);
  const without = planFromSeries(list.filter(item => item.id !== 'legs'), '2026-11-02');
  assert.ok(comparePredictions(predictBodyFlow(plan, member), predictBodyFlow(without, member)).includes('Legs are missed'));
});
