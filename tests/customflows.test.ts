import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCustomflow,
  customflowKey,
  customflowSlots,
  customflowSourceKinds,
  hasChanges,
  sourceMovedOn,
  swappedFrom,
  withChange,
  type Customflow,
} from '../shared/customflows';
import { gymFlowById, gymRestSeconds } from '../shared/gym-flows';
import { finisherFor, flowLevelOf } from '../shared/priority-finisher';
import { changePersonalMetric } from '../src/lib/personal-metric-store';
import { restFor } from '../shared/exercise-rest';
import { applyOrder, isCustomOrder, moveItem } from '../shared/item-order';
import { changeCustomflow, customflowActionSchema } from '../src/lib/customflow-store';
import type { PublicUser } from '../src/lib/types';

const items = ['a', 'b', 'c', 'd'].map(id => ({ id }));
const ids = (list: { id: string }[]) => list.map(item => item.id);
const flow = (order?: string[], version: number | null = null): Customflow => ({
  source: { kind: version == null ? 'qram-flow' : 'community-flow', id: 'x', version },
  changes: order ? { order } : {},
  createdAt: '2026-11-09T00:00:00Z',
  updatedAt: '2026-11-09T00:00:00Z',
});

test('a Customflow reorders its source; items it never placed stay at the end', () => {
  assert.deepEqual(ids(applyCustomflow(items, flow(['c', 'a']), item => item.id)), ['c', 'a', 'b', 'd']);
  assert.deepEqual(ids(applyCustomflow(items, undefined, item => item.id)), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(applyOrder(items, ['d', 'gone', 'd', 'b'], item => item.id)), ['d', 'b', 'a', 'c']);
});

test('changes come and go; an empty Customflow has nothing left to keep', () => {
  const ordered = withChange({}, 'order', ['b', 'a']);
  assert.equal(hasChanges(ordered), true);
  assert.equal(hasChanges(withChange(ordered, 'order', null)), false);
  assert.equal(hasChanges({ order: [] }), false);
  const swapped = withChange({}, 'swaps', { a: 'c' });
  assert.equal(hasChanges(swapped), true);
  assert.equal(hasChanges({ swaps: {} }), false);
  assert.equal(hasChanges({ removed: ['b'] }), true);
  assert.equal(hasChanges({ removed: [] }), false);
  assert.deepEqual(ids(applyCustomflow(items, { ...flow(), changes: { removed: ['b'] } }, item => item.id)), ['a', 'c', 'd']);
  assert.deepEqual(
    ids(applyCustomflow(items, { ...flow(), changes: { order: ['c'], removed: ['b'] } }, item => item.id)),
    ['c', 'a', 'd'],
  );
  const both = { order: ['b', 'a'], swaps: { a: 'c' } };
  assert.equal(hasChanges(withChange(both, 'swaps', null)), true);
  assert.equal(hasChanges(withChange(withChange(both, 'swaps', null), 'order', null)), false);
});

test('a swap replaces the exercise and keeps the slot', () => {
  const items = [
    { exerciseId: 'machine-seated-row', sets: 3, repsMin: 8, repsMax: 10, scheme: 'kept', superset: 'A' },
    { exerciseId: 'close-grip-seated-row', sets: 2, repsMin: 10, repsMax: 12, restSeconds: 90 },
  ];
  const custom: Customflow = {
    ...flow(),
    changes: { order: ['close-grip-seated-row', 'machine-seated-row'], swaps: { 'machine-seated-row': 'mid-width-cable-row' } },
  };
  const applied = applyCustomflow(items, custom, item => item.exerciseId);
  assert.deepEqual(applied.map(item => item.exerciseId), ['close-grip-seated-row', 'mid-width-cable-row']);
  assert.equal(applied[1].sets, 3);
  assert.equal(applied[1].repsMin, 8);
  assert.equal(applied[1].repsMax, 10);
  assert.equal(applied[1].scheme, 'kept');
  assert.equal(applied[1].superset, 'A');
  assert.equal(applied[1].restSeconds, undefined);
  assert.equal(gymRestSeconds(applied[1]), restFor('mid-width-cable-row'));
  assert.equal(applied[0].restSeconds, 90);
  assert.equal(gymRestSeconds(applied[0]), 90);
  const slots = customflowSlots(items, custom);
  assert.deepEqual(slots.map(slot => slot.sourceId), ['close-grip-seated-row', 'machine-seated-row']);
  assert.equal(swappedFrom(custom.changes, 'mid-width-cable-row'), 'machine-seated-row');
  assert.equal(swappedFrom(custom.changes, 'close-grip-seated-row'), null);
});

test('a versioned source can move on; Qram sources never do', () => {
  assert.equal(sourceMovedOn(flow(['a'], 3), 4), true);
  assert.equal(sourceMovedOn(flow(['a'], 3), 3), false);
  assert.equal(sourceMovedOn(flow(['a']), 9), false);
  assert.deepEqual(customflowSourceKinds, ['qram-flow', 'qram-session', 'community-flow']);
  assert.equal(customflowKey('qram-session', 's1'), 'qram-session:s1');
});

