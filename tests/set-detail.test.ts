import assert from 'node:assert/strict';
import test from 'node:test';
import { flows } from '../shared/mobile';
import type { MobileProfile } from '../shared/mobile';
import { exercise } from '../shared/exercises';
import { gymFlowItem } from '../shared/gym-flows';
import { beginCardClock, elapsedSeconds, startRun } from '../shared/flow-run';
import { formatEffort, formatLoggedSets } from '../shared/flow-history';
import { effortNote } from '../shared/progression';
import { planWithScheme, schemeById } from '../shared/set-schemes';
import {
  buildSetDetail,
  effortRating,
  exerciseTiming,
  keptWeight,
  restBeforeSeconds,
  resolveTimeSource,
  setsForProgression,
  yourLastLine,
} from '../shared/set-detail';
import { beginRun, flowRunSchema, readFlowHistory, readFlowRuns, saveMetrics, saveRun, type FlowRunDeps } from '../src/lib/flow-run-store';
import { logExerciseSets, readExerciseSessions } from '../src/lib/exercise-log-store';
import { trainingPost } from '../src/lib/training-store';
import { trainingCatalog } from '../shared/training-seed';
import type { PublicUser } from '../src/lib/types';

const user = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function profile(flowIds: string[]): MobileProfile {
  return { city: 'Hyderabad', flowIds, savedProductIds: [], completed: [], eventIds: [] };
}

const clockInput = {
  status: 'done' as const,
  plannedWeightKg: 40,
  plannedReps: 12,
  plannedSeconds: null,
  schemeId: 'the-scheme',
  openedAt: 1_000,
  completedAt: 31_000,
  previousCompletedAt: null as number | null,
  restPlannedSeconds: 90,
  durationSeconds: 30,
  clockRan: true,
  typedSeconds: false,
  edited: false,
};

test('detail records the plan, the clock, and a later typed edit', () => {
  const built = buildSetDetail(clockInput);
  assert.equal(built.status, 'done');
  assert.equal(built.plannedWeightKg, 40);
  assert.equal(built.schemeId, 'the-scheme');
  assert.equal(built.startedAt, new Date(1_000).toISOString());
  assert.equal(built.completedAt, new Date(31_000).toISOString());
  assert.equal(built.timeSource, 'clock');
  assert.equal(built.edited, false);
  assert.equal(resolveTimeSource({ durationSeconds: 30, clockRan: true, typedSeconds: true }), 'typed');
  const edited = buildSetDetail({ ...clockInput, typedSeconds: true, edited: true, completedAt: 31_000 });
  assert.equal(edited.timeSource, 'typed');
  assert.equal(edited.edited, true);
  assert.equal(edited.completedAt, new Date(31_000).toISOString());
});

test('rest is the real gap, and the first set has none', () => {
  assert.equal(restBeforeSeconds(null, 5_000), null);
  assert.equal(restBeforeSeconds(1_000, 91_000), 90);
  assert.equal(restBeforeSeconds(1_000, 1_400), 0);
  const followed = buildSetDetail({ ...clockInput, previousCompletedAt: 1_000, openedAt: 4_000, restPlannedSeconds: 90 });
  assert.equal(followed.restBeforeSeconds, 3);
  assert.equal(followed.restPlannedSeconds, 90);
});

test('active time leaves pause out', () => {
  assert.deepEqual(exerciseTiming({ openedAt: 0, closedAt: 20_000, pausedMs: 7_000 }), {
    activeSeconds: 13,
    pausedSeconds: 7,
  });
});

test('a manual exercise clock starts when the countdown ends, and a timed card does not move', () => {
  const manual = startRun(
    [{ cardId: 'curl', sourceFlowId: 'gym', title: 'Curl', targetSeconds: 0, manual: true }],
    0,
    1_000,
  );
  const started = beginCardClock(manual, 4_000);
  assert.equal(started.phaseStartedAt, 4_000);
  assert.equal(started.cards[0]?.openedAt, 4_000);
  assert.equal(elapsedSeconds(started, 17_000), 13);
  const timed = startRun([{ cardId: 'card', sourceFlowId: 'flow', title: 'Card', targetSeconds: 30 }], 0, 1_000);
  assert.equal(beginCardClock(timed, 4_000).phaseStartedAt, 1_000);
  assert.equal(elapsedSeconds(timed, 14_000), 13);
});

