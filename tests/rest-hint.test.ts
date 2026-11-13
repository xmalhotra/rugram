import assert from 'node:assert/strict';
import test from 'node:test';
import { restFor } from '../shared/exercise-rest';
import { checkMetric } from '../shared/personal-metrics';
import { clampRestFactor, nextRestFactor, restFactorMax, restFactorMin, restFactorStep } from '../shared/rest-factor';
import { bestAtLoad, restEffortWeights, restHint, restHintMaxSeconds, restHintMinSeconds, type RestHintInput } from '../shared/rest-hint';
import { changePersonalMetric, readPersonalMetrics } from '../src/lib/personal-metric-store';
import type { PublicUser } from '../src/lib/types';

const member = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function hint(input: RestHintInput) {
  return restHint(input);
}

test('the signal weights sum to 1 and the thin one stays small', () => {
  const sum = Object.values(restEffortWeights).reduce((total, weight) => total + weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, String(sum));
  assert.ok(restEffortWeights.repsVsBest > restEffortWeights.repsVsRange);
  assert.ok(restEffortWeights.repsVsRange > restEffortWeights.repDrop);
  assert.ok(restEffortWeights.weightVsEstimate > restEffortWeights.repDrop);
});

test('one easy pull-up sits near the floor', () => {
  const easy = hint({
    exerciseId: 'pull-up',
    set: { reps: 1, weightKg: null },
    range: { min: 6, max: 12 },
    best: { reps: 20, weightKg: null },
  });
  assert.ok(easy.seconds <= 65, String(easy.seconds));
  assert.ok(easy.seconds >= restHintMinSeconds, String(easy.seconds));
  assert.ok(easy.seconds <= restFor('pull-up') / 2, String(easy.seconds));
  assert.equal(easy.reason, 'An easy one.');
});

test('the top of the range, near the member’s best, rests clearly longer than the class', () => {
  const hard = hint({
    exerciseId: 'pull-up',
    set: { reps: 12, weightKg: null },
    range: { min: 6, max: 12 },
    best: { reps: 12, weightKg: null },
  });
  const limit = hint({
    exerciseId: 'pull-up',
    set: { reps: 20, weightKg: null },
    range: { min: 6, max: 12 },
    best: { reps: 20, weightKg: null },
  });
  assert.ok(hard.seconds >= restFor('pull-up') + 60, String(hard.seconds));
  assert.equal(hard.reason, 'A hard set. Take a little longer.');
  assert.equal(limit.seconds, restHintMaxSeconds);
});

test('an ordinary set, mid range with reps in hand, keeps the class time', () => {
  const ordinary = hint({
    exerciseId: 'pull-up',
    set: { reps: 9, weightKg: null },
    range: { min: 6, max: 12 },
    best: { reps: 12, weightKg: null },
  });
  assert.equal(ordinary.seconds, restFor('pull-up'));
  assert.equal(ordinary.reason, 'About the usual rest.');
});

test('a drop in reps lengthens the rest, and a rise or a weight change does not', () => {
  const steady = hint({
    exerciseId: 'pull-up',
    set: { reps: 8, weightKg: null },
    earlierSets: [{ reps: 8, weightKg: null }],
  });
  const dropped = hint({
    exerciseId: 'pull-up',
    set: { reps: 8, weightKg: null },
    earlierSets: [{ reps: 12, weightKg: null }],
  });
  const rose = hint({
    exerciseId: 'pull-up',
    set: { reps: 12, weightKg: null },
    earlierSets: [{ reps: 8, weightKg: null }],
  });
  const heavier = hint({
    exerciseId: 'barbell-curl',
    set: { reps: 8, weightKg: 14 },
    earlierSets: [{ reps: 12, weightKg: 12 }],
  });
  assert.equal(steady.seconds, restFor('pull-up'));
  assert.ok(dropped.seconds > steady.seconds, `${dropped.seconds} vs ${steady.seconds}`);
  assert.equal(rose.seconds, restFor('pull-up'));
  assert.equal(heavier.seconds, restFor('barbell-curl'));
});

