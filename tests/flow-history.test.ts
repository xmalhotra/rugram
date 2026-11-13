import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { flows } from '../shared/mobile';
import type { MobileProfile } from '../shared/mobile';
import { doneCard, endRest, type FlowRunState } from '../shared/flow-run';
import {
  formatCardDetail,
  formatKnownTotal,
  formatLoggedSets,
  formatRunCount,
  formatRunWhen,
} from '../shared/flow-history';
import {
  beginRun,
  finishRun,
  flowHistoryQuerySchema,
  readFlowHistory,
  readFlowRuns,
  saveRun,
  type FlowRunDeps,
} from '../src/lib/flow-run-store';
import { logExerciseSets } from '../src/lib/exercise-log-store';
import type { PublicUser } from '../src/lib/types';

const member = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function profile(flowIds: string[] = []): MobileProfile {
  return { city: 'Hyderabad', flowIds, savedProductIds: [], completed: [], eventIds: [] };
}

function harness(): FlowRunDeps {
  return {
    demo: true,
    profile: async () => profile(['gym-back-biceps', 'workout-animal-movements']),
    library: async () => flows,
    recordActivity: async () => ({ id: 'activity-history' }),
  };
}

function finishAll(state: FlowRunState) {
  let current = state;
  let at = state.phaseStartedAt;
  for (let guard = 0; guard < 40 && current.phase !== 'finished'; guard += 1) {
    at += 1000;
    current = current.phase === 'rest' ? endRest(current, at) : doneCard(current, at);
  }
  return current;
}

test('history formatting matches the screen copy', () => {
  const today = new Date(2026, 10, 7, 19, 40);
  assert.equal(formatRunWhen(today.toISOString(), today), 'Today, 7:40 PM');
  const monday = new Date(2025, 10, 3, 19, 40);
  assert.equal(formatRunWhen(monday.toISOString(), today), 'Mon 3 Nov, 7:40 PM');
  assert.equal(formatRunCount(1, 5), '1 of 5 done');
  assert.equal(formatRunCount(5, 5), '5 of 5 done');
  assert.equal(formatRunCount(2, 5, true), '2 of 5 done · Not finished');
  assert.equal(
    formatLoggedSets([
      { setIndex: 1, weightKg: 40, reps: 12, durationSeconds: null },
      { setIndex: 2, weightKg: 45, reps: 11, durationSeconds: null },
      { setIndex: 3, weightKg: 50, reps: 10, durationSeconds: null },
    ]),
    '40 kg × 12, 45 kg × 11, 50 kg × 10',
  );
  assert.equal(
    formatLoggedSets([
      { setIndex: 1, weightKg: null, reps: 10, durationSeconds: null },
      { setIndex: 2, weightKg: null, reps: 9, durationSeconds: null },
      { setIndex: 3, weightKg: null, reps: 8, durationSeconds: null },
    ]),
    '10, 9, 8 reps',
  );
  assert.equal(
    formatLoggedSets([
      { setIndex: 1, weightKg: null, reps: null, durationSeconds: 40 },
      { setIndex: 2, weightKg: null, reps: null, durationSeconds: 35 },
      { setIndex: 3, weightKg: null, reps: null, durationSeconds: 30 },
    ]),
    '40, 35, 30 sec',
  );
  assert.equal(formatCardDetail({ status: 'skipped', seconds: null }, []), 'Skipped');
  assert.equal(formatCardDetail({ status: 'done', seconds: 45 }, []), '45 sec');
  assert.equal(formatKnownTotal([{ status: 'done', seconds: 45 }, { status: 'done', seconds: 75 }]), '2 min');
  assert.equal(formatKnownTotal([{ status: 'done', seconds: null }]), null);
});

