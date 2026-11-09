import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCustomflow,
  customflowKey,
  customflowSourceKinds,
  hasChanges,
  sourceMovedOn,
  withChange,
  type Customflow,
} from '../shared/customflows';
import { applyOrder, isCustomOrder, moveItem } from '../shared/item-order';
import { customflowActionSchema } from '../src/lib/customflow-store';

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

test('the API takes an order or a reset for a known kind of source', () => {
  const source = { kind: 'qram-flow', id: 'gym-back-biceps' };
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source, keys: ['a'] }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source, keys: null }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'reset', source }).success, true);
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source: { kind: 'blog', id: 'x' }, keys: ['a'] }).success, false);
  assert.equal(customflowActionSchema.safeParse({ action: 'order', source, keys: [] }).success, false);
});
