import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyFlowGet } from '../src/lib/body-flow-store';
import { resetTrainingMemory, trainingPost } from '../src/lib/training-store';
import { beginRun, finishRun, type FlowRunDeps } from '../src/lib/flow-run-store';
import { logExerciseSets } from '../src/lib/exercise-log-store';
import type { PublicUser } from '../src/lib/types';
import { loggedWeeks } from '../shared/body-flow';
import { doneCard, endRest, type FlowRunState } from '../shared/flow-run';
import { gymExerciseId, gymFlowById, gymFlowItem } from '../shared/gym-flows';
import { isMobilityExercise } from '../shared/joint-map';
import { exerciseRestClass } from '../shared/exercise-rest';
import { flows, type MobileProfile } from '../shared/mobile';
import { muscleMapFor, type MuscleArea } from '../shared/muscle-map';
import { trainingCatalog } from '../shared/training-seed';

const member = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function blockValues(typeId: string) {
  if (typeId === 'type-strength') return { weight: 40, reps: 8 };
  if (typeId === 'type-bodyweight-reps') return { reps: 10 };
  if (typeId === 'type-holds') return { seconds: 30 };
  if (typeId === 'type-intervals') return { seconds: 240, metres: 800 };
  if (typeId === 'type-steady') return { seconds: 1800, metres: 3000 };
  return { done: true };
}

async function logSession(user: PublicUser, sessionId: string, planDate: string, mode: 'done' | 'skipped') {
  const session = trainingCatalog().sessions.find(row => row.id === sessionId);
  assert.ok(session, sessionId);
  const values = blockValues(session.typeId);
  const blocks = session.blocks.map(block => ({
    id: block.id,
    sets: Array.from({ length: block.sets }, (_, index) =>
      mode === 'skipped' ? { index: index + 1, skipped: true } : { index: index + 1, values },
    ),
  }));
  const result = await trainingPost(user, { action: 'log', sessionId, planDate, blocks }, { demo: true });
  assert.equal(result.status, 200);
}

function areaSets(body: Record<string, unknown>, areaId: string) {
  const areas = (body.areas as { area: string; sets: number; lastDate: string | null }[]) ?? [];
  return areas.find(area => area.area === areaId);
}

/** The plan's contribution to one area, counted the same way body flow counts a run with no set rows. */
function plannedAreaSets(state: FlowRunState, flowId: string, areaId: MuscleArea) {
  let sets = 0;
  for (const card of state.cards) {
    if (card.status !== 'done') continue;
    const exerciseId = gymExerciseId(card.cardId);
    if (!exerciseId || isMobilityExercise(exerciseId) || exerciseRestClass[exerciseId] === 'conditioning') continue;
    const planned = gymFlowItem(flowId, exerciseId)?.sets ?? 0;
    const tag = muscleMapFor(exerciseId);
    if (tag.main.includes(areaId)) sets += planned;
    else if (tag.helpers.includes(areaId)) sets += planned * 0.5;
  }
  return sets;
}

function finishCards(state: FlowRunState) {
  let current = state;
  let at = state.phaseStartedAt;
  for (let guard = 0; guard < 30 && current.phase !== 'finished'; guard += 1) {
    at += 1000;
    current = current.phase === 'rest' ? endRest(current, at) : doneCard(current, at);
  }
  return current;
}

function runDeps(): FlowRunDeps {
  const profile = (): MobileProfile => ({ city: 'Hyderabad', flowIds: [], savedProductIds: [], completed: [], eventIds: [] });
  return {
    demo: true,
    profile: async () => profile(),
    library: async () => flows,
    recordActivity: async () => ({ id: `activity-${crypto.randomUUID()}` }),
  };
}

