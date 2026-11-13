import assert from 'node:assert/strict';
import test from 'node:test';
import { coverageForTarget, exercisesForTarget, type CoverageSource } from '../shared/body-flow-actions';

test('ankle exercises include ankle-circles', () => {
  const ankles = exercisesForTarget({ kind: 'joint', id: 'ankles' });
  assert.ok(ankles.some(item => item.id === 'ankle-circles'));
  const names = ankles.map(item => item.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
});

test("a muscle's main exercises sort before its helpers", () => {
  const plain = exercisesForTarget({ kind: 'area', id: 'biceps' });
  const helper = plain.find(item => item.role === 'helper');
  assert.ok(helper);
  // A helper with a how-to still waits behind every main exercise.
  const list = exercisesForTarget({ kind: 'area', id: 'biceps' }, new Set([helper.id]));
  const split = list.findIndex(item => item.role === 'helper');
  assert.ok(split > 0);
  assert.ok(list.slice(0, split).every(item => item.role === 'main'));
  assert.ok(list.slice(split).every(item => item.role === 'helper'));
  assert.equal(list[split]?.id, helper.id);
});

test('a how-to with an icon sorts ahead of other exercises in the same role', () => {
  const plain = exercisesForTarget({ kind: 'area', id: 'biceps' });
  const mains = plain.filter(item => item.role === 'main');
  const later = mains[mains.length - 1];
  assert.ok(later && mains.length > 1);
  const boosted = exercisesForTarget({ kind: 'area', id: 'biceps' }, new Set([later.id]));
  assert.equal(boosted.find(item => item.role === 'main')?.id, later.id);
});

test('the flow ranking orders by coverage', () => {
  const sources: CoverageSource[] = [
    { kind: 'flow', id: 'few', title: 'Few', exerciseIds: ['ankle-circles', 'push-up', 'air-squat'] },
    { kind: 'session', id: 'many', title: 'Many', exerciseIds: ['ankle-circles', 'calf-stretch', 'deep-squat-hold', 'push-up'] },
    { kind: 'flow', id: 'none', title: 'None', exerciseIds: ['push-up'] },
    { kind: 'flow', id: 'dup', title: 'Dup', exerciseIds: ['ankle-circles', 'ankle-circles'] },
    { kind: 'flow', id: 'b', title: 'Bravo', exerciseIds: ['calf-stretch', 'air-squat'] },
    { kind: 'session', id: 'a', title: 'Alpha', exerciseIds: ['ankle-circles', 'push-up'] },
  ];
  const ranked = coverageForTarget({ kind: 'joint', id: 'ankles' }, sources);
  // Most focused first: Dup is all ankles (its repeated id counts once, 1 of 1), Many 3 of 4, Alpha and Bravo
  // 1 of 2 (by title), Few 1 of 3.
  assert.deepEqual(
    ranked.map(item => item.id),
    ['dup', 'many', 'a', 'b', 'few'],
  );
  assert.deepEqual(ranked[1], { kind: 'session', id: 'many', title: 'Many', hits: 3, total: 4 });
  assert.equal(ranked.find(item => item.id === 'dup')?.hits, 1);
  assert.equal(ranked.find(item => item.id === 'dup')?.total, 1);
  assert.equal(ranked.find(item => item.id === 'none'), undefined);
});
