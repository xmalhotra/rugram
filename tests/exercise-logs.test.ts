import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { completedSessionPost } from '../shared/training';
import { flows } from '../shared/mobile';
import type { MobileProfile } from '../shared/mobile';
import type { CommunityActivity, CommunityFeed, CommunityMember } from '../shared/community-flows';
import { beginRun, postRun, saveRun, type FlowRunDeps } from '../src/lib/flow-run-store';
import {
  ExerciseLogError,
  clearExerciseLogs,
  logExerciseSets,
  readExerciseSessions,
} from '../src/lib/exercise-log-store';
import type { PublicUser } from '../src/lib/types';
import { doneCard } from '../shared/flow-run';

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

test('logs stay on the exercise, replace edits, and another account sees nothing', async () => {
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = user('log-owner');
  const other = user('log-other');
  const deps = { demo: true as const };
  const runDeps: FlowRunDeps = {
    demo: true,
    profile: async person => profile(person.id === owner.id ? ['gym-back-biceps'] : []),
    library: async () => flows,
    recordActivity: async (_person, input) => {
      assert.equal(input.note, '');
      assert.ok(!JSON.stringify(input).includes('42.5'));
      assert.ok(!JSON.stringify(input).includes('weight'));
      return { id: 'activity-log' };
    },
  };
  const started = await beginRun(owner, { kind: 'flow', id: 'gym-back-biceps', level: 'Regular' }, runDeps);
  const runId = started.run.id;
  await logExerciseSets(
    owner,
    {
      action: 'log',
      runId,
      exerciseId: 'single-arm-lat-pulldown',
      sets: [
        { setIndex: 1, weightKg: 40, reps: 10 },
        { setIndex: 2, weightKg: 40, reps: 10 },
      ],
    },
    deps,
  );
  const replaced = await logExerciseSets(
    owner,
    {
      action: 'log',
      runId,
      exerciseId: 'single-arm-lat-pulldown',
      sets: [
        { setIndex: 1, weightKg: 42.5, reps: 10 },
        { setIndex: 2, weightKg: 42.5, reps: 12 },
        { setIndex: 3, weightKg: 42.5, reps: 12 },
      ],
    },
    deps,
  );
  assert.equal(replaced?.sets.length, 3);
  await logExerciseSets(
    owner,
    {
      action: 'log',
      runId,
      exerciseId: 'rope-hammer-curl',
      sets: [{ setIndex: 1, weightKg: 15, reps: 12 }],
    },
    deps,
  );
  const own = await readExerciseSessions(owner, ['single-arm-lat-pulldown', 'rope-hammer-curl'], deps);
  assert.deepEqual(
    own.sessions.map(session => {
      const last = session.sets.at(-1);
      return [session.exerciseId, last && { weightKg: last.weightKg, reps: last.reps, durationSeconds: last.durationSeconds }];
    }),
    [
      ['single-arm-lat-pulldown', { weightKg: 42.5, reps: 12, durationSeconds: null }],
      ['rope-hammer-curl', { weightKg: 15, reps: 12, durationSeconds: null }],
    ],
  );
  assert.deepEqual(await readExerciseSessions(other, ['single-arm-lat-pulldown'], deps), { sessions: [] });
  await assert.rejects(
    () => logExerciseSets(other, { action: 'log', runId, exerciseId: 'rope-hammer-curl', sets: [{ setIndex: 1, weightKg: 15, reps: 12 }] }, deps),
    (error: unknown) => error instanceof ExerciseLogError && error.status === 403,
  );
  await assert.rejects(
    () => logExerciseSets(owner, { action: 'log', exerciseId: 'not-a-lift', sets: [{ setIndex: 1, weightKg: 10, reps: 10 }] }, deps),
    /Unknown exercise/,
  );
  await assert.rejects(
    () =>
      logExerciseSets(
        owner,
        { action: 'log', exerciseId: 'cable-curl', sets: [{ setIndex: 1, weightKg: 40.3, reps: 10 }] },
        deps,
      ),
    /0\.25/,
  );
  await assert.rejects(
    () => logExerciseSets(owner, { action: 'log', exerciseId: 'pull-up', sets: [{ setIndex: 1, weightKg: 0, reps: 8 }] }, deps),
    /Bodyweight/,
  );
  const bodyweight = await logExerciseSets(
    owner,
    { action: 'log', exerciseId: 'pull-up', sets: [{ setIndex: 1, weightKg: null, reps: 8 }] },
    deps,
  );
  assert.equal(bodyweight?.sets[0]?.weightKg, null);
  await assert.rejects(() => readExerciseSessions(owner, [], deps), /1 to 50/);
  await clearExerciseLogs(owner, 'single-arm-lat-pulldown', deps);
  const after = await readExerciseSessions(owner, ['single-arm-lat-pulldown', 'rope-hammer-curl'], deps);
  assert.deepEqual(
    after.sessions.map(session => session.exerciseId),
    ['rope-hammer-curl'],
  );
  let finished = started.run.state;
  let at = finished.phaseStartedAt;
  while (finished.phase !== 'finished') {
    at += 1000;
    finished = doneCard(finished, at);
  }
  await saveRun(owner, runId, finished, runDeps);
  const posted = await postRun(owner, runId, '', runDeps);
  assert.equal(posted.activityId, 'activity-log');
});

