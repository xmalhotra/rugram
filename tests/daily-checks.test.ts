import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDailyItem,
  dailyCount,
  dailySections,
  emptyDailyChecks,
  moveDailyItem,
  packDailyChecks,
  parseDailyChecks,
  removeDailyItem,
  replaceDailyItem,
  secureStoreByteLimit,
  setDailyTimes,
  tickDailyItem,
  unpackDailyChecks,
} from '../shared/daily-checks';

const day = '2026-11-05';
const withCreatine = addDailyItem(emptyDailyChecks(), ' Creatine ', 3, 'a');

test('items need a name, stay unique and keep a sensible daily count', () => {
  assert.deepEqual(withCreatine.items, [{ id: 'a', name: 'Creatine', timesPerDay: 3 }]);
  assert.equal(addDailyItem(withCreatine, '   ', 1, 'b'), withCreatine);
  assert.equal(addDailyItem(withCreatine, 'creatine', 1, 'b'), withCreatine);
  assert.equal(addDailyItem(emptyDailyChecks(), 'Water', 50, 'c').items[0]?.timesPerDay, 6);
});

test('ticks count servings per day and start over after the last one', () => {
  let state = withCreatine;
  for (const expected of [1, 2, 3, 0]) {
    state = tickDailyItem(state, 'a', day);
    assert.equal(dailyCount(state, 'a', day), expected);
  }
  assert.equal(dailyCount(state, 'a', '2026-11-06'), 0);
  assert.equal(tickDailyItem(state, 'missing', day), state);
});

test('old days are trimmed and removing an item keeps the rest', () => {
  let state = withCreatine;
  for (let date = 1; date <= 20; date += 1)
    state = tickDailyItem(state, 'a', `2026-10-${String(date).padStart(2, '0')}`);
  assert.equal(Object.keys(state.ticks).length, 14);
  assert.deepEqual(removeDailyItem(state, 'a').items, []);
});

test('old daily items survive and can move onto a checkpoint', () => {
  const parsed = parseDailyChecks({
    items: [{ id: 'a', name: 'Creatine', timesPerDay: 2 }],
    ticks: { [day]: { a: 1 } },
  });
  assert.equal(parsed.items[0]?.checkpoint, undefined);
  assert.equal(dailyCount(parsed, 'a', day), 1);
  assert.deepEqual(
    dailySections(parsed.items, false).map(section => section.checkpoint),
    ['anytime'],
  );
  const moved = moveDailyItem(parsed, 'a', 'Dinner');
  assert.equal(moved.items[0]?.checkpoint, 'Dinner');
  assert.equal(dailyCount(moved, 'a', day), 1);
  assert.equal(moveDailyItem(moved, 'a', 'Dinner'), moved);
  const both = addDailyItem(moved, 'Water', 1, 'b', 'Wake up');
  assert.equal(addDailyItem(both, 'Water', 1, 'c', 'Afternoon').items.length, 3);
  const swapped = replaceDailyItem(both, 'a', { name: 'Fish oil', routineId: 'fish-oil' });
  assert.equal(swapped.items.find(item => item.id === 'a')?.routineId, 'fish-oil');
  assert.equal(setDailyTimes(swapped, 'a', 9).items.find(item => item.id === 'a')?.timesPerDay, 6);
});

test('daily storage splits before the secure-store limit', () => {
  let state = emptyDailyChecks();
  for (let index = 0; index < 50; index += 1) {
    state = addDailyItem(state, `Daily item ${index} with a full name`, 2, `id-${index}`, 'Morning', `routine-${index}`);
    state = tickDailyItem(state, `id-${index}`, day);
  }
  const parts = packDailyChecks(state);
  assert.ok(parts.length > 1);
  for (const part of parts) assert.ok(Buffer.byteLength(part) <= secureStoreByteLimit);
  const restored = unpackDailyChecks(parts);
  assert.equal(restored.items.length, state.items.length);
  assert.equal(dailyCount(restored, 'id-3', day), 1);
  const small = packDailyChecks(withCreatine);
  assert.equal(small.length, 1);
  assert.deepEqual(unpackDailyChecks(small).items, withCreatine.items);
});

test('stored data is parsed safely', () => {
  assert.deepEqual(parseDailyChecks(null), emptyDailyChecks());
  const parsed = parseDailyChecks({
    items: [{ id: 'a', name: 'Creatine', timesPerDay: 2 }, { id: 'b' }, 'junk'],
    ticks: { [day]: { a: 1, b: -1, c: 'x' }, bad: 3 },
  });
  assert.deepEqual(parsed.items, [{ id: 'a', name: 'Creatine', timesPerDay: 2 }]);
  assert.deepEqual(parsed.ticks, { [day]: { a: 1 } });
});
