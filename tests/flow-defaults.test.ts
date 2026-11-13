import assert from 'node:assert/strict';
import test from 'node:test';
import { checkMetric } from '../shared/personal-metrics';
import {
  benchOfDeadlift,
  defaultFlowView,
  equipmentForExercise,
  exercisesPlaceLabel,
  flowEquipment,
  placeMismatchLabel,
  goalsForCatalogFlow,
  goalsFromFocus,
  memberLevel,
  sessionFacts,
  squatOfDeadlift,
  type FlowFacts,
  type FlowMember,
} from '../shared/flow-defaults';
import { catalogFlows, flowsInTile, tilesInSection } from '../shared/flow-catalog';
import { gymEstimatedMinutes, gymFlowById } from '../shared/gym-flows';
import type { MuscleArea } from '../shared/muscle-map';

const levelRank = { Beginner: 0, Intermediate: 1, Advanced: 2 } as const;

function flow(
  id: string,
  extra: Partial<FlowFacts> & Pick<FlowFacts, 'level'>,
): FlowFacts & { id: string } {
  return {
    id,
    goals: ['size'],
    equipment: 'gym',
    minutes: 40,
    areas: ['chest'],
    ...extra,
  };
}

test('member level uses the strongest signal, and weeks are a floor', () => {
  assert.deepEqual(memberLevel({ loggedWeeks: 9, lifts: {} }), {
    level: 'Intermediate',
    reason: 'More than 8 weeks of training',
  });
  assert.equal(memberLevel({ loggedWeeks: 8, lifts: {} }).level, 'Beginner');
  assert.deepEqual(memberLevel({ loggedWeeks: 9, lifts: { deadliftKg: 160 }, bodyKg: 80 }), {
    level: 'Advanced',
    reason: 'Deadlift is 2× body weight',
  });
  assert.equal(
    memberLevel({ loggedWeeks: 9, lifts: { deadliftKg: 100 }, bodyKg: 80, lifestyle: 'sedentary' }).reason,
    'More than 8 weeks of training',
  );
  assert.deepEqual(memberLevel({ loggedWeeks: 0, lifts: { deadliftKg: 160 }, bodyKg: 80 }), {
    level: 'Advanced',
    reason: 'Deadlift is 2× body weight',
  });
  assert.deepEqual(memberLevel({ loggedWeeks: 0, lifts: { deadliftKg: 120 }, bodyKg: 80 }), {
    level: 'Intermediate',
    reason: 'Deadlift is 1.5× body weight',
  });
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: { deadliftKg: 119 }, bodyKg: 80 }).level, 'Beginner');
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: { deadliftKg: 200 } }).level, 'Beginner');
});

test('squat and bench stand in for a deadlift, and a known deadlift wins', () => {
  assert.equal(squatOfDeadlift, 0.85);
  assert.equal(benchOfDeadlift, 0.53);
  const body = 80;
  assert.equal(
    memberLevel({ loggedWeeks: 0, lifts: { squatKg: 160 * squatOfDeadlift }, bodyKg: body }).level,
    'Advanced',
  );
  assert.equal(
    memberLevel({ loggedWeeks: 0, lifts: { benchKg: 120 * benchOfDeadlift }, bodyKg: body }).reason,
    'Bench works out to a deadlift of 1.5× body weight',
  );
  assert.equal(
    memberLevel({
      loggedWeeks: 0,
      lifts: { squatKg: 120 * squatOfDeadlift, benchKg: 160 * benchOfDeadlift },
      bodyKg: body,
    }).reason,
    'Bench works out to a deadlift of 2× body weight',
  );
  assert.equal(
    memberLevel({ loggedWeeks: 0, lifts: { deadliftKg: 100, squatKg: 160 * squatOfDeadlift }, bodyKg: body }).level,
    'Beginner',
  );
});

test('a quiet lifestyle means beginner, and anything else with no signal does too', () => {
  assert.deepEqual(memberLevel({ loggedWeeks: 0, lifts: {}, lifestyle: 'sedentary' }), {
    level: 'Beginner',
    reason: 'Mostly sitting',
  });
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, lifestyle: 'light' }).reason, 'Lightly active');
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, lifestyle: 'active' }).reason, 'Starting out');
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, lifestyle: 'athlete' }).level, 'Beginner');
  assert.equal(memberLevel({ loggedWeeks: 2, lifts: {}, bodyKg: 80 }).reason, 'Starting out');
});

