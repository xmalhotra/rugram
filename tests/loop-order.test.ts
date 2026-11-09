import assert from 'node:assert/strict';
import test from 'node:test';
import { isEndFrame, loopOrder } from '../shared/loop-order';

test('two frames alternate; three or more go back and forth without jumping to the start', () => {
  assert.deepEqual(loopOrder(0), []);
  assert.deepEqual(loopOrder(1), [0]);
  assert.deepEqual(loopOrder(2), [0, 1]);
  assert.deepEqual(loopOrder(3), [0, 1, 2, 1]);
  assert.deepEqual(loopOrder(4), [0, 1, 2, 3, 2, 1]);
});

test('the start and end hold longer than the frames between', () => {
  assert.deepEqual([0, 1, 2].map(index => isEndFrame(index, 3)), [true, false, true]);
  assert.equal(isEndFrame(1, 2), true);
});
