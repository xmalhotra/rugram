import assert from 'node:assert/strict';
import test from 'node:test';
import { mainSetsFor, seriesImpactLines } from '../shared/series-impact';

const lats = () => mainSetsFor([{ exerciseId: 'wide-grip-lat-pulldown', sets: 6 }]);
const week = [{ area: 'lats' as const, sets: 10, low: 10, high: 20 }];

test('the lead line names the area with the most main sets and this week’s band', () => {
  assert.deepEqual(seriesImpactLines({ adds: lats(), week, nearby: [] }), [
    'Adds 6 sets for lats (10 of 10–20 this week)',
  ]);
});

test('four or more main sets of the same region on the day before is a caution', () => {
  const before = mainSetsFor([{ exerciseId: 'wide-grip-lat-pulldown', sets: 4 }]);
  assert.deepEqual(
    seriesImpactLines({ adds: lats(), week, nearby: [{ side: 'before', areas: before }] }),
    ['Adds 6 sets for lats (10 of 10–20 this week)', 'Back is also planned the day before'],
  );
});

test('three sets on the neighbouring day, or a different region, stays quiet', () => {
  const light = mainSetsFor([{ exerciseId: 'wide-grip-lat-pulldown', sets: 3 }]);
  const chest = mainSetsFor([{ exerciseId: 'pec-deck', sets: 4 }]);
  assert.deepEqual(seriesImpactLines({ adds: lats(), week, nearby: [{ side: 'before', areas: light }] }), [
    'Adds 6 sets for lats (10 of 10–20 this week)',
  ]);
  assert.deepEqual(seriesImpactLines({ adds: lats(), week, nearby: [{ side: 'before', areas: chest }] }), [
    'Adds 6 sets for lats (10 of 10–20 this week)',
  ]);
});

test('the day after is named when nothing heavy sits on the day before', () => {
  const after = mainSetsFor([{ exerciseId: 'wide-grip-lat-pulldown', sets: 5 }]);
  const lines = seriesImpactLines({ adds: lats(), week, nearby: [{ side: 'after', areas: after }] });
  assert.equal(lines[1], 'Back is also planned the day after');
});

test('a flow that adds no main sets has nothing to say, and the lines never decide a save', () => {
  assert.deepEqual(seriesImpactLines({ adds: [], week, nearby: [] }), []);
  assert.deepEqual(seriesImpactLines({ adds: mainSetsFor([{ exerciseId: 'not-an-exercise', sets: 8 }]), week, nearby: [] }), []);
  const lines = seriesImpactLines({ adds: lats(), week, nearby: [] });
  assert.ok(Array.isArray(lines));
});
