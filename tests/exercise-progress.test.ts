import assert from 'node:assert/strict';
import test from 'node:test';
import { progressPoints, progressValue } from '../shared/exercise-progress';

const set = (runId: string | null, loggedAt: string, weightKg: number | null, reps: number | null, durationSeconds: number | null = null) => ({
  runId,
  loggedAt,
  weightKg,
  reps,
  durationSeconds,
});

test('one point per run, oldest first, with the heaviest set by estimated max', () => {
  const points = progressPoints([
    set('b', '2026-11-05T10:05:00Z', 80, 5),
    set('a', '2026-11-01T10:00:00Z', 60, 10),
    set('a', '2026-11-01T10:04:00Z', 70, 6),
    set('b', '2026-11-05T10:00:00Z', 75, 8),
  ]);
  assert.equal(points.length, 2);
  assert.equal(points[0].loggedAt, '2026-11-01T10:04:00Z');
  assert.deepEqual([points[0].bestWeightKg, points[0].bestReps], [70, 6]);
  assert.equal(points[0].volumeKg, 600 + 420);
  assert.deepEqual([points[1].bestWeightKg, points[1].bestReps], [75, 8]);
  assert.ok(progressValue(points[1])! > progressValue(points[0])!);
});

test('sets outside a run group by day; bodyweight and holds still get a value', () => {
  const points = progressPoints([
    set(null, '2026-11-02T08:00:00Z', null, 12),
    set(null, '2026-11-02T08:10:00Z', null, 15),
    set(null, '2026-11-03T08:00:00Z', null, null, 45),
  ]);
  assert.equal(points.length, 2);
  assert.equal(points[0].mostReps, 15);
  assert.equal(progressValue(points[0]), 15);
  assert.equal(points[1].bestSeconds, 45);
  assert.equal(points[1].oneRepMaxKg, null);
});

test('long sets are ranked by weight when no max can be estimated', () => {
  const [point] = progressPoints([set('r', '2026-11-01T10:00:00Z', 20, 20), set('r', '2026-11-01T10:05:00Z', 25, 15)]);
  assert.deepEqual([point.bestWeightKg, point.oneRepMaxKg], [25, null]);
});
