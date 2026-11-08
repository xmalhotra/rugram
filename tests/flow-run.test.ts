import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canPost,
  doneCard,
  elapsedSeconds,
  endRest,
  pauseRun,
  remainingSeconds,
  resumeRun,
  skipCard,
  startRun,
  tick,
  type RunCardInput,
} from '../shared/flow-run';

const cards: RunCardInput[] = [
  { cardId: 'a', sourceFlowId: 'flow', title: 'First', targetSeconds: 10 },
  { cardId: 'b', sourceFlowId: 'flow', title: 'Second', targetSeconds: 10 },
];

test('a card records its target when the clock runs out, then rests, and the last card does not rest', () => {
  let state = startRun(cards, 5, 0);
  state = tick(state, 12_000);
  assert.equal(state.phase, 'rest');
  assert.equal(state.index, 1);
  assert.equal(state.cards[0].status, 'done');
  assert.equal(state.cards[0].seconds, 10);
  assert.equal(remainingSeconds(state, 12_000), 3);
  state = endRest(state, 13_000);
  assert.equal(state.phase, 'card');
  assert.equal(state.index, 1);
  assert.equal(state.phaseStartedAt, 13_000);
  state = tick(state, 23_000);
  assert.equal(state.phase, 'finished');
  assert.equal(state.cards[1].status, 'done');
  assert.equal(state.cards[1].seconds, 10);
  assert.equal(tick(state, 99_000), state);
  assert.equal(canPost(state), true);
});

test('a long absence catches up across cards and rests', () => {
  const state = tick(startRun(cards, 5, 0), 100_000);
  assert.equal(state.phase, 'finished');
  assert.deepEqual(
    state.cards.map(card => [card.status, card.seconds]),
    [
      ['done', 10],
      ['done', 10],
    ],
  );
  assert.equal(canPost(state), true);
});

test('pause freezes the clock, and Done records only the active time', () => {
  let state = pauseRun(startRun(cards, 5, 0), 4_000);
  assert.equal(tick(state, 100_000), state);
  assert.equal(remainingSeconds(state, 100_000), 6);
  state = doneCard(state, 9_000);
  assert.equal(state.cards[0].seconds, 4);
  assert.equal(state.cards[0].status, 'done');
  assert.equal(state.phase, 'rest');
  assert.equal(state.pausedAt, null);
  state = pauseRun(state, 10_000);
  state = resumeRun(state, 16_000);
  assert.equal(state.pausedTotal, 6_000);
  assert.equal(remainingSeconds(state, 18_000), 2);
  const still = tick(state, 18_000);
  assert.equal(still.phase, 'rest');
  const next = tick(still, 21_000);
  assert.equal(next.phase, 'card');
  assert.equal(next.index, 1);
});

test('Skip marks the card and does not count as Done, and a run of only skips cannot post', () => {
  let state = skipCard(startRun(cards, 5, 1_000), 1_500);
  assert.equal(state.cards[0].status, 'skipped');
  assert.equal(state.cards[0].seconds, null);
  assert.equal(state.phase, 'rest');
  state = skipCard(endRest(state, 1_600), 1_700);
  assert.equal(state.phase, 'finished');
  assert.equal(canPost(state), false);
  assert.equal(doneCard(state, 2_000), state);
});

test('a manual card never auto-advances, while pause and skip still work', () => {
  const manual: RunCardInput[] = [
    { ...cards[0], manual: true },
    { ...cards[1], manual: true },
  ];
  let state = startRun(manual, 5, 0);
  assert.equal(tick(state, 100_000), state);
  assert.equal(state.phase, 'card');
  assert.equal(state.cards[0].status, 'pending');
  assert.equal(elapsedSeconds(state, 4_000), 4);
  state = pauseRun(state, 4_000);
  assert.equal(tick(state, 50_000), state);
  assert.equal(elapsedSeconds(state, 50_000), 4);
  state = resumeRun(state, 9_000);
  state = skipCard(state, 10_000);
  assert.equal(state.cards[0].status, 'skipped');
  assert.equal(state.phase, 'card');
  assert.equal(state.index, 1);
  state = doneCard(state, 12_500);
  assert.equal(state.phase, 'finished');
  assert.equal(state.cards[1].status, 'done');
  assert.equal(state.cards[1].seconds, 3);
  assert.equal(canPost(state), true);
});

test('finishing the last card early records the actual time and posts', () => {
  const state = doneCard(startRun([cards[0]], 30, 0), 2_600);
  assert.equal(state.phase, 'finished');
  assert.equal(state.cards[0].seconds, 3);
  assert.equal(remainingSeconds(state, 2_600), 0);
  assert.equal(canPost(state), true);
});
