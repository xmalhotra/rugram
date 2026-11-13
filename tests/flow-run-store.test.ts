import assert from 'node:assert/strict';
import test from 'node:test';
import { gymFlowById } from '../shared/gym-flows';
import { flows } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import { doneCard, endRest, skipCard, type FlowRunState } from '../shared/flow-run';
import { logExerciseSets } from '../src/lib/exercise-log-store';
import { communityActionSchema } from '../src/lib/community-schema';
import {
  FlowRunError,
  beginRun,
  deleteMetrics,
  finishRun,
  postRun,
  readFlowHistory,
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

test('a community run starts the saved version, and the current one when none is named', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const bag = globalThis as {
    qramDemoCommunity?: {
      flows: Map<string, { id: string; authorId: string; title: string; version: number; cards: { cardId: string; sourceFlowId: string; title: string }[] }>;
      versions: Map<string, { version: number; title: string; cards: { cardId: string; sourceFlowId: string; title: string }[] }[]>;
    };
    rugramDemoStore?: { users: { id: string; disabled?: boolean }[] };
  };
  const previous = bag.qramDemoCommunity;
  const authorId = `run-author-${crypto.randomUUID()}`;
  const id = `community-${crypto.randomUUID()}`;
  const saved = [{ cardId: 'saved-card', sourceFlowId: 'workout-animal-movements', title: 'Saved card' }];
  const current = [{ cardId: 'current-card', sourceFlowId: 'workout-animal-movements', title: 'Current card' }];
  bag.qramDemoCommunity = {
    flows: new Map([[id, { id, authorId, title: 'Current title', version: 2, cards: current }]]),
    versions: new Map([[id, [{ version: 1, title: 'Saved title', cards: saved }]]]),
  };
  if (bag.rugramDemoStore) bag.rugramDemoStore.users.push({ id: authorId });
  const { deps } = harness(() => profile());
  const person = member(`run-community-${crypto.randomUUID()}`);
  try {
    const pinned = await beginRun(person, { kind: 'flow', id, level: 'Regular', version: 1 }, deps);
    assert.equal(pinned.run.kind, 'flow');
    assert.ok(pinned.run.flowId.startsWith('community-'));
    assert.equal(pinned.run.title, 'Saved title');
    assert.equal(pinned.run.state.cards[0]?.title, 'Saved card');
    const latest = await beginRun(member(`run-community-latest-${crypto.randomUUID()}`), { kind: 'flow', id, level: 'Regular' }, deps);
    assert.equal(latest.run.title, 'Current title');
    assert.equal(latest.run.state.cards[0]?.title, 'Current card');
  } finally {
    bag.qramDemoCommunity = previous;
    if (bag.rugramDemoStore) bag.rugramDemoStore.users = bag.rugramDemoStore.users.filter(row => row.id !== authorId);
  }
});

test('history keeps fewer sets than planned, and more, without filling the plan', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  globalThis.qramExerciseLogs = [];
  const gym = gymFlowById('gym-back-biceps');
  const row = gym?.items.find(item => item.exerciseId === 'barbell-bent-over-row');
  const curl = gym?.items.find(item => item.exerciseId === 'cable-curl');
  assert.ok(gym && row && curl && row.sets > 1 && curl.sets > 0);
  const owner = member('sets-owner');
  const { deps } = harness(() => profile());
  const started = await beginRun(owner, { kind: 'flow', id: gym.id, level: 'Regular' }, deps);
  const fewer = Array.from({ length: row.sets - 1 }, (_, index) => ({
    setIndex: index + 1,
    weightKg: 40,
    reps: 8,
  }));
  const more = Array.from({ length: curl.sets + 2 }, (_, index) => ({
    setIndex: index + 1,
    weightKg: 12,
    reps: 10,
  }));
  await logExerciseSets(owner, { action: 'log', runId: started.run.id, exerciseId: row.exerciseId, sets: fewer }, { demo: true });
  await logExerciseSets(owner, { action: 'log', runId: started.run.id, exerciseId: curl.exerciseId, sets: more }, { demo: true });
  const done = finishAll(started.run.state);
  await finishRun(owner, started.run.id, done, deps);
  const history = await readFlowHistory(owner, { history: gym.id, kind: 'flow' }, deps);
  const rowCard = history.runs[0]?.cards.find(card => card.exerciseId === row.exerciseId);
  const curlCard = history.runs[0]?.cards.find(card => card.exerciseId === curl.exerciseId);
  assert.equal(rowCard?.sets.length, row.sets - 1);
  assert.equal(curlCard?.sets.length, curl.sets + 2);
  assert.ok(rowCard?.sets.every(set => set.status !== 'skipped'));
  assert.ok(curlCard?.sets.every(set => set.status !== 'skipped'));
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
