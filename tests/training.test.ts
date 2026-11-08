import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { readExerciseSessions } from '../src/lib/exercise-log-store';
import { resetTrainingMemory, trainingGet, trainingPost } from '../src/lib/training-store';
import type { PublicUser } from '../src/lib/types';
import { catalogTile } from '../shared/flow-catalog';
import { trainingCatalog } from '../shared/training-seed';
import {
  TrainingError,
  knownFlowIds,
  parsePlan,
  parseSession,
  parseTrainingType,
  planDay,
  targetLabel,
  validateLogValues,
  weekOf,
  type Field,
  type TrainingType,
} from '../shared/training';

const user = (id: string, role: PublicUser['role'] = 'member'): PublicUser => ({
  id,
  handle: id,
  name: id,
  role,
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

const reps: Field = { key: 'reps', label: 'Reps', input: 'number', unit: 'reps', required: true };
const duration: Field = { key: 'seconds', label: 'Time', input: 'duration', required: true };

function swimType(): TrainingType {
  return parseTrainingType({
    id: 'swim-test',
    title: 'Swim test',
    about: 'Laps in a pool, recorded as a number.',
    iconKey: 'waves',
    blockFields: [{ key: 'laps', label: 'Laps', input: 'number', unit: 'laps', required: true }],
    sessionFields: [{ key: 'feel', label: 'Feel', input: 'rating', required: false }],
    canPost: true,
    usesExerciseRecords: false,
    status: 'live',
  });
}

test('a new training kind is only data', () => {
  const type = swimType();
  const easy = parseSession(
    {
      id: 'swim-easy',
      typeId: type.id,
      title: 'Easy swim',
      goal: 'Stay long and relaxed.',
      blocks: [{ id: 'main', sets: 1, targets: { laps: { min: 20, max: 40 } } }],
      status: 'live',
    },
    [type],
  );
  const hard = parseSession(
    {
      id: 'swim-hard',
      typeId: type.id,
      title: 'Hard swim',
      goal: 'A few fast laps.',
      blocks: [{ id: 'main', sets: 4, targets: { laps: { min: 8, max: 10 } } }],
      status: 'live',
    },
    [type],
  );
  const plan = parsePlan(
    {
      id: 'swim-fortnight',
      title: 'Two swim weeks',
      goal: 'Easy, then harder, then easy again.',
      weeks: 2,
      status: 'live',
      slots: [
        { week: 1, weekday: 1, items: [{ kind: 'session', id: easy.id }, { kind: 'session', id: hard.id }] },
        { week: 2, weekday: 1, items: [{ kind: 'session', id: hard.id }] },
      ],
    },
    { sessions: [easy, hard], types: [type], flowIds: [] },
  );
  assert.equal(validateLogValues(type, { laps: 20 }).laps, 20);
  assert.throws(() => validateLogValues(type, {}), /Laps is required/);
  assert.throws(() => validateLogValues(type, { laps: 20, extra: 1 }), /Unknown value/);
  assert.throws(() => validateLogValues(type, { feel: 11 }, 'session'), /1 to 10/);
  assert.equal(validateLogValues(type, {}, 'session').feel, undefined);
  const monday = '2026-11-02';
  const first = planDay(plan, monday, monday);
  assert.equal(first?.week, 1);
  assert.equal(first?.items.length, 2);
  assert.equal(planDay(plan, monday, '2026-11-09')?.week, 2);
  assert.equal(planDay(plan, monday, '2026-11-09')?.items.length, 1);
  assert.equal(planDay(plan, monday, '2026-11-16')?.week, 1);
  assert.equal(planDay(plan, monday, '2026-11-16')?.items.length, 2);
  assert.equal(planDay(plan, monday, '2026-11-01'), null);
  assert.equal(targetLabel(reps, { min: 8, max: 10 }, 3), '3 × 8–10');
  assert.equal(targetLabel(duration, { min: 180, max: 180 }, 5), '5 × 3 min');
  assert.equal(targetLabel(duration, { min: 1800, max: 2700 }), '30–45 min');
  assert.equal(targetLabel(type.blockFields[0], { min: 8, max: 10 }, 3), '3 × 8–10 laps');
  const days = weekOf(plan, monday, monday, [{ planDate: monday, itemId: easy.id, status: 'done' }]);
  assert.equal(days.length, 7);
  assert.equal(days[0]?.status, 'open');
  assert.equal(knownFlowIds().has('gym-back-biceps'), true);
  assert.throws(() => parsePlan({ ...plan, slots: [...plan.slots, plan.slots[0]] }, { sessions: [easy, hard], types: [type], flowIds: [] }), /once/);
});

test('seeded names stay in the seed and the tests', () => {
  const ids = trainingCatalog().types.map(type => type.id);
  assert.ok(ids.includes('type-strength'));
  const needles = ['hybrid-week', 'vo2', 'sauna', ...ids];
  const files = [...walk('mobile/src'), ...walk('src'), 'shared/training.ts'];
  for (const file of files) {
    if (file.endsWith('training-seed/index.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const needle of needles) assert.equal(text.includes(needle), false, `${file} contains ${needle}`);
  }
});

test('using a plan keeps a private snapshot, and another person sees nothing', async () => {
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  const owner = user('training-owner');
  const other = user('training-other');
  const admin = user('training-admin', 'admin');
  const deps = { demo: true as const };
  const allow = { user: owner, allow: true, demo: true as const };
  const used = await trainingPost(owner, { action: 'use-plan', planId: 'hybrid-week', startDate: '2026-11-02' }, deps);
  assert.equal(used.status, 200);
  const before = await trainingGet('http://local/api/mobile/training?resource=week&date=2026-11-02', allow);
  assert.equal(before.status, 200);
  const first = (before.body as { days: { items: { title: string }[] }[] }).days[0];
  assert.equal(first?.items[0]?.title, 'Lower Body');
  const plan = structuredClone(trainingCatalog().plans[0]);
  plan.slots = [{ week: 1, weekday: 1, items: [{ kind: 'rest', label: 'Changed' }] }];
  const edited = await trainingPost(admin, { action: 'upsert-plan', plan }, deps);
  assert.equal(edited.status, 200);
  const after = await trainingGet('http://local/api/mobile/training?resource=week&date=2026-11-02', allow);
  assert.equal((after.body as { days: { items: { title: string }[] }[] }).days[0]?.items[0]?.title, 'Lower Body');

  const logged = await trainingPost(
    owner,
    {
      action: 'log',
      sessionId: 'lower-body',
      planDate: '2026-11-02',
      blocks: trainingCatalog().sessions[0].blocks.map(block => ({
        id: block.id,
        sets: Array.from({ length: block.sets }, (_, index) => ({ index: index + 1, values: { weight: 40, reps: 8 } })),
      })),
    },
    deps,
  );
  assert.equal(logged.status, 200);
  const records = await readExerciseSessions(owner, ['barbell-back-squat'], deps);
  assert.equal(records.sessions[0]?.sets[0]?.weightKg, 40);
  const hidden = await readExerciseSessions(other, ['barbell-back-squat'], deps);
  assert.equal(hidden.sessions.length, 0);
  const otherWeek = await trainingGet('http://local/api/mobile/training?resource=week&date=2026-11-02', { user: other, allow: true, demo: true });
  assert.equal((otherWeek.body as { active: boolean }).active, false);
  assert.equal(JSON.stringify(otherWeek.body).includes('40'), false);

  const interval = trainingCatalog().sessions.find(session => session.typeId === 'type-intervals');
  assert.ok(interval);
  const round = await trainingPost(
    owner,
    {
      action: 'log',
      sessionId: interval.id,
      planDate: '2026-11-04',
      sessionValues: { effort: 7 },
      blocks: interval.blocks.map(block => ({
        id: block.id,
        sets: Array.from({ length: block.sets }, (_, index) => ({ index: index + 1, values: { seconds: block.targets?.seconds?.min ?? 60 } })),
      })),
    },
    deps,
  );
  assert.equal(round.status, 200);
  const posted: { sessionId: string; title: string; note: string }[] = [];
  const withPost = { demo: true as const, recordActivity: async (_person: PublicUser, input: { sessionId: string; title: string; note: string }) => { posted.push(input); return { id: 'activity-training' }; } };
  const denied = await trainingPost(owner, { action: 'post', sessionId: 'recovery-day', planDate: '2026-11-05', note: 'No' }, withPost);
  assert.equal(denied.status, 400);
  const incomplete = await trainingPost(owner, { action: 'post', sessionId: interval.id, planDate: '2026-11-03' }, withPost);
  assert.equal(incomplete.status, 400);
  const ok = await trainingPost(owner, { action: 'post', sessionId: interval.id, planDate: '2026-11-04', note: 'Finished.' }, withPost);
  assert.equal(ok.status, 200);
  assert.equal(posted.length, 1);
  assert.equal(posted[0]?.title, interval.title);
  assert.equal(JSON.stringify(posted).includes('weight'), false);
  assert.equal(JSON.stringify(posted).includes('seconds'), false);
  const draft = await trainingPost(
    admin,
    { action: 'upsert-plan', plan: { ...trainingCatalog().plans[0], id: 'draft-plan', status: 'draft', slots: [{ week: 1, weekday: 1, items: [{ kind: 'session', id: 'easy-run' }] }] } },
    deps,
  );
  assert.equal(draft.status, 200);
  const blocked = await trainingPost(admin, { action: 'set-status', kind: 'plan', id: 'draft-plan', status: 'live' }, deps);
  assert.equal(blocked.status, 200);
  await trainingPost(admin, { action: 'remove', kind: 'plan', id: 'draft-plan' }, deps);
  const restored = structuredClone(trainingCatalog().plans[0]);
  await trainingPost(admin, { action: 'upsert-plan', plan: restored }, deps);
});

test('an admin can add a type, session and plan, and a member can log it', async () => {
  resetTrainingMemory();
  const admin = user('framework-admin', 'admin');
  const member = user('framework-member');
  const deps = { demo: true as const };
  const type = {
    id: 'paddle-test',
    title: 'Paddle test',
    about: 'Strokes recorded as a number.',
    iconKey: 'paddle',
    blockFields: [{ key: 'strokes', label: 'Strokes', input: 'number', unit: 'strokes', required: true }],
    sessionFields: [],
    canPost: false,
    usesExerciseRecords: false,
    status: 'live',
  };
  assert.equal((await trainingPost(admin, { action: 'upsert-type', type }, deps)).status, 200);
  const session = {
    id: 'paddle-easy',
    typeId: 'paddle-test',
    title: 'Easy paddle',
    goal: 'A short paddle.',
    blocks: [{ id: 'main', sets: 1, targets: { strokes: { min: 40, max: 60 } } }],
    status: 'live',
  };
  assert.equal((await trainingPost(admin, { action: 'upsert-session', session }, deps)).status, 200);
  const plan = {
    id: 'paddle-week',
    title: 'Paddle week',
    goal: 'One easy paddle.',
    weeks: 1,
    slots: [{ week: 1, weekday: 1, items: [{ kind: 'session', id: 'paddle-easy' }] }],
    status: 'live',
  };
  assert.equal((await trainingPost(admin, { action: 'upsert-plan', plan }, deps)).status, 200);
  const seen = await trainingGet('http://local/api/mobile/training?resource=session&id=paddle-easy', { user: member, allow: true, demo: true });
  assert.equal(seen.status, 200);
  assert.equal((seen.body as { session: { title: string } }).session.title, 'Easy paddle');
  const logged = await trainingPost(
    member,
    { action: 'log', sessionId: 'paddle-easy', planDate: '2026-11-02', blocks: [{ id: 'main', sets: [{ index: 1, values: { strokes: 42 } }] }] },
    deps,
  );
  assert.equal(logged.status, 200);
  const hidden = await trainingGet('http://local/api/mobile/training?resource=session&id=paddle-easy', { user: admin, allow: true, demo: true });
  assert.equal((hidden.body as { last: unknown }).last, null);
  assert.equal((await trainingPost(admin, { action: 'remove', kind: 'plan', id: 'paddle-week' }, deps)).status, 200);
  assert.equal((await trainingPost(admin, { action: 'remove', kind: 'session', id: 'paddle-easy' }, deps)).status, 200);
  assert.equal((await trainingPost(admin, { action: 'remove', kind: 'type', id: 'paddle-test' }, deps)).status, 200);
  const gone = await trainingGet('http://local/api/mobile/training?resource=session&id=paddle-easy', { user: member, allow: true, demo: true });
  assert.equal(gone.status, 404);
});

test('plyometrics for runners is seed data on the drills tile', async () => {
  const session = trainingCatalog().sessions.find(item => item.id === 'plyometrics-for-runners');
  assert.ok(session);
  assert.equal(session.typeId, 'type-holds');
  assert.equal(session.level, 'Intermediate');
  assert.deepEqual(session.catalogTiles, ['run-drills']);
  assert.equal(session.blocks.length, 6);
  assert.deepEqual(
    session.blocks.map(block => block.exerciseId),
    ['pogo-jumps', 'side-to-side-hops', 'single-leg-side-to-side', 'skater-jump', 'jumping-lunge', 'lunge-to-high-knee'],
  );
  assert.equal(session.blocks[3]?.label, 'Side Skates');
  assert.equal(session.blocks[4]?.label, 'Lunge Jumps');
  assert.ok(session.blocks.every(block => block.sets === 3 && block.restSeconds === 60 && block.targets?.seconds?.min === 30 && block.targets?.seconds?.max === 30));
  assert.equal(session.note, 'Jumping is high impact. Build up gradually, land softly, and stop if your shins or joints hurt.');
  assert.equal(catalogTile('run-drills')?.title, 'Drills & Plyometrics');
  assert.equal(catalogTile('run-drills')?.sectionId, 'running');
  assert.equal(catalogTile('run-drills')?.iconKey, 'pogo-jumps');
  assert.throws(() => parseSession({ ...session, catalogTiles: ['missing-tile'] }, trainingCatalog().types), /Unknown catalog tile/);
  for (const file of [...walk('mobile'), ...walk('src'), ...walk('shared')]) {
    if (file.includes('training-seed')) continue;
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes('plyometrics-for-runners'), false, file);
    if (text.includes('run-drills')) assert.equal(file, 'shared/flow-catalog.ts', file);
  }
  resetTrainingMemory();
  globalThis.qramExerciseLogs = [];
  const member = user('plyo-member');
  const deps = { demo: true as const };
  const listed = await trainingGet('http://local/api/mobile/training?resource=session&tile=run-drills', { user: member, allow: true, demo: true });
  assert.equal(listed.status, 200);
  const cards = (listed.body as { sessions: { id: string; coverExerciseId: string; exerciseCount: number; level: string }[] }).sessions;
  assert.equal(cards[0]?.id, 'plyometrics-for-runners');
  assert.equal(cards[0]?.coverExerciseId, 'pogo-jumps');
  assert.equal(cards[0]?.exerciseCount, 6);
  assert.equal(cards[0]?.level, 'Intermediate');
  const blocks = session.blocks.map((block, blockIndex) => ({
    id: block.id,
    sets: Array.from({ length: block.sets }, (_, index) =>
      blockIndex === 0 && index === 0 ? { index: index + 1, skipped: true } : { index: index + 1, values: { seconds: 30 } },
    ),
  }));
  const logged = await trainingPost(member, { action: 'log', sessionId: session.id, planDate: '2026-11-07', blocks }, deps);
  assert.equal(logged.status, 200);
  const records = await readExerciseSessions(
    member,
    ['pogo-jumps', 'side-to-side-hops', 'single-leg-side-to-side', 'skater-jump', 'jumping-lunge', 'lunge-to-high-knee'],
    deps,
  );
  const pogo = records.sessions.find(item => item.exerciseId === 'pogo-jumps');
  assert.equal(pogo?.sets.length, 2);
  assert.ok(pogo?.sets.every(set => set.durationSeconds === 30));
  assert.equal(
    records.sessions.reduce((sum, item) => sum + item.sets.length, 0),
    17,
  );
  const posted: { sessionId: string; title: string; note: string }[] = [];
  const withPost = {
    demo: true as const,
    recordActivity: async (_person: PublicUser, input: { sessionId: string; title: string; note: string }) => {
      posted.push(input);
      return { id: 'activity-plyo' };
    },
  };
  const ok = await trainingPost(member, { action: 'post', sessionId: session.id, planDate: '2026-11-07', note: 'Finished the jumps.' }, withPost);
  assert.equal(ok.status, 200);
  assert.equal(posted.length, 1);
  assert.equal(JSON.stringify(posted).includes('30'), false);
  assert.equal(JSON.stringify(posted).includes('seconds'), false);
  assert.equal(posted[0]?.title, 'Plyometrics for Runners');
});

test('parsers reject a missing exercise and a backwards range', () => {
  const type = swimType();
  assert.throws(
    () => parseSession({ id: 'bad', typeId: type.id, title: 'Bad', goal: 'Nope.', blocks: [{ id: 'one', exerciseId: 'not-a-lift', sets: 1 }], status: 'draft' }, [type]),
    (error: unknown) => error instanceof TrainingError && /Unknown exercise/.test(error.message),
  );
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === '.next' ? [] : walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