test('body flow counts the sets that were logged, not the plan', async () => {
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const gym = gymFlowById('gym-back-biceps');
  const row = gym?.items.find(item => item.exerciseId === 'barbell-bent-over-row');
  assert.ok(gym && row && row.sets > 1);
  const deps = runDeps();
  const when = Date.parse('2026-11-04T08:00:00.000Z');

  const loggedUser = member(`body-logged-${crypto.randomUUID()}`);
  const loggedRun = await beginRun(loggedUser, { kind: 'flow', id: gym.id, level: 'Regular' }, deps, when);
  await logExerciseSets(
    loggedUser,
    { action: 'log', runId: loggedRun.run.id, exerciseId: row.exerciseId, sets: [{ setIndex: 1, weightKg: 40, reps: 8 }] },
    { demo: true },
    when,
  );
  await finishRun(loggedUser, loggedRun.run.id, finishCards(loggedRun.run.state), deps, when + 60_000);
  const logged = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-11-04', {
    user: loggedUser,
    allow: true,
    demo: true,
  });
  assert.equal(logged.status, 200);
  assert.equal(areaSets(logged.body, 'lats')?.sets, 1);

  const oldUser = member(`body-old-${crypto.randomUUID()}`);
  const oldRun = await beginRun(oldUser, { kind: 'flow', id: gym.id, level: 'Regular' }, deps, when);
  await finishRun(oldUser, oldRun.run.id, finishCards(oldRun.run.state), deps, when + 60_000);
  const historic = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-11-04', {
    user: oldUser,
    allow: true,
    demo: true,
  });
  assert.equal(historic.status, 200);
  const planned = plannedAreaSets(finishCards(oldRun.run.state), gym.id, 'lats');
  assert.ok(planned > 1);
  assert.equal(areaSets(historic.body, 'lats')?.sets, planned);
});

test('a logged training session appears in body flow and skipped sets are ignored', async () => {
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member(`body-owner-${crypto.randomUUID()}`);
  await logSession(owner, 'upper-body-a', '2026-11-04', 'done');
  await logSession(owner, 'upper-body-a', '2026-11-05', 'skipped');
  const result = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-11-05', { user: owner, allow: true, demo: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.dayZero, '2026-11-04');
  const chest = areaSets(result.body, 'chest');
  assert.ok(chest);
  assert.ok(chest.sets > 0);
  assert.equal(chest.lastDate, '2026-11-04');
});

test('range=week and range=start return different spans', async () => {
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member(`body-owner-${crypto.randomUUID()}`);
  await logSession(owner, 'upper-body-a', '2026-10-26', 'done');
  await logSession(owner, 'upper-body-a', '2026-11-04', 'done');
  const week = await bodyFlowGet('http://local/api/mobile/body-flow?range=week&date=2026-11-04', { user: owner, allow: true, demo: true });
  const start = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-11-04', { user: owner, allow: true, demo: true });
  assert.equal(week.status, 200);
  assert.equal(start.status, 200);
  assert.equal(week.body.from, '2026-11-02');
  assert.equal(start.body.from, '2026-10-26');
  const weekChest = areaSets(week.body, 'chest');
  const startChest = areaSets(start.body, 'chest');
  assert.ok(weekChest && startChest);
  assert.ok(startChest.sets > weekChest.sets);
});

test('a logged mobility exercise appears under joints and not muscles', async () => {
  resetTrainingMemory();
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member(`body-owner-${crypto.randomUUID()}`);
  globalThis.qramExerciseLogs = [
    {
      id: 'mobility-ankle',
      userId: owner.id,
      exerciseId: 'ankle-circles',
      runId: 'run-mobility-ankle',
      setIndex: 1,
      weightKg: null,
      reps: null,
      durationSeconds: 30,
      loggedAt: '2026-11-04T08:00:00.000Z',
      detail: {
        status: 'done',
        plannedWeightKg: null,
        plannedReps: null,
        plannedSeconds: null,
        schemeId: null,
        startedAt: null,
        completedAt: null,
        restBeforeSeconds: null,
        restPlannedSeconds: null,
        timeSource: null,
        edited: false,
      },
    },
  ];
  const result = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-11-04', { user: owner, allow: true, demo: true });
  assert.equal(result.status, 200);
  assert.equal(areaSets(result.body, 'calves')?.sets, 0);
  assert.equal(areaSets(result.body, 'shins')?.sets, 0);
  const joints = result.body.joints as {
    joint: string;
    title: string;
    days: number;
    sets: number;
    shade: number;
    band: { low: number; high: number };
    exercises: { exerciseId: string; name: string; sets: number }[];
  }[];
  assert.deepEqual(
    joints.map(joint => joint.joint),
    ['neck', 'shoulders', 'wrists', 'spine', 'hips', 'knees', 'ankles'],
  );
  const ankles = joints.find(joint => joint.joint === 'ankles');
  assert.ok(ankles);
  assert.equal(ankles.title, 'Ankles');
  assert.equal(ankles.days, 1);
  assert.equal(ankles.sets, 1);
  // One mobility day against 2–3 a week: building, never 'beyond' just because the range is a day long.
  assert.equal(ankles.shade, 2);
  assert.deepEqual(ankles.band, { low: 2, high: 3 });
  assert.deepEqual(ankles.exercises, [{ exerciseId: 'ankle-circles', name: 'Ankle Circles', sets: 1 }]);
  assert.ok(joints.filter(joint => joint.joint !== 'ankles').every(joint => joint.days === 0 && joint.sets === 0));
});

