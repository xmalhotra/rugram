import assert from 'node:assert/strict';
import test from 'node:test';
import { canMoveOn, nextRowValues, plannedLine, type SetRowValues } from '../shared/set-rows';

const first: SetRowValues = { weightKg: 40, reps: 8, seconds: null };

test('the next row copies the last logged set in this workout', () => {
  const logged: SetRowValues[] = [
    { weightKg: 40, reps: 10, seconds: null },
    { weightKg: 42.5, reps: 8, seconds: null },
  ];
  assert.deepEqual(nextRowValues(logged, first), { weightKg: 42.5, reps: 8, seconds: null });
});

test('a hold copies the seconds just held', () => {
  const logged: SetRowValues[] = [{ weightKg: null, reps: null, seconds: 35 }];
  assert.deepEqual(nextRowValues(logged, { weightKg: null, reps: null, seconds: 30 }), {
    weightKg: null,
    reps: null,
    seconds: 35,
  });
});

test('with nothing logged, the next row is the first-row seed', () => {
  // The seed is last time, then the estimate, then the flow. This function does not reorder those.
  assert.deepEqual(nextRowValues([], first), first);
  assert.deepEqual(nextRowValues([{ weightKg: null, reps: null, seconds: null }], first), first);
});

test('any logged count can move on, including none and more than planned', () => {
  assert.equal(canMoveOn(0, 3), true);
  assert.equal(canMoveOn(1, 3), true);
  assert.equal(canMoveOn(3, 3), true);
  assert.equal(canMoveOn(5, 3), true);
  assert.equal(plannedLine(3), '3 planned');
  assert.equal(plannedLine(1), '1 planned');
});
