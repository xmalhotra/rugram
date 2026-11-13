import assert from 'node:assert/strict';
import test from 'node:test';
import { gymExercises, searchExercises } from '../shared/exercises';
import { exerciseMuscles, flowMuscleMap, muscleAreas, muscleMapFor, type MuscleArea } from '../shared/muscle-map';
import { bodyMapFigures } from '../shared/body-map-paths';

const areas = new Set(muscleAreas.map(area => area.id));

test('every exercise is tagged with real muscle areas', () => {
  assert.equal(Object.keys(exerciseMuscles).length, gymExercises.length);
  for (const item of gymExercises) {
    const tag = exerciseMuscles[item.id];
    assert.ok(tag, item.id);
    assert.ok(tag.main.length >= 1 && tag.main.length <= 3, item.id);
    assert.ok(tag.main.every(area => areas.has(area)), item.id);
    assert.ok(tag.helpers.every(area => areas.has(area)), item.id);
    assert.equal(tag.main.filter(area => tag.helpers.includes(area)).length, 0, item.id);
  }
  for (const id of Object.keys(exerciseMuscles)) {
    assert.ok(gymExercises.some(item => item.id === id), id);
  }
});

test('every muscle area is the main work of at least one exercise', () => {
  const mains = new Set(Object.values(exerciseMuscles).flatMap(tag => tag.main));
  for (const area of areas) assert.ok(mains.has(area), area);
});

test('known movements land on the areas that do the work', () => {
  assert.deepEqual(exerciseMuscles['barbell-bench-press'], {
    main: ['chest'],
    helpers: ['front-delts', 'triceps'],
  });
  assert.deepEqual(exerciseMuscles['wide-grip-lat-pulldown'], {
    main: ['lats'],
    helpers: ['biceps', 'mid-back'],
  });
  assert.deepEqual(exerciseMuscles['conventional-deadlift'], {
    main: ['glutes', 'hamstrings', 'lower-back'],
    helpers: ['quads', 'traps', 'forearms', 'lats'],
  });
  assert.deepEqual(exerciseMuscles['v-taps'], {
    main: ['front-delts', 'side-delts'],
    helpers: ['triceps', 'upper-abs'],
  });
  assert.deepEqual(exerciseMuscles['hanging-leg-raise'], {
    main: ['lower-abs', 'hip-flexors'],
    helpers: ['upper-abs', 'forearms'],
  });
  assert.deepEqual(exerciseMuscles['russian-twist'], {
    main: ['obliques'],
    helpers: ['upper-abs', 'hip-flexors'],
  });
});

test('a flow keeps main areas ahead of helpers', () => {
  const combined = flowMuscleMap(['barbell-bench-press', 'wide-grip-lat-pulldown']);
  assert.deepEqual(combined.main, ['chest', 'lats']);
  assert.ok(combined.helpers.includes('front-delts'));
  assert.ok(combined.helpers.includes('triceps'));
  assert.ok(combined.helpers.includes('biceps'));
  assert.ok(combined.helpers.includes('mid-back'));
  assert.ok(!combined.helpers.includes('chest'));
  assert.ok(!combined.helpers.includes('lats'));
  const raised = flowMuscleMap(['barbell-bench-press', 'dumbbell-front-raise']);
  assert.ok(raised.main.includes('front-delts'));
  assert.ok(!raised.helpers.includes('front-delts'));
  assert.deepEqual(muscleMapFor('missing'), { main: [], helpers: [] });
  assert.deepEqual(flowMuscleMap(['missing']), { main: [], helpers: [] });
});

test('search matches muscle area titles after names', () => {
  assert.ok(searchExercises('quads').some(item => item.id === 'leg-extension'));
  assert.ok(searchExercises('lats').some(item => item.id === 'wide-grip-lat-pulldown'));
  const chest = searchExercises('chest');
  const firstAreaOnly = chest.findIndex(
    item => !/chest/i.test([item.name, ...(item.aliases ?? [])].join(' ')),
  );
  assert.ok(firstAreaOnly > 0);
  assert.ok(chest.slice(0, firstAreaOnly).every(item => /chest/i.test(item.name + (item.aliases ?? []).join(' '))));
  assert.ok(muscleAreas.some(area => area.title === 'Quads'));
});

test('both figures cover every muscle area', () => {
  const seen = new Set<MuscleArea>();
  for (const figure of [bodyMapFigures.front, bodyMapFigures.back]) {
    assert.ok(figure.outline.startsWith('M '));
    for (const region of figure.regions) {
      assert.ok(areas.has(region.area), region.area);
      assert.ok(region.d.includes('M '), region.area);
      seen.add(region.area);
    }
  }
  for (const area of areas) assert.ok(seen.has(area), area);
  const front = new Set(bodyMapFigures.front.regions.map(region => region.area));
  const back = new Set(bodyMapFigures.back.regions.map(region => region.area));
  for (const area of ['front-delts', 'chest', 'quads', 'upper-abs', 'shins'] as MuscleArea[]) {
    assert.ok(front.has(area), area);
  }
  for (const area of ['traps', 'lats', 'glutes', 'hamstrings', 'calves'] as MuscleArea[]) {
    assert.ok(back.has(area), area);
  }
});