test("another member's logs never appear in the caller response", async () => {
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member(`body-owner-${crypto.randomUUID()}`);
  const other = member(`body-other-${crypto.randomUUID()}`);
  await logSession(owner, 'lower-body', '2026-11-04', 'done');
  await logSession(other, 'upper-body-a', '2026-11-01', 'done');
  const result = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-11-04', { user: owner, allow: true, demo: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.dayZero, '2026-11-04');
  const chest = areaSets(result.body, 'chest');
  assert.ok(chest);
  assert.equal(chest.sets, 0);
});

type StrengthBody = { userId: string; weightKg: number; lifestyle: string; updatedAt: string };
type StrengthAnchor = { userId: string; pattern: string; weightKg: number; reps: number; updatedAt: string };

function rememberStrength(userId: string, body: { weightKg: number; lifestyle: string } | null, deadliftKg?: number) {
  const bodies = ((globalThis as { qramStrengthBody?: StrengthBody[] }).qramStrengthBody ?? []).filter(row => row.userId !== userId);
  const anchors = ((globalThis as { qramStrengthAnchors?: StrengthAnchor[] }).qramStrengthAnchors ?? []).filter(row => row.userId !== userId);
  if (body) bodies.push({ userId, ...body, updatedAt: '2026-11-01T00:00:00.000Z' });
  if (deadliftKg) anchors.push({ userId, pattern: 'hinge', weightKg: deadliftKg, reps: 5, updatedAt: '2026-11-01T00:00:00.000Z' });
  (globalThis as { qramStrengthBody?: StrengthBody[] }).qramStrengthBody = bodies;
  (globalThis as { qramStrengthAnchors?: StrengthAnchor[] }).qramStrengthAnchors = anchors;
}

test('body flow uses the member level when a lift is known, and the set span otherwise', async () => {
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  globalThis.qramFlowRuns = { metrics: [], runs: [] };
  const owner = member(`body-level-${crypto.randomUUID()}`);
  const other = member(`body-level-other-${crypto.randomUUID()}`);
  await logSession(owner, 'upper-body-a', '2026-10-01', 'skipped');
  await logSession(owner, 'upper-body-a', '2026-11-04', 'done');
  rememberStrength(other.id, { weightKg: 80, lifestyle: 'athlete' }, 200);
  const plain = await bodyFlowGet('http://local/api/mobile/body-flow?range=week&date=2026-11-04', { user: owner, allow: true, demo: true });
  assert.equal(plain.status, 200);
  assert.equal(plain.body.level, 'beginner');
  assert.equal(plain.body.loggedWeeks, loggedWeeks([{ date: '2026-11-04', exerciseId: 'x' }]));
  assert.equal(plain.body.loggedWeeks, 1 / 7);

  rememberStrength(owner.id, { weightKg: 80, lifestyle: 'active' }, 160);
  const strong = await bodyFlowGet('http://local/api/mobile/body-flow?range=week&date=2026-11-04', { user: owner, allow: true, demo: true });
  assert.equal(strong.status, 200);
  assert.equal(strong.body.level, 'regular');
  assert.equal(strong.body.loggedWeeks, 1 / 7);

  const veteran = member(`body-weeks-${crypto.randomUUID()}`);
  await logSession(veteran, 'upper-body-a', '2026-01-01', 'done');
  await logSession(veteran, 'upper-body-a', '2026-03-15', 'done');
  const span = await bodyFlowGet('http://local/api/mobile/body-flow?range=start&date=2026-03-15', { user: veteran, allow: true, demo: true });
  const weeks = loggedWeeks([
    { date: '2026-01-01', exerciseId: 'x' },
    { date: '2026-03-15', exerciseId: 'x' },
  ]);
  assert.equal(span.status, 200);
  assert.ok(weeks > 8);
  assert.notEqual(weeks, 9);
  assert.equal(span.body.loggedWeeks, weeks);
  assert.equal(span.body.level, 'regular');
});
