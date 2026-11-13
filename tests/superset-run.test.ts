import assert from 'node:assert/strict';
import test from 'node:test';
import { doneCard, endRest, gymSetOrder, nextAfterSet, showCard, splitSupersetLabels, startRun, type GymSetInput } from '../shared/flow-run';

const orderOf = (items: GymSetInput[]) => gymSetOrder(items).map(visit => [visit.exerciseId, visit.setIndex, visit.restAfter]);

test('a superset alternates by set, with no rest inside the pair and the longer rest after it', () => {
  const items: GymSetInput[] = [
    { exerciseId: 'curl', sets: 2, restSeconds: 60, superset: 'A' },
    { exerciseId: 'pushdown', sets: 2, restSeconds: 90, superset: 'A' },
    { exerciseId: 'raise', sets: 1, restSeconds: 75 },
  ];
  assert.deepEqual(orderOf(items), [
    ['curl', 0, 0],
    ['pushdown', 0, 90],
    ['curl', 1, 0],
    ['pushdown', 1, 90],
    ['raise', 0, 75],
  ]);
  const visits = gymSetOrder(items);
  assert.equal(visits[0].superset, 'A');
  assert.equal(visits[0].place, 1);
  assert.equal(visits[0].size, 2);
  assert.equal(visits[1].place, 2);
  assert.equal(visits[4].superset, null);
});

test('uneven supersets let the longer exercise finish alone on its own rest', () => {
  const items: GymSetInput[] = [
    { exerciseId: 'squat', sets: 3, restSeconds: 40, superset: 'A' },
    { exerciseId: 'curl', sets: 2, restSeconds: 90, superset: 'A' },
  ];
  assert.deepEqual(orderOf(items), [
    ['squat', 0, 0],
    ['curl', 0, 90],
    ['squat', 1, 0],
    ['curl', 1, 90],
    ['squat', 2, 40],
  ]);
});

test('a label needs a neighbour, and a plain flow stays in exercise order', () => {
  const plain: GymSetInput[] = [
    { exerciseId: 'a', sets: 2, restSeconds: 90 },
    { exerciseId: 'b', sets: 1, restSeconds: 60, superset: 'A' },
    { exerciseId: 'c', sets: 2, restSeconds: 45 },
  ];
  assert.deepEqual(orderOf(plain), [
    ['a', 0, 90],
    ['a', 1, 90],
    ['b', 0, 60],
    ['c', 0, 45],
    ['c', 1, 45],
  ]);
  assert.ok(gymSetOrder(plain).every(visit => visit.superset == null));

  let state = startRun(
    [
      { cardId: 'a', sourceFlowId: 'flow', title: 'A', targetSeconds: 10 },
      { cardId: 'b', sourceFlowId: 'flow', title: 'B', targetSeconds: 10 },
    ],
    5,
    0,
  );
  state = doneCard(state, 1_000);
  assert.equal(state.phase, 'rest');
  assert.equal(state.restSeconds, 5);
  assert.equal(state.index, 1);
  state = doneCard(endRest(state, 2_000), 3_000);
  assert.equal(state.phase, 'finished');
  assert.equal(state.cards[1].status, 'done');
});

test('moving to a superset partner does not open a rest', () => {
  const started = startRun(
    [
      { cardId: 'flow:curl', sourceFlowId: 'flow', title: 'Curl', targetSeconds: 0, manual: true },
      { cardId: 'flow:pushdown', sourceFlowId: 'flow', title: 'Pushdown', targetSeconds: 0, manual: true },
    ],
    90,
    0,
  );
  const shown = showCard(started, 1, 1_000);
  assert.equal(shown.phase, 'card');
  assert.equal(shown.index, 1);
  assert.equal(shown.cards[0].status, 'pending');
  assert.equal(shown.restSeconds, 90);
});

test('an open-ended superset keeps alternating past the plan', () => {
  const items: GymSetInput[] = [
    { exerciseId: 'curl', sets: 2, restSeconds: 60, superset: 'A' },
    { exerciseId: 'pushdown', sets: 2, restSeconds: 90, superset: 'A' },
    { exerciseId: 'raise', sets: 1, restSeconds: 75 },
  ];
  assert.deepEqual(nextAfterSet(items, { curl: 1 }, 'curl'), { exerciseId: 'pushdown', rest: false });
  assert.deepEqual(nextAfterSet(items, { curl: 1, pushdown: 1 }, 'pushdown'), { exerciseId: 'curl', rest: true });
  assert.deepEqual(nextAfterSet(items, { curl: 2, pushdown: 1 }, 'curl'), { exerciseId: 'pushdown', rest: false });
  // The plan was two sets. A third round still alternates, then rests.
  assert.deepEqual(nextAfterSet(items, { curl: 3, pushdown: 3 }, 'pushdown'), { exerciseId: 'curl', rest: true });
  assert.deepEqual(nextAfterSet(items, { curl: 4, pushdown: 3 }, 'curl'), { exerciseId: 'pushdown', rest: false });
  // Once the partner has been left, this exercise finishes alone and a rest is due.
  assert.deepEqual(nextAfterSet(items, { curl: 2, pushdown: 2 }, 'curl', ['pushdown']), { exerciseId: 'curl', rest: true });
  assert.deepEqual(nextAfterSet(items, { raise: 1 }, 'raise'), { exerciseId: 'raise', rest: true });
  assert.deepEqual(nextAfterSet(items, { raise: 4 }, 'raise'), { exerciseId: 'raise', rest: true });
});

test('a reorder that separates a superset runs both as straight sets', () => {
  const source: GymSetInput[] = [
    { exerciseId: 'row', sets: 2, restSeconds: 60, superset: 'A' },
    { exerciseId: 'curl', sets: 2, restSeconds: 60, superset: 'A' },
    { exerciseId: 'press', sets: 2, restSeconds: 90, superset: 'B' },
    { exerciseId: 'pushdown', sets: 2, restSeconds: 75, superset: 'B' },
  ];
  const separated = [source[0], source[2], source[1], source[3]];
  assert.deepEqual(splitSupersetLabels(source, separated, item => item.exerciseId), ['A', 'B']);
  const visits = gymSetOrder(separated);
  assert.ok(visits.every(visit => visit.superset == null));
  assert.deepEqual(
    visits.map(visit => visit.exerciseId),
    ['row', 'row', 'press', 'press', 'curl', 'curl', 'pushdown', 'pushdown'],
  );

  const reversed = [source[1], source[0], source[3], source[2]];
  assert.deepEqual(splitSupersetLabels(source, reversed, item => item.exerciseId), []);
  assert.equal(gymSetOrder(reversed)[0]?.superset, 'A');
  assert.equal(gymSetOrder(reversed)[1]?.superset, 'A');
});
