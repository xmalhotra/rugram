import assert from 'node:assert/strict';
import test from 'node:test';
import { focusLevelFor, memberLevel, runLevelFor } from '../shared/member-level';

test('a catalogue level maps onto the run level and the body-flow band', () => {
  assert.equal(runLevelFor('Beginner'), 'Beginner');
  assert.equal(runLevelFor('Intermediate'), 'Regular');
  assert.equal(runLevelFor('Advanced'), 'Trained');
  assert.equal(focusLevelFor('Beginner'), 'beginner');
  assert.equal(focusLevelFor('Intermediate'), 'regular');
  assert.equal(focusLevelFor('Advanced'), 'regular');
});

test('two graduated flows lift the floor one level', () => {
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, graduatedFlows: 1 }).level, 'Beginner');
  assert.deepEqual(memberLevel({ loggedWeeks: 0, lifts: {}, graduatedFlows: 2 }), {
    level: 'Intermediate',
    reason: 'Two flows graduated',
  });
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, graduatedFlows: 3 }).level, 'Intermediate');
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, lifestyle: 'sedentary', graduatedFlows: 2 }).level, 'Intermediate');
  assert.deepEqual(memberLevel({ loggedWeeks: 9, lifts: {}, graduatedFlows: 2 }), {
    level: 'Advanced',
    reason: 'Two flows graduated',
  });
  assert.equal(memberLevel({ loggedWeeks: 0, lifts: {}, graduatedFlows: 4 }).level, 'Advanced');
  assert.equal(
    memberLevel({ loggedWeeks: 0, lifts: { deadliftKg: 160 }, bodyKg: 80, graduatedFlows: 2 }).reason,
    'Deadlift is 2× body weight',
  );
});
