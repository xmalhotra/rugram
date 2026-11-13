import assert from 'node:assert/strict';
import test from 'node:test';
import type { Customflow } from '../shared/customflows';
import { equipmentForExercise } from '../shared/flow-defaults';
import { gymFlowById, type GymFlowItem } from '../shared/gym-flows';
import { exerciseMuscles } from '../shared/muscle-map';
import { finisherFor, memberGymItems } from '../shared/priority-finisher';
import { mainSetsFor } from '../shared/series-impact';

function item(exerciseId: string, sets = 2): GymFlowItem {
  return { exerciseId, sets, repsMin: 8, repsMax: 12 };
}

function custom(changes: Customflow['changes'], id: string): Customflow {
  return {
    source: { kind: 'qram-flow', id, version: null },
    changes,
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  };
}

test('an arms flow gains one forearm finisher, and a legs flow does not', () => {
  const arms = gymFlowById('gym-arms-beginner');
  const legs = gymFlowById('gym-legs-squat-pattern-start');
  assert.ok(arms);
  assert.ok(legs);
  const added = finisherFor(arms.items, ['forearms'], 'Beginner');
  assert.equal(added.length, 1);
  const finisher = added[0];
  assert.ok(finisher);
  assert.equal(finisher.sets, 2);
  assert.equal(finisher.repsMin, 12);
  assert.equal(finisher.repsMax, 15);
  assert.equal(finisher.superset, undefined);
  assert.equal(exerciseMuscles[finisher.exerciseId]?.main.includes('forearms'), true);
  assert.equal(arms.items.some(row => row.exerciseId === finisher.exerciseId), false);
  const resolved = memberGymItems(arms.items, ['forearms'], 'Beginner');
  assert.equal(resolved.at(-1)?.exerciseId, finisher.exerciseId);

  const hard = finisherFor(arms.items, ['forearms'], 'Advanced');
  assert.equal(hard[0]?.sets, 3);
  assert.equal(hard[0]?.repsMin, 10);
  assert.equal(hard[0]?.repsMax, 12);

  assert.deepEqual(finisherFor(legs.items, ['forearms'], 'Beginner'), []);
});

test('two forearm sets already in the flow, or the same exercise, add nothing new of that kind', () => {
  const arms = gymFlowById('gym-arms-beginner');
  assert.ok(arms);
  const first = finisherFor(arms.items, ['forearms'], 'Beginner')[0];
  assert.ok(first);
  assert.deepEqual(finisherFor([...arms.items, item('dead-hang', 2)], ['forearms'], 'Beginner'), []);
  const next = finisherFor([...arms.items, { ...first, sets: 1 }], ['forearms'], 'Beginner');
  assert.equal(next.length, 1);
  assert.notEqual(next[0]?.exerciseId, first.exerciseId);
});

test('a home flow gets a home finisher, and the 10-set cap is kept', () => {
  const home = finisherFor([item('bench-dip')], ['forearms'], 'Beginner');
  assert.equal(home.length, 1);
  assert.equal(equipmentForExercise(home[0]?.exerciseId ?? ''), 'bodyweight');

  const dumbbells = finisherFor([item('seated-dumbbell-curl')], ['forearms'], 'Beginner');
  assert.equal(dumbbells.length, 1);
  assert.notEqual(equipmentForExercise(dumbbells[0]?.exerciseId ?? ''), 'gym');

  const crowded = [item('machine-biceps-curl', 2), item('barbell-shrug', 10)];
  const extra = finisherFor(crowded, ['forearms'], 'Beginner');
  assert.equal(extra.length, 1);
  const totals = mainSetsFor([...crowded, ...extra].map(row => ({ exerciseId: row.exerciseId, sets: row.sets })));
  assert.ok(totals.every(row => row.mainSets <= 10));
  assert.equal(exerciseMuscles[extra[0]?.exerciseId ?? '']?.main.includes('traps'), false);
});

test('at most two finishers, and a Customflow can drop or move one', () => {
  const mixed = [item('seated-dumbbell-curl'), item('goblet-squat'), item('barbell-shrug')];
  const many = finisherFor(mixed, ['forearms', 'calves', 'neck', 'forearms'], 'Beginner');
  assert.equal(many.length, 2);
  assert.equal(exerciseMuscles[many[0]?.exerciseId ?? '']?.main.includes('forearms'), true);
  assert.equal(exerciseMuscles[many[1]?.exerciseId ?? '']?.main.includes('calves'), true);

  const arms = gymFlowById('gym-arms-beginner');
  assert.ok(arms);
  const finisher = finisherFor(arms.items, ['forearms'], 'Beginner')[0];
  assert.ok(finisher);
  const dropped = memberGymItems(arms.items, ['forearms'], 'Beginner', custom({ removed: [finisher.exerciseId] }, arms.id));
  assert.equal(dropped.some(row => row.exerciseId === finisher.exerciseId), false);
  assert.equal(dropped.length, arms.items.length);
  const moved = memberGymItems(
    arms.items,
    ['forearms'],
    'Beginner',
    custom({ order: [finisher.exerciseId, ...arms.items.map(row => row.exerciseId)] }, arms.id),
  );
  assert.equal(moved[0]?.exerciseId, finisher.exerciseId);
});

test('a beginner finisher avoids the bar, and a hold is timed in seconds', async () => {
  const { gymFlowById } = await import('../shared/gym-flows');
  const { exercise } = await import('../shared/exercises');
  const arms = gymFlowById('gym-arms-beginner');
  assert.ok(arms);
  const [forearms] = finisherFor(arms.items, ['forearms'], 'Beginner');
  assert.ok(forearms);
  assert.ok(!['barbell', 'ez-bar', 'trap-bar', 'smith'].includes(exercise(forearms.exerciseId)?.equipment ?? ''));
  const home = gymFlowById('cal-upper-beginner');
  assert.ok(home);
  const [obliques] = finisherFor(home.items, ['obliques'], 'Beginner');
  assert.ok(obliques);
  if (exercise(obliques.exerciseId)?.measure === 'hold') {
    assert.deepEqual(obliques.target, { kind: 'hold', minSeconds: 20, maxSeconds: 30 });
  }
});