test('history returns only the owner, a restart stays listed, and an abandoned run does not count', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  globalThis.qramExerciseLogs = [];
  const owner = member('history-owner');
  const other = member('history-other');
  const deps = harness();
  const logs = { demo: true as const };
  const first = await beginRun(
    owner,
    { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' },
    deps,
    Date.parse('2026-11-07T10:00:00.000Z'),
  );
  await logExerciseSets(
    owner,
    {
      action: 'log',
      runId: first.run.id,
      exerciseId: 'barbell-bent-over-row',
      sets: [
        { setIndex: 1, weightKg: 40, reps: 12 },
        { setIndex: 2, weightKg: 45, reps: 11 },
        { setIndex: 3, weightKg: 50, reps: 10 },
      ],
    },
    logs,
  );
  const left = await finishRun(owner, first.run.id, first.run.state, deps);
  assert.equal(left.status, 'abandoned');
  const afterLeave = await readFlowRuns(owner, deps);
  assert.equal(afterLeave.finished, 0);
  assert.deepEqual(afterLeave.finishedAt, []);
  assert.equal(afterLeave.running.length, 0);

  const second = await beginRun(
    owner,
    { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' },
    deps,
    Date.parse('2026-11-07T11:00:00.000Z'),
  );
  assert.equal(second.resumed, false);
  assert.notEqual(second.run.id, first.run.id);
  await logExerciseSets(
    owner,
    {
      action: 'log',
      runId: second.run.id,
      exerciseId: 'cable-curl',
      sets: [
        { setIndex: 1, weightKg: 15, reps: 10 },
        { setIndex: 2, weightKg: 15, reps: 9 },
        { setIndex: 3, weightKg: 15, reps: 8 },
      ],
    },
    logs,
  );
  const stranger = await beginRun(other, { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' }, deps);
  await logExerciseSets(
    other,
    {
      action: 'log',
      runId: stranger.run.id,
      exerciseId: 'barbell-bent-over-row',
      sets: [{ setIndex: 1, weightKg: 99, reps: 1 }],
    },
    logs,
  );

  const history = await readFlowHistory(owner, { history: 'gym-back-biceps', kind: 'flow' }, deps);
  assert.deepEqual(
    history.runs.map(run => run.status),
    ['running', 'abandoned'],
  );
  assert.equal(history.runs[0]?.id, second.run.id);
  assert.equal(history.runs[1]?.id, first.run.id);
  assert.equal(history.runs[1]?.status === 'running', false);
  const abandonedPull = history.runs[1]?.cards.find(card => card.exerciseId === 'barbell-bent-over-row');
  const abandonedCurl = history.runs[1]?.cards.find(card => card.exerciseId === 'cable-curl');
  const currentCurl = history.runs[0]?.cards.find(card => card.exerciseId === 'cable-curl');
  const currentPull = history.runs[0]?.cards.find(card => card.exerciseId === 'barbell-bent-over-row');
  assert.deepEqual(
    abandonedPull?.sets.map(set => [set.weightKg, set.reps]),
    [
      [40, 12],
      [45, 11],
      [50, 10],
    ],
  );
  assert.deepEqual(abandonedCurl?.sets, []);
  assert.deepEqual(
    currentCurl?.sets.map(set => set.reps),
    [10, 9, 8],
  );
  assert.deepEqual(currentPull?.sets, []);
  assert.equal(JSON.stringify(history.runs.map(run => run.cards.map(card => card.sets))).includes('99'), false);

  assert.deepEqual((await readFlowHistory(other, { history: 'gym-back-biceps', kind: 'flow' }, deps)).runs.map(run => run.id), [
    stranger.run.id,
  ]);
  assert.deepEqual((await readFlowHistory(owner, { history: 'gym-back-biceps', kind: 'personal' }, deps)).runs, []);
  assert.deepEqual((await readFlowHistory(member('history-third'), { history: 'gym-back-biceps', kind: 'flow' }, deps)).runs, []);

  const done = finishAll(second.run.state);
  await saveRun(owner, second.run.id, done, deps);
  await finishRun(owner, second.run.id, done, deps);
  const home = await readFlowRuns(owner, deps);
  assert.equal(home.finished, 1);
  assert.equal(home.finishedAt.length, 1);
  const afterFinish = await readFlowHistory(owner, { history: 'gym-back-biceps', kind: 'flow' }, deps);
  assert.equal(afterFinish.runs.filter(run => run.status === 'abandoned').length, 1);
  assert.equal(afterFinish.runs.some(run => run.status === 'running'), false);
});

test('a timed flow keeps each card’s seconds on that run', async () => {
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  globalThis.qramExerciseLogs = [];
  const owner = member('history-timed');
  const deps = harness();
  const started = await beginRun(owner, { kind: 'flow', id: 'workout-animal-movements', level: 'Regular' }, deps);
  const stepped = doneCard(started.run.state, started.run.state.phaseStartedAt + 45_000);
  await saveRun(owner, started.run.id, stepped, deps);
  const history = await readFlowHistory(owner, { history: 'workout-animal-movements', kind: 'flow' }, deps);
  assert.equal(history.runs[0]?.cards[0]?.seconds, 45);
  assert.equal(history.runs[0]?.cards[0]?.exerciseId, null);
  assert.deepEqual(history.runs[0]?.cards[0]?.sets, []);
  assert.equal(formatCardDetail(history.runs[0]!.cards[0]!, history.runs[0]!.cards[0]!.sets), '45 sec');
});

test('history query is strict, and the start screen sends Resume to History', () => {
  assert.equal(flowHistoryQuerySchema.safeParse({ history: 'cal-upper-beginner', kind: 'flow' }).success, true);
  assert.equal(flowHistoryQuerySchema.safeParse({ history: 'cal-upper-beginner', kind: 'personal', extra: '1' }).success, false);
  assert.equal(flowHistoryQuerySchema.safeParse({ kind: 'flow' }).success, false);
  const flow = readFileSync('mobile/src/FlowRun.tsx', 'utf8');
  const history = readFileSync('mobile/src/FlowHistory.tsx', 'utf8');
  const start = flow.slice(flow.indexOf('function FlowStartScreen'), flow.indexOf('export function FlowRun'));
  assert.ok(start.includes('function FlowStartScreen'));
  assert.match(start, /History, one flow in progress/);
  assert.match(start, /'History'/);
  assert.match(start, /title="Start"/);
  assert.doesNotMatch(start, /Resume|Start over|You're/);
  assert.match(flow, /Start again\?/);
  assert.match(flow, /Your unfinished run stays in History\./);
  assert.match(history, /accessibilityLabel="Resume"/);
  assert.match(history, /Nothing here yet\. Finish this flow and it shows up here\./);
  assert.match(history, /Starting again keeps this run here\./);
});