test('focus picks map onto goal tags, and every gym catalogue flow is tagged', () => {
  assert.deepEqual(goalsFromFocus(['workout']), ['strength', 'size']);
  assert.deepEqual(goalsFromFocus(['running']), ['fitness']);
  assert.deepEqual(goalsFromFocus(['hyrox']), ['strength', 'fitness']);
  assert.deepEqual(goalsFromFocus(['sleep', 'coding', 'nutrition']), []);
  assert.deepEqual(goalsFromFocus(['running', 'workout']), ['strength', 'size', 'fitness']);
  const gymTiles = new Set(tilesInSection('gym').map(tile => tile.id));
  const gym = catalogFlows.filter(item => gymTiles.has(item.tileId));
  assert.ok(gym.length > 0);
  for (const item of gym) {
    assert.deepEqual(item.goals, goalsForCatalogFlow(item), item.id);
    assert.ok(item.goals && item.goals.length > 0, item.id);
    const session = gymFlowById(item.flowId ?? '');
    assert.ok(session && session.items.length > 0, item.id);
    const facts = sessionFacts({
      id: item.id,
      level: item.level,
      goals: item.goals ?? [],
      items: session.items,
    });
    assert.ok(facts.minutes > 0, item.id);
    assert.ok(facts.areas.length > 0, item.id);
    assert.equal(facts.minutes, gymEstimatedMinutes(session));
    assert.ok(['gym', 'dumbbells', 'bodyweight'].includes(facts.equipment));
  }
  assert.deepEqual(goalsForCatalogFlow({ id: 'gym-splits-power-upper', title: 'Power upper', tileId: 'gym-splits' }), [
    'strength',
  ]);
  assert.deepEqual(goalsForCatalogFlow({ id: 'gym-splits-size-lower', title: 'Size lower', tileId: 'gym-splits' }), [
    'size',
  ]);
  assert.deepEqual(
    goalsForCatalogFlow({
      id: 'gym-splits-strength-conditioning',
      title: 'Strength + conditioning',
      tileId: 'gym-splits',
    }),
    ['strength', 'fitness'],
  );
  assert.deepEqual(
    goalsForCatalogFlow({ id: 'gym-full-beginner-day-1', title: 'Day 1', tileId: 'gym-full' }),
    ['strength', 'size', 'fitness'],
  );
});

test('equipment comes from the exercises, and the most demanding piece wins', () => {
  assert.equal(equipmentForExercise('barbell-bench-press'), 'gym');
  assert.equal(equipmentForExercise('dumbbell-bench-press'), 'dumbbells');
  assert.equal(equipmentForExercise('push-up'), 'bodyweight');
  assert.equal(flowEquipment(['push-up', 'dumbbell-bench-press']), 'dumbbells');
  assert.equal(flowEquipment(['dumbbell-bench-press', 'barbell-bench-press']), 'gym');
  assert.equal(flowEquipment([]), 'gym');
});

test('an intermediate member does not see beginner flows, and higher levels follow their own', () => {
  const viewed = defaultFlowView(
    [
      flow('beg', { level: 'Beginner' }),
      flow('mid', { level: 'Intermediate', areas: ['chest'] }),
      flow('adv', { level: 'Advanced', minutes: 55 }),
    ],
    { level: 'Intermediate', minutes: 45 },
  );
  assert.deepEqual(
    viewed.map(item => item.id),
    ['mid', 'adv'],
  );
  assert.deepEqual(viewed[1].labels, ['Advanced · next level', '55 min']);
  assert.equal(viewed[0].labels.length, 0);
  const back = defaultFlowView(tileFacts('gym-back'), { level: 'Intermediate' });
  assert.ok(back.every(item => item.level !== 'Beginner'));
  assert.equal(back[0].level, 'Intermediate');
  assert.equal(back.at(-1)?.level, 'Advanced');
  assert.ok(back.at(-1)?.labels.includes('Advanced · next level'));
});

test('a beginner sees higher levels labelled, and an advanced member has outgrown both lower levels', () => {
  const viewed = defaultFlowView(
    [flow('b', { level: 'Beginner' }), flow('i', { level: 'Intermediate' }), flow('a', { level: 'Advanced' })],
    { level: 'Beginner' },
  );
  assert.deepEqual(
    viewed.map(item => [item.id, item.labels[0]]),
    [
      ['b', undefined],
      ['i', 'Intermediate · next level'],
      ['a', 'Advanced · two levels up'],
    ],
  );
  const advanced = defaultFlowView(
    [flow('b', { level: 'Beginner' }), flow('i', { level: 'Intermediate' }), flow('a', { level: 'Advanced' })],
    { level: 'Advanced' },
  );
  assert.deepEqual(
    advanced.map(item => item.id),
    ['a'],
  );
});

