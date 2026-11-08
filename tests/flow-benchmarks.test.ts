import assert from 'node:assert/strict';
import test from 'node:test';
import type { CatalogFlow } from '../shared/flow-catalog';
import {
  benchmarkFor,
  defaultRest,
  flowBenchmarks,
  nextFlowSuggestion,
  startingLevel,
  targetLoadKg,
  type UserMetrics,
} from '../shared/flow-benchmarks';

const now = Date.parse('2026-06-15T12:00:00.000Z');
const person = (lifestyle: UserMetrics['lifestyle'], birthYear: number, weightKg = 70): UserMetrics => ({
  birthYear,
  weightKg,
  lifestyle,
});

test('lifestyle picks the level, age 50 steps down once, and weight does not', () => {
  assert.equal(startingLevel(person('sedentary', 1990), now), 'Beginner');
  assert.equal(startingLevel(person('light', 1990), now), 'Beginner');
  assert.equal(startingLevel(person('active', 1990), now), 'Regular');
  assert.equal(startingLevel(person('athlete', 1990), now), 'Trained');
  assert.equal(startingLevel(person('athlete', 1976), now), 'Regular');
  assert.equal(startingLevel(person('active', 1970), now), 'Beginner');
  assert.equal(startingLevel(person('sedentary', 1960), now), 'Beginner');
  assert.equal(startingLevel(person('athlete', 1990, 54), now), startingLevel(person('athlete', 1990, 110), now));
});

test('benchmarks use an authored card, otherwise a duration, otherwise 60 seconds, scaled by level', () => {
  flowBenchmarks.sample = {
    cards: {
      press: {
        Beginner: { seconds: 90, reps: 8, loadPerKg: 0.4 },
        Regular: { seconds: 70, reps: 10, loadPerKg: 0.4 },
        Trained: { seconds: 50, reps: 12, loadPerKg: 0.4 },
      },
    },
  };
  try {
    const authored = benchmarkFor('sample', 'press', 'Regular', { duration: '5 minutes' });
    assert.equal(authored.authored, true);
    assert.equal(authored.seconds, 70);
    assert.equal(authored.reps, 10);
    assert.equal(targetLoadKg(authored, person('active', 1990, 73)), 29);
    const minutes = benchmarkFor('other', 'card', 'Beginner', { duration: '5 minutes' });
    assert.equal(minutes.authored, false);
    assert.equal(minutes.seconds, 375);
    assert.equal(benchmarkFor('other', 'card', 'Regular', { steps: [{ duration: '90 seconds' }] }).seconds, 90);
    assert.equal(benchmarkFor('other', 'card', 'Trained', { duration: 'Nightly' }).seconds, 48);
    assert.equal(benchmarkFor('other', 'card', 'Beginner', {}).seconds, 75);
    assert.equal(targetLoadKg(minutes, person('active', 1990)), null);
  } finally {
    delete flowBenchmarks.sample;
  }
});

test('rest defaults are 60, 45 and 30 seconds', () => {
  assert.deepEqual([defaultRest('Beginner'), defaultRest('Regular'), defaultRest('Trained')], [60, 45, 30]);
});

test('a faster run suggests the next live flow, and a coming-soon link stays dormant', () => {
  const live = (id: string, next?: string[]): CatalogFlow => ({
    id,
    title: id,
    tileId: 'gym-back',
    level: 'Beginner',
    tags: [],
    status: 'live',
    flowId: `${id}-habit`,
    ...(next ? { next } : {}),
  });
  const soon: CatalogFlow = { ...live('soon'), status: 'coming-soon', title: 'Soon' };
  const catalog = [live('base', ['soon', 'after']), soon, live('after')];
  assert.equal(nextFlowSuggestion('base-habit', 40, 50, catalog)?.id, 'after');
  assert.equal(nextFlowSuggestion('base', 50, 50, catalog), null);
  assert.equal(nextFlowSuggestion('base', 40, 50, [live('base', ['soon']), soon]), null);
  assert.equal(nextFlowSuggestion('base', 40, 50, [live('base')]), null);
});
