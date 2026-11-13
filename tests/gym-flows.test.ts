import assert from 'node:assert/strict';
import test from 'node:test';
import { flows } from '../shared/mobile';
import { catalogFlow } from '../shared/flow-catalog';
import { resolveVisualFlow } from '../shared/visual-flows';
import { exercise } from '../shared/exercises';
import { gymFlowById, gymTargetLabel } from '../shared/gym-flows';
import { beginRun, type FlowRunDeps } from '../src/lib/flow-run-store';
import type { PublicUser } from '../src/lib/types';
import type { MobileProfile } from '../shared/mobile';

const order = [
  'barbell-bent-over-row',
  'incline-dumbbell-curl',
  'mid-width-lat-pulldown',
  'close-grip-seated-row',
  'face-pull',
  'cable-curl',
];

test('Back + Biceps references the six paired exercises and is the live intermediate superset', () => {
  const flow = gymFlowById('gym-back-biceps');
  assert.ok(flow);
  assert.equal(flow.title, 'Back + Biceps');
  assert.equal(flow.level, 'Intermediate');
  assert.ok(flow.goal.length > 20);
  assert.deepEqual(
    flow.items.map(item => item.exerciseId),
    order,
  );
  assert.deepEqual(
    flow.items.map(gymTargetLabel),
    ['3 × 8', '3 × 10', '3 × 10', '3 × 10', '3 × 15', '3 × 12'],
  );
  assert.ok(flow.items.every(item => item.restSeconds === undefined));
  assert.deepEqual(
    flow.items.map(item => item.superset),
    ['A', 'A', 'B', 'B', 'C', 'C'],
  );
  const catalog = catalogFlow('gym-supersets-back-biceps-superset');
  assert.equal(catalog?.status, 'live');
  assert.equal(catalog?.flowId, 'gym-back-biceps');
});

test('the flow is in the library and its cards resolve with names and targets', () => {
  const habit = flows.find(item => item.id === 'gym-back-biceps');
  assert.ok(habit);
  const resolved = resolveVisualFlow(habit, flows);
  assert.equal(resolved.cards.length, 6);
  assert.deepEqual(
    resolved.cards.map(card => [card.title, card.description]),
    order.map((id, index) => [exercise(id)!.name, ['3 × 8', '3 × 10', '3 × 10', '3 × 10', '3 × 15', '3 × 12'][index]]),
  );
  assert.ok(resolved.cards.every(card => card.sessionGuide));
});

test('starting the gym flow makes every card manual', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const user: PublicUser = {
    id: 'gym-runner',
    handle: 'gym-runner',
    name: 'Gym',
    role: 'member',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
  const profile: MobileProfile = {
    city: 'Hyderabad',
    flowIds: ['gym-back-biceps'],
    savedProductIds: [],
    completed: [],
    eventIds: [],
  };
  const deps: FlowRunDeps = {
    demo: true,
    profile: async () => profile,
    library: async () => flows,
    recordActivity: async () => ({ id: 'activity-1' }),
  };
  const started = await beginRun(user, { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' }, deps);
  assert.equal(started.resumed, false);
  assert.equal(started.run.state.cards.length, 6);
  assert.ok(started.run.state.cards.every(card => card.manual === true));
  assert.deepEqual(
    started.run.state.cards.map(card => card.title),
    order.map(id => exercise(id)!.name),
  );
});