test('moving items and spotting a custom order', () => {
  assert.deepEqual(ids(moveItem(items, 0, 2)), ['b', 'c', 'a', 'd']);
  assert.deepEqual(ids(moveItem(items, 3, 0)), ['d', 'a', 'b', 'c']);
  assert.deepEqual(ids(moveItem(items, 9, 0)), ['a', 'b', 'c', 'd']);
  assert.equal(isCustomOrder(['a', 'b'], ['a', 'b']), false);
  assert.equal(isCustomOrder(['a', 'b'], ['b', 'a']), true);
});

test('the API takes an order, a swap, or a reset for a known kind of source', () => {
  const source = { kind: 'qram-flow', id: 'gym-back-biceps' };
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source, keys: ['a'] }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source, keys: null }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'swap', source, key: 'barbell-bent-over-row', exerciseId: 'mid-width-cable-row' }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'swap', source, key: 'barbell-bent-over-row', exerciseId: null }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'reset', source }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'remove', source, key: 'barbell-bent-over-row', out: true }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'remove', source, key: 'barbell-bent-over-row', out: false }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source: { kind: 'blog', id: 'x' }, keys: ['a'] }).success, false);
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source, keys: [] }).success, false);
});

test('a saved swap is kept, and clearing the last change deletes the Customflow', async () => {
  const user: PublicUser = {
    id: 'customflow-swap-test',
    handle: 'swap',
    name: 'Swap',
    role: 'member',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
  const source = { kind: 'qram-flow' as const, id: 'gym-back-biceps', version: null };
  await changeCustomflow(user, { action: 'reset', source });
  const saved = await changeCustomflow(user, {
    action: 'swap',
    source,
    key: 'barbell-bent-over-row',
    exerciseId: 'chest-supported-dumbbell-row',
  });
  assert.equal(saved['qram-flow:gym-back-biceps']?.changes.swaps?.['barbell-bent-over-row'], 'chest-supported-dumbbell-row');
  await assert.rejects(
    () => changeCustomflow(user, { action: 'swap', source, key: 'barbell-bent-over-row', exerciseId: 'not-an-exercise' }),
    /Unknown exercise/,
  );
  await assert.rejects(
    () => changeCustomflow(user, { action: 'swap', source, key: 'barbell-bent-over-row', exerciseId: 'close-grip-seated-row' }),
    /already includes/,
  );
  const cleared = await changeCustomflow(user, { action: 'swap', source, key: 'barbell-bent-over-row', exerciseId: null });
  assert.equal(cleared['qram-flow:gym-back-biceps'], undefined);
});

test('a session swap is keyed by a block that has an exercise', async () => {
  const user: PublicUser = {
    id: 'session-swap-member',
    handle: 'session-swap',
    name: 'Session swap',
    role: 'member',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
  const source = { kind: 'qram-session' as const, id: 'lower-body', version: null };
  await changeCustomflow(user, { action: 'reset', source });
  await assert.rejects(
    () => changeCustomflow(user, { action: 'swap', source: { kind: 'qram-session', id: 'missing-session', version: null }, key: 'press', exerciseId: 'goblet-squat' }),
    /Unknown session/,
  );
  await assert.rejects(
    () => changeCustomflow(user, { action: 'swap', source: { kind: 'qram-session', id: 'easy-run', version: null }, key: 'run', exerciseId: 'air-squat' }),
    /no exercise/,
  );
  await assert.rejects(
    () => changeCustomflow(user, { action: 'swap', source, key: 'hinge', exerciseId: 'barbell-back-squat' }),
    /already includes/,
  );
  const saved = await changeCustomflow(user, { action: 'swap', source, key: 'press', exerciseId: 'goblet-squat' });
  assert.equal(saved['qram-session:lower-body']?.changes.swaps?.press, 'goblet-squat');
  const cleared = await changeCustomflow(user, { action: 'swap', source, key: 'press', exerciseId: null });
  assert.equal(cleared['qram-session:lower-body'], undefined);
});

test('a member can drop a priority finisher, and an exercise that is not in the flow is refused', async () => {
  const owner: PublicUser = {
    id: `priority-remove-${crypto.randomUUID()}`,
    handle: 'priority',
    name: 'Priority',
    role: 'member',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
  assert.notEqual(owner.id, '1');
  const gym = gymFlowById('gym-arms-beginner');
  assert.ok(gym);
  await changePersonalMetric(owner, { action: 'set', metric: 'gym.priorities', value: { areas: ['forearms'] } });
  const finisher = finisherFor(gym.items, ['forearms'], flowLevelOf(gym.level))[0];
  assert.ok(finisher);
  const source = { kind: 'qram-flow' as const, id: gym.id, version: null };
  const saved = await changeCustomflow(owner, { action: 'remove', source, key: finisher.exerciseId, out: true });
  assert.deepEqual(saved[`qram-flow:${gym.id}`]?.changes.removed, [finisher.exerciseId]);
  await assert.rejects(
    () => changeCustomflow(owner, { action: 'remove', source, key: 'not-a-real-move', out: true }),
    /not in this flow/,
  );
  const back = await changeCustomflow(owner, { action: 'remove', source, key: finisher.exerciseId, out: false });
  assert.equal(back[`qram-flow:${gym.id}`], undefined);
});