test('no signals equals the class time, and the clock between sets is ignored', () => {
  for (const exerciseId of ['pull-up', 'barbell-back-squat', 'barbell-curl', 'forearm-plank', 'burpee']) {
    assert.equal(hint({ exerciseId, set: { reps: 8 } }).seconds, restFor(exerciseId), exerciseId);
  }
  const brief = hint({
    exerciseId: 'pull-up',
    set: { reps: 8, durationSeconds: 4 },
    earlierSets: [{ reps: 8, durationSeconds: 1 }],
  });
  const long = hint({
    exerciseId: 'pull-up',
    set: { reps: 8, durationSeconds: 90 },
    earlierSets: [{ reps: 8, durationSeconds: 40 }],
  });
  assert.equal(brief.seconds, restFor('pull-up'));
  assert.equal(long.seconds, brief.seconds);
});

test('a best at another weight is not this set’s best', () => {
  const unmatched = hint({
    exerciseId: 'barbell-bench-press',
    set: { reps: 5, weightKg: 100 },
    best: { reps: 5, weightKg: 60 },
  });
  assert.equal(unmatched.seconds, restFor('barbell-bench-press'));
});

test('a heavier load than the estimate lengthens the rest; the estimate itself does not', () => {
  const at = hint({
    exerciseId: 'barbell-curl',
    set: { reps: 10, weightKg: 20 },
    estimate: { weightKg: 20 },
  });
  const heavy = hint({
    exerciseId: 'barbell-curl',
    set: { reps: 10, weightKg: 30 },
    estimate: { weightKg: 20 },
  });
  assert.equal(at.seconds, restFor('barbell-curl'));
  assert.ok(heavy.seconds > at.seconds, String(heavy.seconds));
});

test('a hold is judged by the seconds held', () => {
  const range = { min: 30, max: 60 };
  const best = { reps: 60, weightKg: null as number | null };
  const short = hint({
    exerciseId: 'forearm-plank',
    set: { reps: 40, durationSeconds: 15, weightKg: null },
    range,
    best,
  });
  const long = hint({
    exerciseId: 'forearm-plank',
    set: { reps: 1, durationSeconds: 60, weightKg: null },
    range,
    best,
  });
  assert.ok(short.seconds < restFor('forearm-plank'), String(short.seconds));
  assert.ok(long.seconds > restFor('forearm-plank'), String(long.seconds));
});

test('a custom rest is returned untouched', () => {
  for (const customRest of [0, 17, 400]) {
    const result = hint({
      exerciseId: 'pull-up',
      set: { reps: 20, weightKg: null },
      range: { min: 6, max: 12 },
      best: { reps: 20, weightKg: null },
      memberFactor: 1.6,
      customRest,
    });
    assert.equal(result.seconds, customRest);
    assert.equal(result.reason, 'The rest you set.');
  }
});

test('the hint stays between 30 seconds and 5 minutes', () => {
  const easy = hint({
    exerciseId: 'pull-up',
    set: { reps: 1, weightKg: null },
    range: { min: 15, max: 20 },
    best: { reps: 40, weightKg: null },
    memberFactor: restFactorMin,
  });
  const hard = hint({
    exerciseId: 'barbell-back-squat',
    set: { reps: 20, weightKg: 200 },
    earlierSets: [{ reps: 40, weightKg: 200 }],
    range: { min: 3, max: 5 },
    best: { reps: 5, weightKg: 200 },
    estimate: { weightKg: 80 },
    memberFactor: restFactorMax,
  });
  assert.equal(easy.seconds, restHintMinSeconds);
  assert.equal(hard.seconds, restHintMaxSeconds);
});

