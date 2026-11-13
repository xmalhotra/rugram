import assert from 'node:assert/strict';
import test from 'node:test';
import { flows } from '../shared/mobile';
import { doneCard, endRest, type FlowRunState } from '../shared/flow-run';
import { gymFlowById } from '../shared/gym-flows';
import { bodyFlowGet } from '../src/lib/body-flow-store';
import { logExerciseSets } from '../src/lib/exercise-log-store';
import { beginRun, finishRun, saveRun, type FlowRunDeps } from '../src/lib/flow-run-store';
import { graduatedFlowCount, readGraduation } from '../src/lib/graduation-store';
import type { PublicUser } from '../src/lib/types';
import type { MobileProfile } from '../shared/mobile';

const flowId = 'gym-back-chest-supported-row';

const member = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function profile(): MobileProfile {
  return {
    city: 'Hyderabad',
    flowIds: [],
    savedProductIds: [],
    completed: [],
    eventIds: [],
    personalFlows: [],
  };
}

function harness(): FlowRunDeps {
  return {
    demo: true,
    profile: async () => profile(),
    library: async () => flows,
    recordActivity: async () => ({ id: `activity-${crypto.randomUUID()}` }),
  };
}

function finishAll(state: FlowRunState) {
  let current = state;
  let at = state.phaseStartedAt;
  for (let guard = 0; guard < 30 && current.phase !== 'finished'; guard += 1) {
    at += 1000;
    current = current.phase === 'rest' ? endRest(current, at) : doneCard(current, at);
  }
  return current;
}

function reset() {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  globalThis.qramExerciseLogs = [];
}

async function logTop(user: PublicUser, runId: string, when: number) {
  const gym = gymFlowById(flowId);
  assert.ok(gym);
  for (const entry of gym.items) {
    await logExerciseSets(
      user,
      {
        action: 'log',
        runId,
        exerciseId: entry.exerciseId,
        sets: Array.from({ length: entry.sets }, (_, index) => ({
          setIndex: index + 1,
          weightKg: 20,
          reps: entry.repsMax,
        })),
      },
      { demo: true },
      when,
    );
  }
}

test('stored logs say when a flow is outgrown, and another member’s logs do not', async () => {
  reset();
  const deps = harness();
  const owner = member(`grad-${crypto.randomUUID()}`);
  const other = member(`grad-${crypto.randomUUID()}`);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (const when of [now - 21 * day, now - 14 * day]) {
    const started = await beginRun(owner, { kind: 'flow', id: flowId, level: 'Beginner' }, deps, when);
    assert.equal(started.resumed, false);
    await logTop(owner, started.run.id, when);
    const finished = finishAll(started.run.state);
    assert.equal(finished.phase, 'finished');
    await finishRun(owner, started.run.id, finished, deps, when);
  }

  const open = await beginRun(owner, { kind: 'flow', id: flowId, level: 'Beginner' }, deps, now - 60 * 60 * 1000);
  await logTop(owner, open.run.id, now - 60 * 60 * 1000);
  await saveRun(owner, open.run.id, finishAll(open.run.state), deps, now - 60 * 60 * 1000);

  const result = await readGraduation(owner, flowId, true, now);
  assert.equal(result.ready, true);
  assert.equal(result.reason, 'Top of the range on 4 of 4 exercises, 3 sessions running');
  assert.equal(result.next?.flowId, 'gym-back-pull-up-and-row-day');
  assert.equal(result.next?.level, 'Intermediate');
  assert.equal(await graduatedFlowCount(owner, true, now), 1);

  const hidden = await readGraduation(other, flowId, true, now);
  assert.equal(hidden.ready, false);
  assert.equal(hidden.reason, 'Not enough sessions yet');
  assert.equal(await graduatedFlowCount(other, true, now), 0);

  const date = new Date(now).toISOString().slice(0, 10);
  const body = await bodyFlowGet(`http://local/api/mobile/body-flow?range=week&date=${date}`, {
    user: owner,
    allow: true,
    demo: true,
  });
  assert.equal(body.status, 200);
  assert.equal(body.body.graduatedFlows, 1);
});

test('a swapped exercise is judged on the replacement the member actually logs', async () => {
  reset();
  const { changeCustomflow } = await import('../src/lib/customflow-store');
  const deps = harness();
  const owner = member(`grad-swap-${crypto.randomUUID()}`);
  const source = { kind: 'qram-flow' as const, id: flowId, version: null };
  await changeCustomflow(owner, { action: 'reset', source });
  await changeCustomflow(owner, { action: 'swap', source, key: 'machine-seated-row', exerciseId: 'mid-width-cable-row' });
  const gym = gymFlowById(flowId);
  assert.ok(gym);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  for (const when of [now - 21 * day, now - 14 * day, now - 7 * day]) {
    const started = await beginRun(owner, { kind: 'flow', id: flowId, level: 'Beginner' }, deps, when);
    for (const entry of gym.items) {
      await logExerciseSets(
        owner,
        {
          action: 'log',
          runId: started.run.id,
          exerciseId: entry.exerciseId === 'machine-seated-row' ? 'mid-width-cable-row' : entry.exerciseId,
          sets: Array.from({ length: entry.sets }, (_, index) => ({ setIndex: index + 1, weightKg: 20, reps: entry.repsMax })),
        },
        { demo: true },
        when,
      );
    }
    await finishRun(owner, started.run.id, finishAll(started.run.state), deps, when);
  }
  const result = await readGraduation(owner, flowId, true, now);
  assert.equal(result.ready, true);
  assert.equal(result.reason, 'Top of the range on 4 of 4 exercises, 3 sessions running');
  await changeCustomflow(owner, { action: 'reset', source });
});
