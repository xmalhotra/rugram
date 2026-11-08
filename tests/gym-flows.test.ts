import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { flows } from '../shared/mobile';
import { catalogFlow } from '../shared/flow-catalog';
import { resolveVisualFlow } from '../shared/visual-flows';
import { exercise } from '../shared/exercises';
import { gymFlowById, gymTargetLabel } from '../shared/gym-flows';
import { beginRun, type FlowRunDeps } from '../src/lib/flow-run-store';
import type { PublicUser } from '../src/lib/types';
import type { MobileProfile } from '../shared/mobile';

const order = [
  'single-arm-lat-pulldown',
  'mid-width-lat-pulldown',
  'mid-width-cable-row',
  'dual-pulley-straight-arm-pulldown',
  'reverse-pec-deck-fly',
  'rope-hammer-curl',
  'reverse-cable-curl',
];

test('Back + Biceps references the seven exercises and stays coming soon in the catalog', () => {
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
    ['3 × 10', '3 sets: 12, 11, 10', '3 sets: 12, 11, 10', '3 sets: 12, 11, 10', '3 sets: 12, 11, 10', '3 sets: 12, 11, 10', '3 sets: 12, 11, 10'],
  );
  assert.ok(flow.items.every(item => item.restSeconds === 90));
  const catalog = catalogFlow('gym-supersets-back-biceps-superset');
  assert.equal(catalog?.status, 'coming-soon');
  assert.equal(catalog?.flowId, 'gym-back-biceps');
  assert.ok(catalogFlowsStaySoon());
  const source = readFileSync('mobile/src/catalog-live.ts', 'utf8');
  assert.match(source, /__DEV__/);
  assert.match(source, /'gym-supersets-back-biceps-superset': 'gym-back-biceps'/);
});

function catalogFlowsStaySoon() {
  const catalog = readFileSync('shared/flow-catalog.ts', 'utf8');
  return catalog.includes("status: 'coming-soon'");
}

test('the flow is in the library and its cards resolve with names and targets', () => {
  const habit = flows.find(item => item.id === 'gym-back-biceps');
  assert.ok(habit);
  const resolved = resolveVisualFlow(habit, flows);
  assert.equal(resolved.cards.length, 7);
  assert.deepEqual(
    resolved.cards.map(card => [card.title, card.description]),
    order.map((id, index) => [exercise(id)!.name, index < 1 ? '3 × 10' : '3 sets: 12, 11, 10']),
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
  assert.equal(started.run.state.cards.length, 7);
  assert.ok(started.run.state.cards.every(card => card.manual === true));
  assert.deepEqual(
    started.run.state.cards.map(card => card.title),
    order.map(id => exercise(id)!.name),
  );
});
