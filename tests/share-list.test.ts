import test from 'node:test';
import assert from 'node:assert/strict';
import { isRestDay, withShareDetails } from '../shared/share-list';

test('a Map flow day with no flows is a rest day and is never offered', () => {
  assert.equal(isRestDay({ flows: [] }), true);
  assert.equal(isRestDay({ flows: [{ id: 'push' }] }), false);
});

test('rows that read the same carry their Map flow name; unique rows carry nothing', () => {
  const rows = withShareDetails([
    { title: 'Day 1', from: 'Full body and core' },
    { title: 'day 1 ', from: 'Upper lower' },
    { title: 'Core day', from: 'Full body and core' },
    { title: 'Full body and core' },
  ]);
  assert.deepEqual(
    rows.map(row => row.detail),
    ['Full body and core', 'Upper lower', null, null],
  );
});

test('a duplicate with no Map flow to name stays without a detail', () => {
  const rows = withShareDetails([{ title: 'Leg day' }, { title: 'Leg day' }]);
  assert.deepEqual(
    rows.map(row => row.detail),
    [null, null],
  );
});
