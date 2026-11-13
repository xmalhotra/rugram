import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { exercise } from '../shared/exercises';
import { exerciseRestClass } from '../shared/exercise-rest';
import { gymFlows } from '../shared/gym-flows';
import { exerciseMuscles } from '../shared/muscle-map';

test('every gym flow has exercises, loop frames, and at most 10 main sets', () => {
  assert.ok(gymFlows.length > 0);
  for (const flow of gymFlows) {
    assert.ok(flow.items.length > 0, flow.id);
    const totals = new Map<string, number>();
    for (const item of flow.items) {
      assert.ok(exercise(item.exerciseId), `${flow.id} ${item.exerciseId}`);
      assert.equal(existsSync(`mobile/assets/howto/${item.exerciseId}-1.jpg`), true, item.exerciseId);
      assert.equal(existsSync(`mobile/assets/howto/${item.exerciseId}-2.jpg`), true, item.exerciseId);
      // Conditioning intervals are cardio, not hard sets (docs/gym-catalogue.md), so they don't count to the cap.
      if (exerciseRestClass[item.exerciseId] === 'conditioning') continue;
      for (const area of exerciseMuscles[item.exerciseId]?.main ?? []) {
        totals.set(area, (totals.get(area) ?? 0) + item.sets);
      }
    }
    for (const [area, sets] of totals) assert.ok(sets <= 10, `${flow.id} ${area} ${sets}`);
  }
});

test('beginner flows do not open on a barbell heavy compound, and advanced flows open on a compound', () => {
  for (const flow of gymFlows) {
    const first = flow.items[0];
    assert.ok(first, flow.id);
    const move = exercise(first.exerciseId);
    const restClass = exerciseRestClass[first.exerciseId];
    if (flow.level === 'Beginner') {
      assert.equal(restClass === 'heavy-compound' && move?.equipment === 'barbell', false, flow.id);
    }
    if (flow.level === 'Advanced') {
      assert.ok(
        restClass === 'compound' || restClass === 'heavy-compound' || restClass === 'core',
        `${flow.id} ${first.exerciseId} ${restClass}`,
      );
    }
  }
});

test('every superset group has two items and their main muscles differ', () => {
  for (const flow of gymFlows) {
    const groups = new Map<string, string[]>();
    for (const item of flow.items) {
      if (!item.superset) continue;
      const members = groups.get(item.superset) ?? [];
      members.push(item.exerciseId);
      groups.set(item.superset, members);
    }
    for (const [label, members] of groups) {
      assert.equal(members.length, 2, `${flow.id} ${label}`);
      const [first, second] = members;
      const mains = new Set(exerciseMuscles[first]?.main ?? []);
      const shared = (exerciseMuscles[second]?.main ?? []).filter(area => mains.has(area));
      assert.deepEqual(shared, [], `${flow.id} ${label}`);
    }
  }
});
