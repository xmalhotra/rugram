import assert from 'node:assert/strict';
import test from 'node:test';
import { flows } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import { doneCard, endRest, skipCard, type FlowRunState } from '../shared/flow-run';
import { communityActionSchema } from '../src/lib/community-schema';
import {
  FlowRunError,
  beginRun,
  deleteMetrics,
  postRun,
  readFlowRuns,
  saveMetrics,
  saveRun,
  type FlowRunDeps,
} from '../src/lib/flow-run-store';
import type { PublicUser } from '../src/lib/types';
import type { MobileProfile } from '../shared/mobile';

const member = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function profile(flowIds: string[] = [], personalFlows: MobileProfile['personalFlows'] = []): MobileProfile {
  return {
    city: 'Hyderabad',
    flowIds,
    savedProductIds: [],
    completed: [],
    eventIds: [],
    personalFlows,
  };
}

function harness(flowsFor: (user: PublicUser) => MobileProfile) {
  const activities: { id: string; userId: string; cardIds: string[]; note: string }[] = [];
  const deps: FlowRunDeps = {
    demo: true,
    profile: async user => flowsFor(user),
    library: async () => flows,
    recordActivity: async (user, input) => {
      const id = `activity-${crypto.randomUUID()}`;
      activities.push({ id, userId: user.id, cardIds: input.cardIds, note: input.note });
      return { id };
    },
  };
  return { deps, activities };
}

function finishAll(state: FlowRunState, skipped = false) {
  let current = state;
  let at = state.phaseStartedAt;
  for (let guard = 0; guard < 20 && current.phase !== 'finished'; guard += 1) {
    at += 1000;
    current =
      current.phase === 'rest' ? endRest(current, at) : skipped ? skipCard(current, at) : doneCard(current, at);
  }
  return current;
}

test('metrics stay between 13 and 100 and 20 to 300 kg, and delete removes them', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const { deps } = harness(() => profile());
  const user = member('metrics-user');
  const now = Date.parse('2026-06-15T00:00:00.000Z');
  await assert.rejects(() => saveMetrics(user, { birthYear: 2014, weightKg: 70, lifestyle: 'active' }, deps, now), /13 to 100/);
  await assert.rejects(() => saveMetrics(user, { birthYear: 1925, weightKg: 70, lifestyle: 'active' }, deps, now), /13 to 100/);
  await assert.rejects(() => saveMetrics(user, { birthYear: 1990, weightKg: 19, lifestyle: 'active' }, deps, now), /20 to 300/);
  const saved = await saveMetrics(user, { birthYear: 1990, weightKg: 70.24, lifestyle: 'athlete' }, deps, now);
  assert.deepEqual(saved, { birthYear: 1990, weightKg: 70.2, lifestyle: 'athlete' });
  assert.deepEqual((await readFlowRuns(user, deps, now)).metrics, saved);
  await deleteMetrics(user, deps);
  assert.equal((await readFlowRuns(user, deps, now)).metrics, null);
});

test('a flow can be tried without adding it to the map', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const flow = flows.find(item => item.id === 'workout-animal-movements')!;
  const { deps } = harness(() => profile());
  const started = await beginRun(member('run-trier'), { kind: 'flow', id: flow.id, level: 'Regular' }, deps);
  assert.equal(started.run.flowId, flow.id);
});

test('a catalogue flow on the map can start, a second start resumes, and a stranger cannot save it', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member('run-owner');
  const other = member('run-other');
  const flow = flows.find(item => item.id === 'workout-animal-movements')!;
  const expected = resolveVisualFlow(flow, flows).cards.map(card => card.id);
  const { deps } = harness(user => (user.id === owner.id ? profile([flow.id]) : profile()));
  const started = await beginRun(owner, { kind: 'flow', id: flow.id, level: 'Regular' }, deps);
  assert.equal(started.resumed, false);
  assert.deepEqual(
    started.run.state.cards.map(card => card.cardId),
    expected,
  );
  const again = await beginRun(owner, { kind: 'flow', id: flow.id, level: 'Beginner' }, deps);
  assert.equal(again.resumed, true);
  assert.equal(again.run.id, started.run.id);
  assert.equal(again.run.level, 'Regular');
  await assert.rejects(() => beginRun(owner, { kind: 'flow', id: 'no-such-flow', level: 'Regular' }, deps), /Flow not found/);
  const tampered = {
    ...started.run.state,
    cards: started.run.state.cards.map((card, index) => (index === 0 ? { ...card, cardId: 'nope' } : card)),
  };
  await assert.rejects(() => saveRun(other, started.run.id, started.run.state, deps), /Only you can/);
  await assert.rejects(() => saveRun(owner, started.run.id, tampered, deps), /do not match/);
  const staleAt = Date.now() - 25 * 60 * 60 * 1000;
  globalThis.qramFlowRuns!.runs[0]!.updatedAt = new Date(staleAt).toISOString();
  assert.equal((await readFlowRuns(owner, deps)).running.length, 0);
  const replaced = await beginRun(owner, { kind: 'flow', id: flow.id, level: 'Trained' }, deps);
  assert.equal(replaced.resumed, false);
  assert.notEqual(replaced.run.id, started.run.id);
  assert.equal(globalThis.qramFlowRuns!.runs.find(run => run.id === started.run.id)?.status, 'abandoned');
  assert.equal(globalThis.qramFlowRuns!.runs.filter(run => run.status === 'running').length, 1);
  assert.equal((await readFlowRuns(owner, deps)).finished, 0);
});

test('posting requires a finished run with one Done card, and posting twice keeps one activity', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member('post-owner');
  const personalId = 'personal-postowner1';
  const { deps, activities } = harness(() =>
    profile([], [
      {
        id: personalId,
        name: 'Mine',
        cards: [
          { sourceFlowId: 'sleep', cardId: 'one', title: 'One' },
          { sourceFlowId: 'sleep', cardId: 'two', title: 'Two' },
        ],
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ]),
  );
  const started = await beginRun(owner, { kind: 'personal', id: personalId, level: 'Beginner' }, deps);
  await assert.rejects(() => postRun(owner, started.run.id, '', deps), /Finish the flow/);
  const skipped = finishAll(started.run.state, true);
  await saveRun(owner, started.run.id, skipped, deps);
  await assert.rejects(() => postRun(owner, started.run.id, '', deps), /at least one card/);
  const done = finishAll(started.run.state, false);
  await saveRun(owner, started.run.id, done, deps);
  const first = await postRun(owner, started.run.id, '  Good   start ', deps);
  const second = await postRun(owner, started.run.id, 'ignored', deps);
  assert.equal(second.activityId, first.activityId);
  assert.equal(activities.length, 1);
  assert.deepEqual(activities[0]?.cardIds, ['one', 'two']);
  assert.equal(activities[0]?.note, '  Good   start ');
  await assert.rejects(() => saveRun(owner, started.run.id, done, deps), FlowRunError);
});

test('a direct log is rejected', () => {
  assert.equal(
    communityActionSchema.safeParse({
      action: 'log',
      flowId: 'sleep',
      cardIds: ['bed'],
      note: '',
    }).success,
    false,
  );
});
