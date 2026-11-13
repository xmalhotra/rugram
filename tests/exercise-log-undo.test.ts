import test from 'node:test';
import assert from 'node:assert/strict';
import { exerciseLogSchema } from '../src/lib/exercise-log-store';

const runId = 'run-0b9a7c52-6f7e-4a8e-9d40-6f1f0e2b3c4d';

test('inside a run an empty set list is allowed, so undoing the only ticked set clears it', () => {
  assert.equal(exerciseLogSchema.safeParse({ action: 'log', runId, exerciseId: 'lat-pulldown', sets: [] }).success, true);
});

test('outside a run an empty set list is refused', () => {
  assert.equal(exerciseLogSchema.safeParse({ action: 'log', exerciseId: 'lat-pulldown', sets: [] }).success, false);
});
