import assert from 'node:assert/strict';
import test from 'node:test';
import { areaPicture, bodyFlow, dayZero, gaps, jointShade, levelFromSets, loggedWeeks, mainAreasTrained, pictureHeadline, shade, type BodyFlowResult, type LoggedSet } from '../shared/body-flow';
import { largeMuscleArea, targetBand } from '../shared/focus-targets';
import { muscleAreas } from '../shared/muscle-map';

test('main and helper areas are weighted as 1 and 0.5', () => {
  const result = bodyFlow([{ date: '2026-11-10', exerciseId: 'barbell-bench-press' }], [], { from: '2026-11-10', to: '2026-11-10' });
  const chest = result.areas.find(area => area.area === 'chest');
  const delts = result.areas.find(area => area.area === 'front-delts');
  const triceps = result.areas.find(area => area.area === 'triceps');
  assert.equal(chest?.sets, 1);
  assert.equal(chest?.mainSets, 1);
  assert.equal(chest?.helperSets, 0);
  assert.equal(delts?.sets, 0.5);
  assert.equal(triceps?.sets, 0.5);
});

test('skipped and unknown sets do not count', () => {
  const result = bodyFlow(
    [
      { date: '2026-11-10', exerciseId: 'barbell-bench-press', skipped: true },
      { date: '2026-11-10', exerciseId: 'not-real' },
    ],
    [],
    { from: '2026-11-10', to: '2026-11-10' },
  );
  assert.ok(result.areas.every(area => area.sets === 0));
});

test('range clipping only keeps sets and cardio inside the dates', () => {
  const result = bodyFlow(
    [
      { date: '2026-11-09', exerciseId: 'barbell-bench-press' },
      { date: '2026-11-10', exerciseId: 'barbell-bench-press' },
    ],
    [
      { date: '2026-11-09', minutes: 30 },
      { date: '2026-11-10', minutes: 20 },
    ],
    { from: '2026-11-10', to: '2026-11-10' },
  );
  const chest = result.areas.find(area => area.area === 'chest');
  assert.equal(chest?.sets, 1);
  assert.equal(result.cardioMinutes, 20);
  assert.equal(result.days, 1);
});

test('shade scales with weeks in the selected range', () => {
  assert.equal(shade(2, { low: 6, high: 10 }, 1), 1);
  assert.equal(shade(2, { low: 6, high: 10 }, 0.5), 2);
  assert.equal(shade(5, { low: 6, high: 10 }, 0.5), 3);
  assert.equal(shade(6, { low: 6, high: 10 }, 0.5), 4);
});

test('gaps are ordered by the largest deficit first', () => {
  const result: BodyFlowResult = {
    days: 7,
    weeks: 1,
    cardioMinutes: 0,
    joints: [],
    areas: muscleAreas.map(area => ({
      area: area.id,
      sets: 20,
      mainSets: 20,
      helperSets: 0,
      lastDate: null,
      exercises: [],
    })),
  };
  const lowerBack = result.areas.find(area => area.area === 'lower-back');
  const chest = result.areas.find(area => area.area === 'chest');
  assert.ok(lowerBack && chest);
  lowerBack.sets = 0;
  chest.sets = 2;
  const list = gaps(result, 'beginner');
  assert.equal(list[0]?.startsWith('Lower back:'), true);
  assert.equal(list[1]?.startsWith('Chest:'), true);
});

test('dayZero is the first non-skipped set date', () => {
  const sets: LoggedSet[] = [
    { date: '2026-11-01', exerciseId: 'barbell-bench-press', skipped: true },
    { date: '2026-11-03', exerciseId: 'barbell-bench-press' },
    { date: '2026-11-02', exerciseId: 'barbell-bench-press' },
  ];
  assert.equal(dayZero(sets), '2026-11-02');
  assert.equal(dayZero([{ date: '2026-11-01', exerciseId: 'barbell-bench-press', skipped: true }]), null);
});

test('cardio minutes are summed', () => {
  const result = bodyFlow([], [{ date: '2026-11-10', minutes: 22.5 }, { date: '2026-11-10', minutes: 7.5 }], { from: '2026-11-10', to: '2026-11-10' });
  assert.equal(result.cardioMinutes, 30);
});

