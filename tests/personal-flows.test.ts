import test from 'node:test';
import assert from 'node:assert/strict';
import { flows } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import {
  defaultPersonalFlowName,
  findFlowCard,
  resolvePersonalFlow,
  updatePersonalFlows,
  type FlowCardReference,
  type PersonalFlow,
} from '../shared/personal-flows';
import { needsFocusOnboarding } from '../shared/flow-browse';

const now = '2026-10-24T01:00:00.000Z';
function reference(sourceFlowId: string, index = 0): FlowCardReference {
  const source = flows.find(flow => flow.id === sourceFlowId)!;
  const card = resolveVisualFlow(source, flows).cards[index];
  assert.ok(card);
  return { sourceFlowId, cardId: card.id, title: card.title };
}
const bear = reference('workout-animal-movements');
const squat = reference('workout-cindy', 2);
const sleep = reference('sleep', 1);
function create(name = 'Flow 1') {
  return updatePersonalFlows(
    [],
    { action: 'personal-flow-create', id: 'personal-first0001', name, ...bear },
    now,
    bear,
  );
}

test('personal flows use the next available editable default name', () => {
  assert.equal(defaultPersonalFlowName([]), 'Flow 1');
  const existing = create('fLoW 1');
  assert.equal(defaultPersonalFlowName(existing), 'Flow 2');
  assert.equal(
    defaultPersonalFlowName([...existing, { ...existing[0], id: 'other', name: 'Flow 3' }]),
    'Flow 2',
  );
});
test('cards from fitness and lifestyle can share one private flow without mutating originals', () => {
  const original = JSON.stringify(flows);
  let personal = create('  My morning  ');
  for (const card of [squat, sleep])
    personal = updatePersonalFlows(
      personal,
      { action: 'personal-flow-add', id: personal[0].id, ...card },
      now,
      card,
    );
  assert.equal(personal[0].name, 'My morning');
  assert.deepEqual(personal[0].cards, [bear, squat, sleep]);
  const resolved = resolvePersonalFlow(personal[0], flows);
  assert.deepEqual(
    resolved.cards.map(card => card.id),
    [bear.cardId, squat.cardId, sleep.cardId],
  );
  assert.deepEqual(resolved.missing, []);
  assert.ok(resolved.cards.every(card => card.sessionGuide));
  assert.ok(resolved.cards.at(-1)?.visualCard?.frames.length === 5);
  assert.equal(JSON.stringify(flows), original);
});
test('repeated creation and adding a shared card through a second collection are idempotent', () => {
  const personal = create();
  assert.equal(
    updatePersonalFlows(
      personal,
      { action: 'personal-flow-create', id: personal[0].id, name: 'Flow 1', ...bear },
      now,
      bear,
    ),
    personal,
  );
  assert.equal(
    updatePersonalFlows(
      personal,
      { action: 'personal-flow-add', id: personal[0].id, ...bear },
      now,
      { ...bear, sourceFlowId: bear.cardId },
    ),
    personal,
  );
  assert.throws(
    () =>
      updatePersonalFlows(
        personal,
        { action: 'personal-flow-create', id: personal[0].id, name: 'Different name', ...bear },
        now,
        bear,
      ),
    /already exists/,
  );
});
test('rename, reorder and removal preserve the remaining frames and do not mutate earlier state', () => {
  const original = create();
  let personal = updatePersonalFlows(
    original,
    { action: 'personal-flow-add', id: original[0].id, ...squat },
    now,
    squat,
  );
  personal = updatePersonalFlows(
    personal,
    { action: 'personal-flow-move', id: original[0].id, cardId: squat.cardId, direction: 'up' },
    now,
  );
  personal = updatePersonalFlows(
    personal,
    { action: 'personal-flow-rename', id: original[0].id, name: 'Before work' },
    now,
  );
  assert.deepEqual(
    personal[0].cards.map(card => card.cardId),
    [squat.cardId, bear.cardId],
  );
  assert.equal(personal[0].name, 'Before work');
  assert.equal(original[0].name, 'Flow 1');
  assert.deepEqual(original[0].cards, [bear]);
  personal = updatePersonalFlows(
    personal,
    { action: 'personal-flow-remove', id: original[0].id, cardId: bear.cardId },
    now,
  );
  assert.deepEqual(
    resolvePersonalFlow(personal[0], flows).cards.map(card => card.id),
    [squat.cardId],
  );
});
test('boundaries reject unknown flows, unavailable cards, empty names and oversized collections', () => {
  assert.throws(
    () =>
      updatePersonalFlows([], { action: 'personal-flow-add', id: 'not-owned', ...bear }, now, bear),
    /not found/,
  );
  assert.throws(
    () =>
      updatePersonalFlows(
        [],
        { action: 'personal-flow-create', id: 'p', name: '', ...bear },
        now,
        bear,
      ),
    /name must/,
  );
  assert.throws(
    () =>
      updatePersonalFlows(
        [],
        { action: 'personal-flow-create', id: 'p', name: 'x'.repeat(61), ...bear },
        now,
        bear,
      ),
    /name must/,
  );
  assert.throws(
    () =>
      updatePersonalFlows(
        [],
        { action: 'personal-flow-create', id: 'p', name: 'Flow', ...bear },
        now,
      ),
    /not available/,
  );
  const many = Array.from({ length: 50 }, (_, i) => ({ ...create()[0], id: `personal-${i}` }));
  assert.throws(
    () =>
      updatePersonalFlows(
        many,
        { action: 'personal-flow-create', id: 'new', name: 'New', ...bear },
        now,
        bear,
      ),
    /50 flows/,
  );
  const full = [
    {
      ...create()[0],
      cards: Array.from({ length: 100 }, (_, i) => ({ ...bear, cardId: `card-${i}` })),
    },
  ];
  assert.throws(
    () =>
      updatePersonalFlows(
        full,
        { action: 'personal-flow-add', id: full[0].id, ...squat },
        now,
        squat,
      ),
    /100 cards/,
  );
  assert.equal(findFlowCard(flows, 'missing', bear.cardId), undefined);
  assert.equal(findFlowCard(flows, 'workout-cindy', bear.cardId), undefined);
});
test('unpublished or retitled generated cards stay identifiable instead of silently becoming a different card', () => {
  const personal: PersonalFlow = {
    ...create()[0],
    cards: [sleep, { ...bear, sourceFlowId: 'removed-source' }],
  };
  const retitled = { ...sleep, title: 'An older editorial card' };
  assert.deepEqual(resolvePersonalFlow({ ...personal, cards: [retitled] }, flows).missing, [
    retitled,
  ]);
  const resolved = resolvePersonalFlow(
    personal,
    flows.filter(flow => flow.id !== 'sleep'),
  );
  assert.equal(resolved.cards.length, 0);
  assert.equal(resolved.missing.length, 2);
});
test('a personal flow counts as an added flow for Home onboarding; an empty one does not', () => {
  const personal = create();
  assert.equal(needsFocusOnboarding({ flowIds: [], personalFlows: personal }), false);
  assert.equal(
    needsFocusOnboarding({ flowIds: [], personalFlows: [{ ...personal[0], cards: [] }] }),
    true,
  );
});
