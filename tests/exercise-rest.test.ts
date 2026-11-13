import assert from 'node:assert/strict';
import test from 'node:test';
import { gymExercises } from '../shared/exercises';
import { exerciseJoints } from '../shared/joint-map';
import { exerciseRestClass, restClassSeconds, restFor, type RestClass } from '../shared/exercise-rest';

const classes = new Set<RestClass>(['heavy-compound', 'compound', 'isolation', 'core', 'conditioning', 'mobility']);

test('every gym exercise has one rest class', () => {
  assert.equal(gymExercises.length > 700, true);
  for (const item of gymExercises) {
    const restClass = exerciseRestClass[item.id];
    assert.equal(classes.has(restClass), true, item.id);
  }
  assert.equal(Object.keys(exerciseRestClass).length, gymExercises.length);
});

test('the catalogue examples land on the class their names suggest', () => {
  assert.equal(exerciseRestClass['barbell-back-squat'], 'heavy-compound');
  assert.equal(exerciseRestClass['mid-width-lat-pulldown'], 'compound');
  assert.equal(exerciseRestClass['barbell-curl'], 'isolation');
  assert.equal(exerciseRestClass['forearm-plank'], 'core');
  assert.equal(exerciseRestClass['ankle-circles'], 'mobility');
});

test('mobility work is the joint map, and an unknown exercise rests like a compound', () => {
  for (const id of Object.keys(exerciseJoints)) {
    if (exerciseRestClass[id]) assert.equal(exerciseRestClass[id], 'mobility', id);
  }
  assert.equal(restFor('not-a-real-lift'), restClassSeconds.compound);
  assert.equal(restFor('barbell-back-squat'), restClassSeconds['heavy-compound']);
  assert.equal(restClassSeconds['heavy-compound'], 150);
  assert.equal(restClassSeconds.compound, 120);
  assert.equal(restClassSeconds.isolation, 75);
  assert.equal(restClassSeconds.core, 50);
  assert.equal(restClassSeconds.conditioning, 30);
  assert.equal(restClassSeconds.mobility, 20);
});
