import assert from 'node:assert/strict';
import test from 'node:test';
import { alternativesFor } from '../shared/exercise-alternatives';
import { exercise } from '../shared/exercises';
import { equipmentForExercise, placeCanDo } from '../shared/flow-defaults';
import { muscleMapFor } from '../shared/muscle-map';

test('a machine seated row can be a cable or dumbbell row', () => {
  const results = alternativesFor('machine-seated-row');
  const moves = results.map(item => exercise(item.exerciseId));
  assert.ok(moves.every(item => item));
  assert.ok(
    results.some(item => {
      const move = exercise(item.exerciseId);
      return move && (move.equipment === 'cable' || move.equipment === 'dumbbell') && /row/i.test(move.name);
    }),
  );
  assert.ok(results.every(item => item.exerciseId !== 'machine-seated-row'));
  assert.ok(results.every(item => exercise(item.exerciseId)?.equipment !== 'machine'));
  assert.ok(results.every(item => muscleMapFor(item.exerciseId).main[0] === 'mid-back'));
  assert.match(results[0]?.reason ?? '', /Same muscles \(mid back\)/);
});

test('a leg press can be a squat or a lunge', () => {
  const results = alternativesFor('leg-press');
  assert.ok(
    results.some(item => /squat|lunge/i.test(exercise(item.exerciseId)?.name ?? '')),
  );
  assert.ok(results.every(item => item.exerciseId !== 'leg-press'));
  assert.ok(results.every(item => exercise(item.exerciseId)?.equipment !== 'machine'));
  assert.ok(results.every(item => muscleMapFor(item.exerciseId).main[0] === 'quads'));
});

test('a home member’s first suggestions for a leg press need no machine', () => {
  const results = alternativesFor('leg-press', { place: 'dumbbells', limit: 6 });
  assert.ok(results.length > 0);
  assert.ok(results.every(item => placeCanDo(equipmentForExercise(item.exerciseId), 'dumbbells')));
  assert.ok(results.every(item => exercise(item.exerciseId)?.equipment !== 'machine'));
  assert.match(results[0]?.reason ?? '', /Same muscles \(quads\), works at home with /);
  const all = alternativesFor('leg-press', { place: 'dumbbells' });
  let seenGym = false;
  for (const item of all) {
    const fits = placeCanDo(equipmentForExercise(item.exerciseId), 'dumbbells');
    if (!fits) seenGym = true;
    else assert.equal(seenGym, false);
  }
});

test('a superset partner’s muscle is never suggested', () => {
  const results = alternativesFor('leg-press', { avoidMainAreas: ['glutes'] });
  assert.ok(results.length > 0);
  assert.ok(results.every(item => muscleMapFor(item.exerciseId).main[0] === 'quads'));
  assert.ok(results.every(item => !muscleMapFor(item.exerciseId).main.includes('glutes')));
  assert.ok(!results.some(item => item.exerciseId === 'barbell-back-squat' || item.exerciseId === 'walking-lunge'));
  assert.ok(results.some(item => item.exerciseId === 'dumbbell-front-squat' || item.exerciseId === 'sissy-squat'));
});

test('an equipment list and a limit narrow the stand-ins', () => {
  const cables = alternativesFor('machine-seated-row', { equipment: ['cable'], limit: 6 });
  assert.ok(cables.length > 0 && cables.length <= 6);
  assert.ok(cables.every(item => exercise(item.exerciseId)?.equipment === 'cable'));
  assert.equal(alternativesFor('not-an-exercise').length, 0);
});
