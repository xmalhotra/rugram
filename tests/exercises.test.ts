import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exercise,
  exercisesAtStation,
  exercisesForMuscle,
  gymExercises,
  equipmentGroups,
  searchExercises,
  station,
  stations,
  type Muscle,
  type SetMeasure,
} from '../shared/exercises';
import { gymFlowById } from '../shared/gym-flows';
import { exerciseMuscles } from '../shared/muscle-map';
import { planSets } from '../shared/progression';

const muscles: Muscle[] = [
  'back',
  'biceps',
  'chest',
  'triceps',
  'shoulders',
  'legs',
  'glutes',
  'calves',
  'core',
  'forearms',
];

const required = [
  'Single Arm Lat Pulldown',
  'Mid Width Lat Pulldown',
  'Mid Width Cable Row',
  'Dual Pulley Straight Arm Pulldown',
  'Reverse Pec Deck Fly',
  'Rope Hammer Curl',
  'Reverse Cable Curl',
];

const measures: SetMeasure[] = ['reps', 'hold', 'distance', 'time'];

test('gym exercise ids and names are unique and every exercise has a primary muscle', () => {
  assert.ok(gymExercises.length >= 450 && gymExercises.length <= 600);
  assert.equal(new Set(gymExercises.map(item => item.id)).size, gymExercises.length);
  assert.equal(new Set(gymExercises.map(item => item.name)).size, gymExercises.length);
  for (const item of gymExercises) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(measures.includes(item.measure), item.id);
    assert.ok(item.muscles.length > 0, item.id);
    assert.ok(muscles.includes(item.muscles[0]), item.id);
    assert.ok(item.muscles.every(muscle => muscles.includes(muscle)));
  }
  for (const muscle of muscles) assert.ok(exercisesForMuscle(muscle).length > 0, muscle);
});

const catalogNames = [
  'Conventional Deadlift',
  'L-Sit',
  'Wall Handstand',
  'Straight-Arm Plank',
  'Forearm Plank',
  'V-Sit Toe Touch',
  'Sled Push',
  'Sled Pull',
  'Row',
  'SkiErg',
  'Wall Ball',
  'Burpee Broad Jump',
  'Sandbag Lunge',
];

test('the back and biceps movements exist', () => {
  for (const name of required) assert.ok(gymExercises.some(item => item.name === name), name);
  for (const name of catalogNames) assert.ok(gymExercises.some(item => item.name === name), name);
  const flow = gymFlowById('gym-back-biceps');
  assert.equal(flow?.items.length, 7);
  for (const entry of flow?.items ?? []) assert.ok(exercise(entry.exerciseId), entry.exerciseId);
  assert.equal(exercise('missing'), undefined);
});

test('search matches names and aliases', () => {
  assert.deepEqual(searchExercises('  '), []);
  assert.ok(searchExercises('lat pulldown').some(item => item.id === 'single-arm-lat-pulldown'));
  assert.ok(searchExercises('RDL').some(item => item.id === 'romanian-deadlift'));
  assert.ok(searchExercises('curl cable').some(item => item.id === 'reverse-cable-curl'));
  assert.ok(searchExercises('biceps').some(item => item.id === 'rope-hammer-curl'));
  assert.ok(searchExercises('V-Taps').some(item => item.name === 'V-Taps'));
  assert.ok(searchExercises('V Push Ups').some(item => item.name === 'Pike Push-Up'));
  assert.ok(searchExercises('Leg Lifts').some(item => item.name === 'Seated Leg Lift'));
  assert.ok(searchExercises('Bent Arm Plank').some(item => item.name === 'Forearm Plank'));
  const legPress = searchExercises('leg press');
  const namedLegPress = legPress.filter(item => /leg press/i.test(item.name));
  assert.ok(namedLegPress.length > 0);
  assert.deepEqual(
    legPress.slice(0, namedLegPress.length).map(item => item.id),
    namedLegPress.map(item => item.id),
  );
  assert.equal(searchExercises('side to side')[0]?.name, 'Side to Side Hops');
  assert.equal(searchExercises('side to side').some(item => item.name === 'Side Plank'), false);
  assert.equal(searchExercises('side to side').some(item => item.id === 'freestanding-handstand'), false);
  assert.equal(searchExercises('to').some(item => item.id === 'bottoms-up-kettlebell-press'), false);
  assert.equal(searchExercises('Side Skates')[0]?.id, 'skater-jump');
  assert.equal(searchExercises('pogo')[0]?.id, 'pogo-jumps');
  assert.equal(searchExercises('lunge jump')[0]?.id, 'jumping-lunge');
  assert.equal(searchExercises('SL Side to Side')[0]?.id, 'single-leg-side-to-side');
  assert.ok(searchExercises('single leg').some(item => item.id === 'single-leg-hop'));
  assert.ok(searchExercises('single leg').some(item => item.name.startsWith('Single-Leg')));
  assert.ok(searchExercises('plank').some(item => item.name === 'Side Plank'));
  assert.deepEqual(searchExercises('zzz'), []);
  const curls = searchExercises('curl');
  const firstUnnamed = curls.findIndex(item => !/curl/i.test([item.name, ...(item.aliases ?? [])].join(' ')));
  assert.ok(firstUnnamed === -1 || curls.slice(firstUnnamed).every(item => !/curl/i.test(item.name)));
  assert.ok(exercisesForMuscle('biceps').some(item => item.id === 'rope-hammer-curl'));
});