test('skipped sets are stored and ignored by prefill, your last, progression and history numbers', async () => {
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = user('detail-owner');
  const deps = { demo: true as const };
  const runDeps: FlowRunDeps = {
    demo: true,
    profile: async () => profile(['gym-back-biceps']),
    library: async () => flows,
    recordActivity: async () => ({ id: 'activity-detail' }),
  };
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  const started = await beginRun(owner, { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' }, runDeps, now);
  await logExerciseSets(
    owner,
    {
      action: 'log',
      runId: started.run.id,
      exerciseId: 'rope-hammer-curl',
      sets: [
        {
          setIndex: 1,
          weightKg: 15,
          reps: 10,
          detail: {
            status: 'done',
            plannedWeightKg: 14,
            plannedReps: 12,
            schemeId: 'the-scheme',
            startedAt: new Date(now).toISOString(),
            completedAt: new Date(now + 30_000).toISOString(),
            restPlannedSeconds: 90,
            edited: true,
          },
        },
        { setIndex: 2, weightKg: 999, reps: 8, detail: { status: 'skipped', plannedWeightKg: 16, plannedReps: 10 } },
      ],
    },
    deps,
    now,
  );
  const stored = globalThis.qramExerciseLogs ?? [];
  assert.equal(stored.length, 2);
  assert.equal(stored[1]?.detail.status, 'skipped');
  assert.equal(stored[1]?.weightKg, null);
  assert.equal(stored[1]?.reps, null);
  assert.equal(stored[0]?.detail.edited, true);
  assert.equal(stored[0]?.detail.completedAt, new Date(now + 30_000).toISOString());
  const session = await readExerciseSessions(owner, ['rope-hammer-curl'], deps);
  assert.deepEqual(
    session.sessions[0]?.sets.map(set => ({ weightKg: set.weightKg, reps: set.reps, durationSeconds: set.durationSeconds })),
    [{ weightKg: 15, reps: 10, durationSeconds: null }],
  );
  // The rest saved with a set comes back, so next time can start from it.
  assert.ok(session.sessions[0]?.sets.every(set => 'restSeconds' in set && 'setIndex' in set));
  assert.equal(yourLastLine(session.sessions[0]?.sets ?? []).includes('999'), false);
  assert.equal(yourLastLine(session.sessions[0]?.sets ?? []), '15 kg × 10');
  const move = exercise('rope-hammer-curl');
  const item = gymFlowItem('gym-back-biceps', 'rope-hammer-curl');
  assert.ok(move && item);
  const mixed = [
    { weightKg: 15, reps: 10, durationSeconds: null, status: 'done' as const },
    { weightKg: 999, reps: 8, durationSeconds: null, status: 'skipped' as const },
  ];
  assert.equal(setsForProgression(mixed).some(set => set.weightKg === 999), false);
  const plan = planWithScheme(move, item, schemeById(item.scheme), mixed);
  assert.equal(JSON.stringify(plan).includes('999'), false);
  const history = await readFlowHistory(owner, { history: 'gym-back-biceps', kind: 'flow' }, runDeps);
  const line = formatLoggedSets(history.runs[0]?.cards.find(card => card.exerciseId === 'rope-hammer-curl')?.sets ?? []);
  assert.match(line, /Skipped/);
  assert.equal(line.includes('999'), false);
  assert.match(line, /15 kg × 10/);
  const pushUp = exercise('push-up');
  const pushItem = gymFlowItem('cal-upper-beginner', 'push-up');
  assert.ok(pushUp && pushItem);
  assert.match(effortNote(pushUp, pushItem, [{ weightKg: null, reps: 3, status: 'skipped' }]) ?? '', /First time/);
});

test('old clients can omit detail, and a time more than a day ahead is rejected', async () => {
  globalThis.qramExerciseLogs = [];
  const owner = user('detail-old');
  const deps = { demo: true as const };
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  const saved = await logExerciseSets(
    owner,
    { action: 'log', exerciseId: 'pull-up', sets: [{ setIndex: 1, weightKg: null, reps: 8 }] },
    deps,
    now,
  );
  assert.equal(saved?.sets[0]?.reps, 8);
  assert.equal(globalThis.qramExerciseLogs?.[0]?.detail.status, 'done');
  await logExerciseSets(
    owner,
    {
      action: 'log',
      exerciseId: 'push-up',
      sets: [{ setIndex: 1, weightKg: null, reps: null, detail: { status: 'skipped' } }],
    },
    deps,
    now,
  );
  assert.equal((await readExerciseSessions(owner, ['push-up'], deps)).sessions.length, 0);
  await assert.rejects(
    () =>
      logExerciseSets(
        owner,
        {
          action: 'log',
          exerciseId: 'pull-up',
          sets: [
            {
              setIndex: 1,
              weightKg: null,
              reps: 8,
              detail: { startedAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString() },
            },
          ],
        },
        deps,
        now,
      ),
    /too far ahead/,
  );
  await assert.rejects(
    () =>
      logExerciseSets(
        owner,
        {
          action: 'log',
          exerciseId: 'pull-up',
          sets: [{ setIndex: 1, weightKg: null, reps: 8, detail: { startedAt: 'tomorrow' } }],
        },
        deps,
        now,
      ),
    /time/i,
  );
});

test('body weight is a snapshot, and effort is 1 to 10', async () => {
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  globalThis.qramTraining = undefined;
  const owner = user('detail-weight');
  const deps: FlowRunDeps = {
    demo: true,
    profile: async () => profile(['gym-back-biceps']),
    library: async () => flows,
    recordActivity: async () => ({ id: 'activity-weight' }),
  };
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  await saveMetrics(owner, { birthYear: 1990, weightKg: 70.2, lifestyle: 'active' }, deps, now);
  const started = await beginRun(owner, { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' }, deps, now);
  assert.equal(started.run.bodyWeightKg, 70.2);
  await saveMetrics(owner, { birthYear: 1990, weightKg: 81, lifestyle: 'active' }, deps, now + 1000);
  const home = await readFlowRuns(owner, deps, now + 2000);
  assert.equal(home.running[0]?.bodyWeightKg, 70.2);
  assert.equal(keptWeight(70.2, 81), 70.2);
  const session = trainingCatalog().sessions.find(item => item.id === 'lower-body');
  assert.ok(session);
  const logged = await trainingPost(
    owner,
    {
      action: 'log',
      sessionId: session.id,
      planDate: '2026-11-07',
      blocks: session.blocks.map(block => ({
        id: block.id,
        sets: Array.from({ length: block.sets }, (_, index) => ({ index: index + 1, values: { weight: 40, reps: 8 } })),
      })),
    },
    { demo: true },
  );
  assert.equal(logged.status, 200);
  const trainingLogs = () =>
    (globalThis.qramTraining as { logs?: { userId: string; sessionId: string; bodyWeightKg: number | null }[] } | undefined)?.logs;
  assert.equal(trainingLogs()?.find(item => item.userId === owner.id && item.sessionId === session.id)?.bodyWeightKg, 81);
  await saveMetrics(owner, { birthYear: 1990, weightKg: 90, lifestyle: 'active' }, deps, now + 3000);
  assert.equal(trainingLogs()?.find(item => item.userId === owner.id && item.sessionId === session.id)?.bodyWeightKg, 81);
  assert.equal(effortRating(1), 1);
  assert.equal(effortRating(10), 10);
  assert.throws(() => effortRating(0), /1 to 10/);
  assert.throws(() => effortRating(11), /1 to 10/);
  assert.equal(flowRunSchema.safeParse({ action: 'save', runId: started.run.id, state: started.run.state, effort: 0 }).success, false);
  assert.equal(flowRunSchema.safeParse({ action: 'save', runId: started.run.id, state: started.run.state, effort: 7 }).success, true);
  await saveRun(owner, started.run.id, started.run.state, deps, now + 4000, 7);
  const history = await readFlowHistory(owner, { history: 'gym-back-biceps', kind: 'flow' }, deps);
  assert.equal(formatEffort(history.runs[0]?.effort), 'Felt 7/10');
  assert.equal(formatEffort(null), null);
});

test('logs saved before set detail existed still read back as done sets', async () => {
  const { readExerciseSessions: exerciseSessions } = await import('../src/lib/exercise-log-store');
  const user = { id: 'old-detail-user' } as never;
  const before = (globalThis as { qramExerciseLogs?: unknown[] }).qramExerciseLogs ?? [];
  (globalThis as { qramExerciseLogs?: unknown[] }).qramExerciseLogs = [
    ...before,
    { id: 'legacy-1', userId: 'old-detail-user', exerciseId: 'push-up', runId: null, setIndex: 1, weightKg: null, reps: 10, durationSeconds: null, loggedAt: new Date().toISOString() },
  ];
  const result = await exerciseSessions(user, ['push-up'], { demo: true });
  const sets = JSON.stringify(result);
  assert.match(sets, /"reps":10/);
});