test('community feed, member and activity payloads contain no weight', () => {
  for (const file of [
    'src/lib/mobile/community.ts',
    'src/app/api/mobile/community/route.ts',
    'shared/community-flows.ts',
  ]) {
    assert.doesNotMatch(
      readFileSync(file, 'utf8'),
      /weightKg|weight_kg|durationSeconds|duration_seconds|exercise_logs|readFlowHistory|flow_runs|plannedWeightKg|planned_weight_kg|planned_reps|schemeId|scheme_id|startedAt|started_at|completedAt|completed_at|restBefore|rest_before|timeSource|time_source|bodyWeightKg|body_weight_kg|activeSeconds|pausedSeconds|openedAt|closedAt|effort/,
    );
  }
  const activity: CommunityActivity = {
    id: 'activity-1',
    user: { id: 'log-owner', name: 'log-owner', handle: 'log-owner' },
    personalFlowId: 'gym-back-biceps',
    publishedId: null,
    title: 'Back + Biceps',
    cards: [{ sourceFlowId: 'gym-back-biceps', cardId: 'gym-back-biceps:rope-hammer-curl', title: 'Rope Hammer Curl' }],
    total: 7,
    note: '',
    at: '2026-11-06T00:00:00.000Z',
    viewer: { own: true },
  };
  const feed: CommunityFeed = { tab: 'following', items: [], activities: [activity], mine: [], copies: [] };
  const member: CommunityMember = {
    member: {
      id: 'log-owner',
      name: 'log-owner',
      handle: 'log-owner',
      followers: 0,
      following: 0,
      published: 0,
      upvotes: 0,
      followedByViewer: false,
      own: true,
    },
    items: [],
    activities: [activity],
    copies: [],
  };
  const payload = JSON.stringify({ feed, member, activity });
  assert.equal(payload.includes('weight'), false);
  assert.equal(payload.includes('42.5'), false);
  assert.equal(/seconds|duration/i.test(payload), false);
  for (const field of [
    'plannedWeightKg',
    'planned_weight_kg',
    'schemeId',
    'timeSource',
    'time_source',
    'bodyWeightKg',
    'body_weight_kg',
    'restBeforeSeconds',
    'rest_before_seconds',
    'openedAt',
    'activeSeconds',
    'pausedSeconds',
    'startedAt',
    'completedAt',
    'Felt ',
  ]) {
    assert.equal(payload.includes(field), false, field);
  }
  const posted = completedSessionPost('Easy session', 'swim-test', 'Finished.');
  const postedPayload = JSON.stringify(posted);
  assert.equal(postedPayload.includes('weight'), false);
  assert.equal(postedPayload.includes('reps'), false);
  assert.equal(/seconds|duration|laps/i.test(postedPayload), false);
  assert.equal(posted.cards.length, 1);
  assert.equal(posted.title, 'Easy session');
});

test('a hold logs seconds, and another account still sees nothing', async () => {
  globalThis.qramExerciseLogs = [];
  const owner = user('seconds-owner');
  const other = user('seconds-other');
  const deps = { demo: true as const };
  const saved = await logExerciseSets(
    owner,
    {
      action: 'log',
      exerciseId: 'straight-arm-plank',
      sets: [{ setIndex: 1, weightKg: null, reps: null, durationSeconds: 45 }],
    },
    deps,
  );
  assert.equal(saved?.sets[0]?.durationSeconds, 45);
  assert.equal(saved?.sets[0]?.reps, null);
  const own = await readExerciseSessions(owner, ['straight-arm-plank'], deps);
  assert.equal(own.sessions[0]?.sets[0]?.durationSeconds, 45);
  assert.deepEqual(await readExerciseSessions(other, ['straight-arm-plank'], deps), { sessions: [] });
  await assert.rejects(
    () =>
      logExerciseSets(
        owner,
        { action: 'log', exerciseId: 'push-up', sets: [{ setIndex: 1, weightKg: null, reps: null, durationSeconds: null }] },
        deps,
      ),
    /reps or seconds|Check the request/,
  );
});