test('conditioning and mobility stay short', () => {
  const hard = {
    set: { reps: 30, weightKg: null as number | null },
    range: { min: 8, max: 12 },
    best: { reps: 20, weightKg: null as number | null },
  };
  const conditioning = hint({ exerciseId: 'burpee', ...hard });
  const mobility = hint({ exerciseId: 'ankle-circles', ...hard });
  const pullUp = hint({ exerciseId: 'pull-up', ...hard });
  assert.equal(hint({ exerciseId: 'burpee', set: {} }).seconds, restFor('burpee'));
  assert.equal(hint({ exerciseId: 'ankle-circles', set: {} }).seconds, restHintMinSeconds);
  assert.ok(conditioning.seconds <= 90, String(conditioning.seconds));
  assert.ok(mobility.seconds <= 60, String(mobility.seconds));
  assert.ok(conditioning.seconds < pullUp.seconds);
  assert.ok(mobility.seconds < conditioning.seconds);
});

test('harder and easier move the factor in small steps and stop at the band', () => {
  assert.equal(clampRestFactor(null), 1);
  assert.equal(nextRestFactor(null, 'harder'), 1 + restFactorStep);
  assert.equal(nextRestFactor(null, 'easier'), 1 - restFactorStep);
  let factor = 1;
  for (let tap = 0; tap < 20; tap++) factor = nextRestFactor(factor, 'harder');
  assert.equal(factor, restFactorMax);
  for (let tap = 0; tap < 40; tap++) factor = nextRestFactor(factor, 'easier');
  assert.equal(factor, restFactorMin);
  assert.equal(nextRestFactor(restFactorMin, 'easier'), restFactorMin);
  assert.equal(nextRestFactor(restFactorMax, 'harder'), restFactorMax);
});

test('the best at a weight ignores other loads', () => {
  const sets = [
    { weightKg: 20, reps: 8 },
    { weightKg: 20, reps: 12 },
    { weightKg: 30, reps: 4 },
  ];
  assert.deepEqual(bestAtLoad('barbell-curl', sets, 20), { reps: 12, weightKg: 20 });
  assert.equal(bestAtLoad('barbell-curl', sets, 15), null);
  assert.deepEqual(bestAtLoad('pull-up', [{ reps: 6 }, { reps: 9 }], null), { reps: 9, weightKg: null });
  assert.deepEqual(
    bestAtLoad('towel-curl', [{ durationSeconds: 20 }, { durationSeconds: 35 }], null),
    { reps: 35, weightKg: null },
  );
});

test('gym.restFactor is a personal metric, in demo and rejected outside the band', async () => {
  assert.equal(checkMetric('gym.restFactor', { factor: 1 }).ok, true);
  assert.equal(checkMetric('gym.restFactor', { factor: restFactorMin }).ok, true);
  assert.equal(checkMetric('gym.restFactor', { factor: restFactorMax }).ok, true);
  assert.equal(checkMetric('gym.restFactor', { factor: 0.5 }).ok, false);
  assert.equal(checkMetric('gym.restFactor', { factor: 2 }).ok, false);
  assert.equal(checkMetric('gym.restFactor', { factor: 1, extra: true }).ok, false);

  const previous = process.env.QRAM_DEMO_MODE;
  process.env.QRAM_DEMO_MODE = 'true';
  try {
    const user = member('rest-factor-demo');
    const factor = nextRestFactor(null, 'harder');
    const saved = await changePersonalMetric(user, { action: 'set', metric: 'gym.restFactor', value: { factor } });
    assert.equal(saved['gym.restFactor']?.factor, factor);
    const read = await readPersonalMetrics(user);
    assert.equal(read['gym.restFactor']?.factor, factor);
    await assert.rejects(() => changePersonalMetric(user, { action: 'set', metric: 'gym.restFactor', value: { factor: 3 } }));
    const cleared = await changePersonalMetric(user, { action: 'clear', metric: 'gym.restFactor' });
    assert.equal(cleared['gym.restFactor'], undefined);
  } finally {
    if (previous === undefined) delete process.env.QRAM_DEMO_MODE;
    else process.env.QRAM_DEMO_MODE = previous;
  }
});