test('top contributors are capped at 8 exercises', () => {
  const chestExercises = [
    'barbell-bench-press',
    'dumbbell-bench-press',
    'machine-chest-press',
    'smith-bench-press',
    'decline-machine-chest-press',
    'push-up',
    'ring-push-up',
    'wide-grip-bench-press',
    'cable-chest-press',
  ];
  const result = bodyFlow(
    chestExercises.map((exerciseId, index) => ({ date: `2026-11-${String(index + 1).padStart(2, '0')}`, exerciseId })),
    [],
    { from: '2026-11-01', to: '2026-11-30' },
  );
  const chest = result.areas.find(area => area.area === 'chest');
  assert.equal(chest?.exercises.length, 8);
});

test('ankle circles count toward ankles and add nothing to calves or shins', () => {
  const result = bodyFlow([{ date: '2026-11-10', exerciseId: 'ankle-circles' }], [], { from: '2026-11-10', to: '2026-11-10' });
  assert.ok(result.areas.every(area => area.sets === 0));
  const ankles = result.joints.find(joint => joint.joint === 'ankles');
  assert.equal(ankles?.days, 1);
  assert.equal(ankles?.sets, 1);
  assert.equal(ankles?.lastDate, '2026-11-10');
  assert.deepEqual(ankles?.exercises, [{ exerciseId: 'ankle-circles', sets: 1 }]);
  assert.ok(result.joints.filter(joint => joint.joint !== 'ankles').every(joint => joint.days === 0 && joint.sets === 0));
  assert.deepEqual(
    result.joints.map(joint => joint.joint),
    ['neck', 'shoulders', 'wrists', 'spine', 'hips', 'knees', 'ankles'],
  );
});

test('two mobility sets on the same day count as one day', () => {
  const result = bodyFlow(
    [
      { date: '2026-11-10', exerciseId: 'ankle-circles' },
      { date: '2026-11-10', exerciseId: 'ankle-circles' },
    ],
    [],
    { from: '2026-11-09', to: '2026-11-15' },
  );
  const ankles = result.joints.find(joint => joint.joint === 'ankles');
  assert.equal(ankles?.days, 1);
  assert.equal(ankles?.sets, 2);
});

test('joint shade scales with the weeks in the range', () => {
  assert.equal(jointShade(0, 1), 0);
  assert.equal(jointShade(1, 2), 1);
  assert.equal(jointShade(3, 2), 2);
  assert.equal(jointShade(5, 2), 3);
  assert.equal(jointShade(7, 2), 4);
  assert.equal(jointShade(1, 1), 2);
  assert.equal(jointShade(2, 0.5), 4);
});

test('a range shorter than a week is still measured against a full week', () => {
  const result = bodyFlow([{ date: '2026-11-10', exerciseId: 'seated-cable-row' }], [], { from: '2026-11-10', to: '2026-11-10' });
  assert.equal(result.days, 1);
  assert.equal(result.weeks, 1);
});

test('conditioning intervals add no muscle sets', () => {
  const result = bodyFlow([{ date: '2026-11-10', exerciseId: 'stationary-bike' }], [], { from: '2026-11-10', to: '2026-11-16' });
  assert.ok(result.areas.every(area => area.sets === 0));
  assert.deepEqual(mainAreasTrained(['stationary-bike']), []);
  assert.notEqual(areaPicture({ sets: 0, band: { low: 6, high: 10 }, weeks: 1, large: true }).state, 'worked');
});

test('logged weeks are the span of completed sets, and eight weeks is still beginner', () => {
  assert.equal(loggedWeeks([]), 0);
  assert.equal(loggedWeeks([{ date: '2026-11-10', exerciseId: 'barbell-bench-press', skipped: true }]), 0);
  assert.equal(loggedWeeks([{ date: '2026-11-10', exerciseId: 'barbell-bench-press' }]), 1 / 7);
  const span = [
    { date: '2026-01-01', exerciseId: 'barbell-bench-press' },
    { date: '2026-01-05', exerciseId: 'barbell-bench-press', skipped: true },
    { date: '2026-02-25', exerciseId: 'barbell-bench-press' },
  ];
  assert.equal(loggedWeeks(span), 56 / 7);
  assert.equal(levelFromSets(span), 'beginner');
  const longer = [
    { date: '2026-01-01', exerciseId: 'barbell-bench-press' },
    { date: '2026-02-26', exerciseId: 'barbell-bench-press' },
  ];
  assert.ok(loggedWeeks(longer) > 8);
  assert.equal(levelFromSets(longer), 'regular');
});

