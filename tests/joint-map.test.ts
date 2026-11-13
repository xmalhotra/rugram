import assert from 'node:assert/strict';
import test from 'node:test';
import { exercise, gymExercises } from '../shared/exercises';
import { exerciseJoints, isMobilityExercise, jointMarkers, type Joint } from '../shared/joint-map';

test('every mobility-station exercise moves at least one joint', () => {
  const missing = gymExercises.filter(item => item.station === 'mobility' && !(exerciseJoints[item.id]?.length)).map(item => item.id);
  assert.deepEqual(missing, []);
});

test('every tagged id exists in the exercise library', () => {
  const missing = Object.keys(exerciseJoints).filter(id => !exercise(id));
  assert.deepEqual(missing, []);
});

test('ankle circles, cat-cow and pigeon land on the joints they move', () => {
  assert.deepEqual(exerciseJoints['ankle-circles'], ['ankles']);
  assert.deepEqual(exerciseJoints['cat-cow'], ['spine']);
  assert.deepEqual(exerciseJoints['pigeon-stretch'], ['hips']);
  assert.equal(isMobilityExercise('ankle-circles'), true);
  assert.equal(isMobilityExercise('barbell-bench-press'), false);
});

test('markers sit on the sides the map draws', () => {
  const count = (side: 'front' | 'back', joint: Joint) => jointMarkers[side].filter(marker => marker.joint === joint).length;
  assert.equal(count('front', 'neck'), 1);
  assert.equal(count('back', 'neck'), 1);
  assert.equal(count('front', 'shoulders'), 2);
  assert.equal(count('back', 'shoulders'), 0);
  assert.equal(count('front', 'wrists'), 2);
  assert.equal(count('back', 'wrists'), 0);
  assert.equal(count('front', 'hips'), 2);
  assert.equal(count('back', 'hips'), 0);
  assert.equal(count('front', 'knees'), 2);
  assert.equal(count('back', 'knees'), 0);
  assert.equal(count('front', 'ankles'), 2);
  assert.equal(count('back', 'ankles'), 2);
  assert.equal(count('front', 'spine'), 0);
  assert.equal(count('back', 'spine'), 3);
});
