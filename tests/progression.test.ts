import assert from 'node:assert/strict';
import test from 'node:test';
import { exercise } from '../shared/exercises';
import { effortNote, nextSetWeight, planSets, setStepKg } from '../shared/progression';

const range = { sets: 3, repsMin: 10, repsMax: 12 };
const move = (id: string) => {
  const found = exercise(id);
  assert.ok(found, id);
  return found;
};

const lat = move('wide-grip-lat-pulldown');
const curlCable = move('rope-hammer-curl');
const press = move('leg-press');
const assisted = move('assisted-pull-up');
const pullUp = move('pull-up');
const band = move('band-pushdown');
const squat = move('barbell-back-squat');
const deadlift = move('romanian-deadlift');
const barbellCurl = move('barbell-curl');
const bench = move('barbell-bench-press');
const dumbbell = move('dumbbell-bench-press');
const kettlebell = move('kettlebell-swing');

test('the step follows the station, with bigger barbell squats and smaller curls', () => {
  assert.equal(setStepKg(lat), 5);
  assert.equal(setStepKg(curlCable), 2.5);
  assert.equal(setStepKg(press), 10);
  assert.equal(setStepKg(squat), 10);
  assert.equal(setStepKg(deadlift), 10);
  assert.equal(setStepKg(barbellCurl), 2.5);
  assert.equal(setStepKg(bench), 5);
  assert.equal(setStepKg(dumbbell), 2.5);
  assert.equal(setStepKg(kettlebell), 4);
  assert.equal(setStepKg(move('smith-squat')), 5);
  assert.equal(setStepKg(pullUp), null);
  assert.equal(setStepKg(band), null);
});

test('a finished set rises, a short set stays, and assisted weight goes down', () => {
  assert.equal(nextSetWeight({ weightKg: 20, reps: 10 }, lat, range), 25);
  assert.equal(nextSetWeight({ weightKg: 25, reps: 10 }, lat, range), 30);
  assert.equal(nextSetWeight({ weightKg: 20, reps: 9 }, lat, range), 20);
  assert.equal(nextSetWeight({ weightKg: 100, reps: 10 }, press, range), 110);
  assert.equal(nextSetWeight({ weightKg: 40, reps: 10 }, assisted, range), 35);
  assert.equal(nextSetWeight({ weightKg: 3, reps: 10 }, assisted, range), 0);
  assert.equal(nextSetWeight({ weightKg: null, reps: 12 }, pullUp, range), null);
  assert.equal(nextSetWeight({ weightKg: 10, reps: 12 }, band, range), null);
  assert.equal(nextSetWeight({ weightKg: null, reps: 10 }, lat, range), null);
});

test('no history is blank, and mixed weights still rise when every set hit the top', () => {
  assert.deepEqual(planSets(lat, range, null), {
    raised: false,
    sets: [
      { weightKg: null, reps: null },
      { weightKg: null, reps: null },
      { weightKg: null, reps: null },
    ],
  });
  assert.deepEqual(planSets(lat, range, []), {
    raised: false,
    sets: [
      { weightKg: null, reps: null },
      { weightKg: null, reps: null },
      { weightKg: null, reps: null },
    ],
  });
  const same = planSets(lat, range, [
    { weightKg: 40, reps: 12 },
    { weightKg: 40, reps: 12 },
    { weightKg: 40, reps: 12 },
  ]);
  assert.equal(same.raised, true);
  assert.equal(same.sets[0]?.weightKg, 45);
  const mixed = planSets(lat, range, [
    { weightKg: 40, reps: 12 },
    { weightKg: 45, reps: 12 },
    { weightKg: 50, reps: 12 },
  ]);
  assert.equal(mixed.raised, true);
  assert.deepEqual(
    mixed.sets.map(set => set.weightKg),
    [45, 50, 55],
  );
  const short = planSets(lat, range, [
    { weightKg: 40, reps: 12 },
    { weightKg: 40, reps: 10 },
  ]);
  assert.equal(short.raised, false);
  assert.deepEqual(
    short.sets.map(set => set.weightKg),
    [40, 40, 45],
  );
  const assistedPlan = planSets(assisted, range, [
    { weightKg: 40, reps: 12 },
    { weightKg: 35, reps: 12 },
  ]);
  assert.equal(assistedPlan.raised, true);
  assert.deepEqual(
    assistedPlan.sets.map(set => set.weightKg),
    [35, 30, 25],
  );
  assert.deepEqual(
    planSets(pullUp, range, [
      { weightKg: null, reps: 12 },
      { weightKg: null, reps: 12 },
    ]).sets.map(set => set.weightKg),
    [null, null, null],
  );
});

test('bodyweight fills the reps already done, up to the top, and holds suggest five more seconds', () => {
  const push = move('push-up');
  const reps = { sets: 3, repsMin: 8, repsMax: 10, target: { kind: 'reps' as const, min: 8, max: 10 } };
  assert.equal(effortNote(push, reps, null), "First time on this one. We'll remember how you did.");
  assert.deepEqual(
    planSets(push, reps, null).sets.map(set => set.reps),
    [10, 10, 10],
  );
  const mixed = planSets(push, reps, [
    { weightKg: null, reps: 8 },
    { weightKg: null, reps: 12 },
    { weightKg: null, reps: 7 },
  ]);
  assert.deepEqual(
    mixed.sets.map(set => set.reps),
    [8, 10, 7],
  );
  assert.equal(mixed.raised, false);
  assert.equal(
    effortNote(push, reps, [
      { weightKg: null, reps: 10 },
      { weightKg: null, reps: 10 },
      { weightKg: null, reps: 10 },
    ]),
    'You hit 10 on every set. Try the next step when it feels easy.',
  );
  const plank = move('straight-arm-plank');
  const hold = { sets: 3, repsMin: 45, repsMax: 60, target: { kind: 'hold' as const, minSeconds: 45, maxSeconds: 60 } };
  assert.equal(
    effortNote(plank, hold, [{ weightKg: null, reps: null, durationSeconds: 45 }]),
    'Last time 45 sec. Try 50 sec.',
  );
  assert.equal(
    effortNote(plank, hold, [{ weightKg: null, reps: null, durationSeconds: 58 }]),
    'Last time 58 sec. Try 60 sec.',
  );
  assert.equal(
    effortNote(plank, hold, [
      { weightKg: null, reps: null, durationSeconds: 60 },
      { weightKg: null, reps: null, durationSeconds: 60 },
      { weightKg: null, reps: null, durationSeconds: 60 },
    ]),
    'You hit 60 sec on every set. Try the next step when it feels easy.',
  );
  const open = { sets: 2, repsMin: 1, repsMax: 1, target: { kind: 'max' as const, measure: 'reps' as const } };
  assert.equal(effortNote(push, open, null), null);
  assert.equal(effortNote(push, open, [{ weightKg: null, reps: 12 }]), 'Last time 12.');
  const openHold = { sets: 2, repsMin: 1, repsMax: 1, target: { kind: 'max' as const, measure: 'hold' as const } };
  assert.equal(effortNote(plank, openHold, [{ weightKg: null, reps: null, durationSeconds: 18 }]), 'Last time 18 sec.');
  assert.equal(effortNote(lat, reps, [{ weightKg: 40, reps: 10 }]), null);
});
