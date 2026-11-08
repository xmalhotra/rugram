import assert from 'node:assert/strict';
import test from 'node:test';
import { gymExercises } from '../shared/exercises';
import { planWithScheme } from '../shared/set-schemes';
import { schemeById } from '../shared/set-scheme-math';
import {
  loadIncrementKg,
  oneRepMax,
  startWeight,
  strengthPatterns,
  strengthProfile,
  weightForReps,
} from '../shared/strength';
import { strengthMap } from '../shared/strength-map';

const now = Date.parse('2026-11-08T12:00:00Z');
const daysAgo = (days: number) => new Date(now - days * 86400000).toISOString();

test('every weighted exercise is mapped, and every reference lift is ratio 1 on its own pattern', () => {
  for (const move of gymExercises.filter(item => item.load !== 'bodyweight')) assert.ok(move.id in strengthMap, move.id);
  for (const pattern of strengthPatterns) {
    assert.deepEqual(strengthMap[pattern.exerciseId], { pattern: pattern.id, ratio: 1 }, pattern.exerciseId);
  }
  for (const [id, link] of Object.entries(strengthMap)) {
    if (link) assert.ok(link.ratio > 0 && link.ratio <= 2.5, id);
  }
});

test('one-rep max and weight for reps are inverses, and long sets are not used', () => {
  assert.equal(oneRepMax(100, 1), 100);
  assert.equal(Math.round(oneRepMax(100, 5)!), 117);
  assert.equal(oneRepMax(100, 13), null);
  assert.equal(oneRepMax(0, 5), null);
  assert.equal(Math.round(weightForReps(oneRepMax(100, 5)!, 5)), 100);
});

test('an anchor sets its pattern; the others are estimated from it', () => {
  const profile = strengthProfile({
    anchors: [{ pattern: 'hinge', weightKg: 120, reps: 1, updatedAt: daysAgo(3) }],
    sets: [],
    now,
  });
  const hinge = profile.patterns.find(item => item.pattern === 'hinge')!;
  assert.equal(hinge.oneRepMaxKg, 120);
  assert.equal(hinge.source, 'you');
  const press = profile.patterns.find(item => item.pattern === 'press')!;
  assert.equal(press.source, 'related');
  assert.equal(press.oneRepMaxKg, 72);
  assert.equal(profile.patterns.length, strengthPatterns.length);
});

test('logged sets on linked exercises raise the pattern and win when stronger and recent', () => {
  const profile = strengthProfile({
    anchors: [{ pattern: 'press', weightKg: 60, reps: 5, updatedAt: daysAgo(30) }],
    // Dumbbell bench press is per hand at about 0.37 of the barbell bench.
    sets: [{ exerciseId: 'dumbbell-bench-press', weightKg: 30, reps: 8, loggedAt: daysAgo(2) }],
    now,
  });
  const press = profile.patterns.find(item => item.pattern === 'press')!;
  assert.equal(press.source, 'sets');
  assert.ok(press.oneRepMaxKg > 90 && press.oneRepMaxKg < 110, String(press.oneRepMaxKg));
});

test('old evidence only counts when nothing recent exists', () => {
  const profile = strengthProfile({
    anchors: [{ pattern: 'squat', weightKg: 100, reps: 1, updatedAt: daysAgo(10) }],
    sets: [{ exerciseId: 'barbell-back-squat', weightKg: 140, reps: 1, loggedAt: daysAgo(200) }],
    now,
  });
  assert.equal(profile.patterns.find(item => item.pattern === 'squat')!.oneRepMaxKg, 100);
});

test('with no lifts at all, body weight gives a cautious guess; with nothing, no guess', () => {
  const body = strengthProfile({ anchors: [], sets: [], bodyWeightKg: 80, lifestyle: 'active', now });
  assert.equal(body.patterns.find(item => item.pattern === 'hinge')!.oneRepMaxKg, 80);
  assert.ok(body.patterns.every(item => item.source === 'body'));
  assert.deepEqual(strengthProfile({ anchors: [], sets: [], now }).patterns, []);
});

test('start weight is lighter than the max allows and rounded down to the equipment', () => {
  const profile = strengthProfile({
    anchors: [{ pattern: 'press', weightKg: 80, reps: 1, updatedAt: daysAgo(1) }],
    sets: [],
    now,
  });
  const dumbbell = startWeight('dumbbell-bench-press', 10, profile)!;
  assert.equal(dumbbell.weightKg, 20);
  assert.equal(dumbbell.weightKg % 2, 0);
  const bench = startWeight('barbell-bench-press', 5, profile)!;
  assert.equal(bench.weightKg % 2.5, 0);
  assert.ok(bench.weightKg < weightForReps(80, 5));
  // An empty bar still weighs 20 kg.
  const light = strengthProfile({ anchors: [{ pattern: 'curl', weightKg: 10, reps: 1, updatedAt: daysAgo(1) }], sets: [], now });
  assert.equal(startWeight('barbell-curl', 12, light)!.weightKg, 20);
});

test('no estimate for bodyweight, unmapped, assisted or rep-less exercises', () => {
  const profile = strengthProfile({ anchors: [{ pattern: 'hinge', weightKg: 100, reps: 1, updatedAt: daysAgo(1) }], sets: [], now });
  assert.equal(startWeight('push-up', 10, profile), null);
  assert.equal(startWeight('sled-push', 10, profile), null);
  assert.equal(startWeight('assisted-pull-up', 10, profile), null);
  assert.equal(startWeight('conventional-deadlift', null, profile), null);
  assert.equal(loadIncrementKg(gymExercises.find(item => item.id === 'goblet-squat')!), 4);
});

test('the set planner starts from the estimate only when there is no history', () => {
  const move = gymExercises.find(item => item.id === 'barbell-bench-press')!;
  const item = { sets: 3, repsMin: 8, repsMax: 8, restSeconds: 90 };
  const flat = schemeById(); // the default: same weight every set
  const fresh = planWithScheme(move, item, flat, null, 60);
  assert.deepEqual(fresh.sets.map(set => set.weightKg), [60, 60, 60]);
  const empty = planWithScheme(move, item, flat, null);
  assert.deepEqual(empty.sets.map(set => set.weightKg), [null, null, null]);
  const known = planWithScheme(move, item, flat, [{ weightKg: 70, reps: 6, setIndex: 1 }], 60);
  assert.equal(known.sets[0].weightKg, 70);
});