test('an area is worked, missed or quiet, and work deepens at the band edges', () => {
  const band = { low: 6, high: 10 };
  assert.deepEqual(areaPicture({ sets: 0, band, weeks: 1 }), { state: 'quiet', step: 0 });
  // A large area with nothing due is not missed: a Monday morning is not a blue body.
  assert.deepEqual(areaPicture({ sets: 0, band, weeks: 1, large: true }), { state: 'quiet', step: 0 });
  assert.deepEqual(areaPicture({ sets: 0, band, weeks: 1, planned: true }), { state: 'missed', step: 0 });
  assert.deepEqual(areaPicture({ sets: 0.5, band, weeks: 1, planned: true }), { state: 'worked', step: 1 });
  assert.deepEqual(areaPicture({ sets: 5.9, band, weeks: 1 }), { state: 'worked', step: 1 });
  assert.deepEqual(areaPicture({ sets: 6, band, weeks: 1 }), { state: 'worked', step: 2 });
  assert.deepEqual(areaPicture({ sets: 10, band, weeks: 1 }), { state: 'worked', step: 2 });
  assert.deepEqual(areaPicture({ sets: 10.1, band, weeks: 1 }), { state: 'worked', step: 3 });
  assert.equal(areaPicture({ sets: 11, band, weeks: 2 }).step, 1);
  assert.equal(areaPicture({ sets: 12, band, weeks: 2 }).step, 2);
  assert.equal(areaPicture({ sets: 20, band, weeks: 2 }).step, 2);
  assert.equal(areaPicture({ sets: 20.1, band, weeks: 2 }).step, 3);
  const small = targetBand('forearms', 'beginner');
  assert.equal(areaPicture({ sets: 0, band: small, weeks: 1 }).state, 'quiet');
  assert.equal(areaPicture({ sets: 0, band: small, weeks: 1, planned: true }).state, 'missed');
  assert.equal(areaPicture({ sets: 1, band: small, weeks: 1, planned: true }).state, 'worked');
});

test('an untouched priority is missed; a priority with some work is worked', () => {
  const band = targetBand('chest', 'beginner');
  assert.equal(areaPicture({ sets: 0, band, weeks: 1, priority: true }).state, 'missed');
  assert.deepEqual(areaPicture({ sets: 8, band, weeks: 1, priority: true }), { state: 'worked', step: 2 });
  assert.deepEqual(areaPicture({ sets: band.high + 0.5, band, weeks: 1, priority: true }), { state: 'worked', step: 3 });
  assert.equal(largeMuscleArea('forearms'), false);
  const rows = muscleAreas.map(area => ({
    area: area.id,
    state: areaPicture({
      sets: area.id === 'chest' || area.id === 'quads' ? 0 : 20,
      band: targetBand(area.id, 'beginner'),
      weeks: 1,
      priority: area.id === 'chest',
      planned: area.id === 'quads',
    }).state,
  }));
  const line = pictureHeadline(rows, ['chest'], 'this week');
  assert.equal(line.text, 'Chest is missed this week');
  assert.equal(line.area, 'chest');
  const done = muscleAreas.map(area => ({
    area: area.id,
    state: areaPicture({ sets: 30, band: targetBand(area.id, 'beginner'), weeks: 1, priority: area.id === 'chest' }).state,
  }));
  assert.deepEqual(pictureHeadline(done, ['chest'], 'this month'), { text: 'Nothing missed this month', area: null });
});

test('the headline names the region with the most missed areas', () => {
  const rows = muscleAreas.map(area => ({
    area: area.id,
    state: areaPicture({ sets: 0, band: targetBand(area.id, 'beginner'), weeks: 1, planned: largeMuscleArea(area.id) }).state,
  }));
  const line = pictureHeadline(rows, [], 'this week');
  assert.equal(line.text, 'Legs are missed this week');
  assert.equal(line.area, 'glutes');
  const named = pictureHeadline(rows, ['chest'], 'this week');
  assert.equal(named.text, 'Chest is missed this week');
  assert.equal(named.area, 'chest');
});

test('main areas ignore helpers, mobility and conditioning', () => {
  assert.deepEqual(mainAreasTrained(['barbell-bench-press']), ['chest']);
  assert.deepEqual(mainAreasTrained(['ankle-circles']), []);
  assert.deepEqual(mainAreasTrained(['stationary-bike']), []);
});