test('goals hide a flow that matches none of them, and no goals hides nothing', () => {
  const flows = [
    flow('size', { level: 'Intermediate', goals: ['size'] }),
    flow('fit', { level: 'Intermediate', goals: ['fitness'] }),
    flow('both', { level: 'Intermediate', goals: ['strength', 'fitness'] }),
  ];
  assert.deepEqual(
    defaultFlowView(flows, { level: 'Intermediate', goals: ['fitness'] }).map(item => item.id),
    ['fit', 'both'],
  );
  assert.equal(defaultFlowView(flows, { level: 'Intermediate' }).length, 3);
  assert.equal(defaultFlowView(flows, { level: 'Intermediate', goals: [] }).length, 3);
});

test('equipment and time are labelled and listed lower, and they never hide a flow', () => {
  const flows = [
    flow('home', { level: 'Intermediate', equipment: 'bodyweight', minutes: 20, areas: ['chest'] as MuscleArea[] }),
    flow('gym', { level: 'Intermediate', equipment: 'gym', minutes: 30 }),
    flow('bells', { level: 'Intermediate', equipment: 'dumbbells', minutes: 25 }),
    flow('long', { level: 'Intermediate', equipment: 'bodyweight', minutes: 70 }),
    flow('beginner-gym', { level: 'Beginner', equipment: 'gym', minutes: 80 }),
  ];
  const member: FlowMember = { level: 'Intermediate', place: 'bodyweight', minutes: 30 };
  const viewed = defaultFlowView(flows, member);
  assert.deepEqual(
    viewed.map(item => item.id),
    ['home', 'long', 'gym', 'bells'],
  );
  assert.deepEqual(viewed.find(item => item.id === 'gym')?.labels, ['Needs a gym']);
  assert.deepEqual(viewed.find(item => item.id === 'bells')?.labels, ['Needs dumbbells']);
  assert.deepEqual(viewed.find(item => item.id === 'long')?.labels, ['70 min']);
  const hidden = flows.filter(item => !viewed.some(shown => shown.id === item.id));
  assert.deepEqual(
    hidden.map(item => item.id),
    ['beginner-gym'],
  );
  for (const item of hidden) {
    const outgrown = levelRank[item.level] < levelRank[member.level];
    const goalMiss = Boolean(member.goals?.length && !item.goals.some(goal => member.goals?.includes(goal)));
    assert.ok(outgrown || goalMiss, item.id);
  }
  assert.ok(viewed.some(item => item.labels.includes('Needs a gym')));
  assert.ok(viewed.some(item => item.labels.some(label => label.endsWith('min'))));
});

test('gaps and priorities rise, with the reason under the ones they cover', () => {
  const flows = [
    flow('plain', { level: 'Intermediate', areas: ['chest'] }),
    flow('gap', { level: 'Intermediate', areas: ['mid-back', 'biceps'] }),
    flow('later-gap', { level: 'Intermediate', areas: ['lats'] }),
    flow('priority', { level: 'Intermediate', areas: ['forearms'] }),
    flow('advanced-gap', { level: 'Advanced', areas: ['mid-back'] }),
  ];
  const viewed = defaultFlowView(flows, {
    level: 'Intermediate',
    gaps: ['mid-back', 'lats'],
    priorities: ['forearms'],
  });
  assert.deepEqual(
    viewed.map(item => item.id),
    ['gap', 'later-gap', 'priority', 'plain', 'advanced-gap'],
  );
  assert.equal(viewed[0].reason, 'Covers mid back, which is behind');
  assert.equal(viewed[1].reason, 'Covers lats, which is behind');
  assert.equal(viewed[2].reason, 'Covers forearms, a priority');
  assert.equal(viewed[4].reason, 'Covers mid back, which is behind');
  assert.ok(viewed[4].labels.includes('Advanced · next level'));
});