test('every station belongs to exactly one equipment group', () => {
  const grouped = equipmentGroups.flatMap(group => group.stations);
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), stations.map(place => place.id).sort());
});

test('every exercise has a station, every station has exercises, and every step has a note', () => {
  const total = stations.reduce((sum, place) => sum + exercisesAtStation(place.id).length, 0);
  assert.equal(total, gymExercises.length);
  assert.equal(exercisesAtStation('all').length, gymExercises.length);
  for (const item of gymExercises) {
    const place = station(item.station);
    assert.equal(place?.id, item.station, item.id);
    assert.ok(place && place.about.trim().length > 0, item.id);
    assert.ok(place && place.stepNote.trim().length > 0, item.id);
  }
  for (const place of stations) {
    // A triceps extension machine really does only the one movement.
    assert.ok(exercisesAtStation(place.id).length >= (place.id === 'triceps-extension' ? 1 : 2), place.title);
    assert.ok(place.stepNote.trim().length > 0, place.id);
  }
  const names = exercisesAtStation('all').map(item => item.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  assert.equal(exercise('mid-width-lat-pulldown')?.station, 'lat-pulldown');
  assert.equal(exercise('single-arm-lat-pulldown')?.station, 'lat-pulldown');
  assert.equal(exercise('dual-pulley-straight-arm-pulldown')?.station, 'cable-station');
  for (const place of stations) {
    assert.ok(place.about.trim().length > 0, place.id);
    assert.ok(place.stepNote.trim().length > 0, place.id);
  }
});

test('bodyweight holds and distance moves keep a null weight plan', () => {
  const range = { sets: 3, repsMin: 8, repsMax: 12 };
  for (const id of ['straight-arm-plank', 'l-sit', 'dead-hang', 'bear-crawl', 'handstand-walk']) {
    const move = exercise(id);
    assert.ok(move, id);
    assert.equal(move.load, 'bodyweight', id);
    assert.ok(move.measure === 'hold' || move.measure === 'distance', id);
    const plan = planSets(move, range, [
      { weightKg: 20, reps: 12 },
      { weightKg: 20, reps: 12 },
    ]);
    assert.ok(plan.sets.every(set => set.weightKg == null), id);
  }
});

test('running drills and plyometrics sit on the right station and are tagged', () => {
  const timed = [
    'pogo-jumps',
    'single-leg-pogo',
    'side-to-side-hops',
    'single-leg-side-to-side',
    'lunge-to-high-knee',
    'fast-feet',
  ];
  const distance = [
    'bounding',
    'straight-leg-bound',
    'power-skip',
    'a-skip',
    'b-skip',
    'carioca',
    'ankling',
    'strides',
    'heel-walk',
    'toe-walk',
  ];
  for (const id of [...timed, ...distance, 'hurdle-hops', 'stride-jump']) {
    const move = exercise(id);
    assert.equal(move?.station, 'bw-plyo', id);
    assert.equal(move?.equipment, 'bodyweight', id);
    assert.ok(exerciseMuscles[id]?.main.length, id);
  }
  for (const id of timed) assert.equal(exercise(id)?.measure, 'time', id);
  for (const id of distance) assert.equal(exercise(id)?.measure, 'distance', id);
  assert.equal(exercise('hurdle-hops')?.measure, 'reps');
  assert.equal(exercise('stride-jump')?.measure, 'reps');
  assert.equal(exercise('soleus-raise')?.station, 'bw-legs');
  assert.equal(exercise('soleus-raise')?.measure, 'reps');
  assert.equal(exercise('copenhagen-plank')?.station, 'bw-holds');
  assert.equal(exercise('copenhagen-plank')?.measure, 'hold');
  assert.ok(exerciseMuscles['soleus-raise']?.main.length);
  assert.ok(exerciseMuscles['copenhagen-plank']?.main.length);
  assert.ok(exercise('pogo-jumps')?.aliases?.includes('Ankle Hops'));
  assert.ok(exercise('skater-jump')?.aliases?.includes('Side Skates'));
  assert.ok(exercise('jumping-lunge')?.aliases?.includes('Lunge Jump'));
  assert.ok(exercise('tibialis-raise')?.aliases?.includes('Tib Raise'));
});