test('a member choice beats the default, including a cleared filter', () => {
  const flows = [
    flow('beg', { level: 'Beginner', goals: ['size'], equipment: 'gym', minutes: 70 }),
    flow('mid', { level: 'Intermediate', goals: ['size'], equipment: 'gym', minutes: 40 }),
    flow('fit', { level: 'Intermediate', goals: ['fitness'], equipment: 'bodyweight', minutes: 20 }),
  ];
  const base: FlowMember = {
    level: 'Intermediate',
    goals: ['size'],
    place: 'bodyweight',
    minutes: 30,
  };
  const opened = defaultFlowView(flows, { ...base, overrides: { level: 'All' } });
  assert.deepEqual(
    opened.map(item => item.id),
    ['beg', 'mid'],
  );
  assert.ok(opened.every(item => !item.labels.some(label => label.includes('level'))));
  assert.deepEqual(
    defaultFlowView(flows, { ...base, overrides: { level: 'Beginner' } }).map(item => item.level),
    ['Intermediate', 'Beginner'],
  );
  const picked = defaultFlowView(flows, { ...base, overrides: { levelPick: 'Beginner' } });
  assert.deepEqual(
    picked.map(item => item.id),
    ['beg'],
  );
  assert.equal(picked[0].labels.includes('Needs a gym'), true);
  const widened = defaultFlowView(flows, { ...base, overrides: { goals: null, place: 'gym', minutes: 60 } });
  assert.deepEqual(
    widened.map(item => item.id),
    ['mid', 'fit'],
  );
  assert.ok(widened.every(item => !item.labels.some(label => label.endsWith('min'))));
  const clearedGear = defaultFlowView(flows, { ...base, overrides: { place: null, minutes: null, goals: null, level: 'All' } });
  assert.ok(clearedGear.every(item => item.labels.length === 0));
  assert.equal(clearedGear.length, 3);
});

test('where they train and workout time are optional personal metrics', () => {
  assert.equal(checkMetric('gym.place', { place: 'gym' }).ok, true);
  assert.equal(checkMetric('gym.place', { place: 'dumbbells' }).ok, true);
  assert.equal(checkMetric('gym.place', { place: 'bodyweight' }).ok, true);
  assert.equal(checkMetric('gym.place', { place: 'park' }).ok, false);
  assert.equal(checkMetric('gym.place', { place: 'gym', extra: true }).ok, false);
  assert.equal(checkMetric('gym.minutes', { minutes: 30 }).ok, true);
  assert.equal(checkMetric('gym.minutes', { minutes: 45 }).ok, true);
  assert.equal(checkMetric('gym.minutes', { minutes: 60 }).ok, true);
  assert.equal(checkMetric('gym.minutes', { minutes: 50 }).ok, false);
  assert.equal(checkMetric('gym.minutes', { minutes: 45, extra: 1 }).ok, false);
  assert.equal(checkMetric('gym.priorities', { areas: ['forearms'] }).ok, true);
  assert.equal(checkMetric('gym.priorities', { areas: ['forearms', 'calves', 'neck'] }).ok, true);
  assert.equal(checkMetric('gym.priorities', { areas: ['forearms', 'forearms'] }).ok, false);
  assert.equal(checkMetric('gym.priorities', { areas: ['forearms', 'calves', 'neck', 'shins'] }).ok, false);
  assert.equal(checkMetric('gym.priorities', { areas: [] }).ok, false);
  assert.equal(checkMetric('gym.priorities', { areas: ['thumb'] }).ok, false);
  assert.equal(checkMetric('gym.priorities', { areas: ['forearms'], extra: true }).ok, false);
});

test('a place label names what the member is missing, and an empty list says nothing', () => {
  assert.equal(placeMismatchLabel('gym', 'bodyweight'), 'Needs a gym');
  assert.equal(placeMismatchLabel('dumbbells', 'bodyweight'), 'Needs dumbbells');
  assert.equal(placeMismatchLabel('gym', 'gym'), null);
  assert.equal(placeMismatchLabel('dumbbells', undefined), null);
  assert.equal(exercisesPlaceLabel([], 'bodyweight'), null);
  const ids = ['wide-grip-lat-pulldown'];
  assert.equal(exercisesPlaceLabel(ids, 'bodyweight'), placeMismatchLabel(flowEquipment(ids), 'bodyweight'));
});

function tileFacts(tileId: string) {
  return flowsInTile(tileId).flatMap(item => {
    const session = gymFlowById(item.flowId ?? '');
    if (!session) return [];
    return [
      sessionFacts({
        id: item.id,
        level: item.level,
        goals: item.goals ?? [],
        items: session.items,
      }),
    ];
  });
}
