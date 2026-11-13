import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { exercise } from '../shared/exercises';
import { gymFlowById } from '../shared/gym-flows';
import {
  amountListLabel,
  nextSetAfterTick,
  planWithScheme,
  registerSchemes,
  schemeById,
  schemeLine,
  spreadAmounts,
  type OpenSet,
  type SetScheme,
} from '../shared/set-schemes';
import { parseSession, TrainingError } from '../shared/training';
import { trainingCatalog } from '../shared/training-seed';
import { clearTrainingCache, resetTrainingMemory, trainingGet, trainingPost } from '../src/lib/training-store';
import type { PublicUser } from '../src/lib/types';

const move = (id: string) => {
  const found = exercise(id);
  assert.ok(found, id);
  return found;
};

const lat = move('wide-grip-lat-pulldown');
const assisted = move('assisted-pull-up');
const pullUp = move('push-up');
const band = move('band-pushdown');
const range = { sets: 3, repsMin: 10, repsMax: 12 };
const open = (weightKg: number | null, reps: number | null, extra?: Partial<OpenSet>): OpenSet => ({
  weightKg,
  reps,
  seconds: null,
  ticked: false,
  touched: false,
  ...extra,
});

test('amounts spread inside the range, and a fixed target stays put', () => {
  const down = schemeById('descending');
  const up = schemeById('reverse-pyramid');
  const hold = schemeById('straight');
  assert.deepEqual(spreadAmounts(down, { kind: 'reps', min: 8, max: 10 }, 3), [10, 9, 8]);
  assert.deepEqual(spreadAmounts(down, { kind: 'reps', min: 10, max: 12 }, 3), [12, 11, 10]);
  assert.deepEqual(spreadAmounts(down, { kind: 'hold', minSeconds: 30, maxSeconds: 40 }, 3), [40, 35, 30]);
  assert.deepEqual(spreadAmounts(down, { kind: 'hold', minSeconds: 45, maxSeconds: 60 }, 3), [60, 50, 45]);
  assert.deepEqual(spreadAmounts(down, { kind: 'hold', minSeconds: 46, maxSeconds: 60 }, 3), [60, 55, 46]);
  assert.deepEqual(spreadAmounts(up, { kind: 'reps', min: 8, max: 10 }, 3), [8, 9, 10]);
  assert.deepEqual(spreadAmounts(up, { kind: 'hold', minSeconds: 45, maxSeconds: 60 }, 3), [45, 50, 60]);
  assert.deepEqual(spreadAmounts(down, { kind: 'reps', min: 10, max: 10 }, 3), [10, 10, 10]);
  assert.deepEqual(spreadAmounts(hold, { kind: 'reps', min: 10, max: 12 }, 3), [12, 12, 12]);
  assert.deepEqual(spreadAmounts({ ...down, lastSetToFailure: true }, { kind: 'reps', min: 10, max: 12 }, 3), [12, 11, null]);
  assert.equal(amountListLabel(3, [12, 11, 10]), '3 sets: 12, 11, 10');
  assert.equal(amountListLabel(3, [12, 12, 12]), null);
});

test('weights follow the equipment step, assisted gets harder by going down, and bodyweight stays empty', () => {
  const pyramid = schemeById('pyramid');
  const drop = schemeById('drop-set');
  assert.deepEqual(
    planWithScheme(lat, range, pyramid, null).sets.map(set => set.weightKg),
    [null, null, null],
  );
  assert.deepEqual(
    planWithScheme(lat, range, pyramid, null).sets.map(set => set.reps),
    [12, 11, 10],
  );
  const mixed = planWithScheme(lat, range, pyramid, [
    { weightKg: 40, reps: 12 },
    { weightKg: 45, reps: 11 },
    { weightKg: 50, reps: 10 },
  ]);
  assert.equal(mixed.raised, true);
  assert.deepEqual(
    mixed.sets.map(set => set.weightKg),
    [45, 50, 55],
  );
  const short = planWithScheme(lat, range, pyramid, [
    { weightKg: 40, reps: 12 },
    { weightKg: 45, reps: 11 },
    { weightKg: 50, reps: 9 },
  ]);
  assert.equal(short.raised, false);
  assert.deepEqual(
    short.sets.map(set => set.weightKg),
    [40, 45, 50],
  );
  const assistedPlan = planWithScheme(assisted, range, pyramid, [
    { weightKg: 40, reps: 12 },
    { weightKg: 35, reps: 11 },
    { weightKg: 30, reps: 10 },
  ]);
  assert.equal(assistedPlan.raised, true);
  assert.deepEqual(
    assistedPlan.sets.map(set => set.weightKg),
    [35, 30, 25],
  );
  assert.deepEqual(
    planWithScheme(pullUp, { sets: 3, repsMin: 8, repsMax: 10 }, schemeById('descending'), [
      { weightKg: 20, reps: 10 },
      { weightKg: 20, reps: 9 },
      { weightKg: 20, reps: 8 },
    ]).sets.map(set => set.weightKg),
    [null, null, null],
  );
  assert.deepEqual(
    planWithScheme(band, range, drop, [{ weightKg: 10, reps: 12 }]).sets.map(set => set.weightKg),
    [null, null, null],
  );
  assert.equal(schemeLine(pyramid, planWithScheme(lat, range, pyramid, null)), 'Weight up, reps down: 12, 11, 10');
  assert.equal(schemeLine(schemeById('straight'), planWithScheme(lat, range, schemeById('straight'), null)), null);
});

test('ticking a set follows the scheme, a short set lowers the next target, and a typed set stays', () => {
  const pyramid = schemeById('pyramid');
  const fixed = { sets: 3, repsMin: 10, repsMax: 10 };
  let sets = [open(20, 10), open(null, 10), open(null, 10)];
  sets = nextSetAfterTick(lat, fixed, pyramid, sets, 0);
  assert.equal(sets[1]?.weightKg, 25);
  sets[1] = { ...sets[1], reps: 10 };
  sets = nextSetAfterTick(lat, fixed, pyramid, sets, 1);
  assert.equal(sets[2]?.weightKg, 30);
  const assistedNext = nextSetAfterTick(assisted, fixed, pyramid, [open(40, 10), open(null, 10), open(null, 10)], 0);
  assert.equal(assistedNext[1]?.weightKg, 35);
  const short = nextSetAfterTick(lat, range, pyramid, [open(40, 9), open(null, 11), open(null, 10)], 0);
  assert.equal(short[1]?.weightKg, 40);
  assert.equal(short[1]?.reps, 9);
  const typed = [open(40, 12), open(50, 8, { touched: true }), open(null, 10)];
  const kept = nextSetAfterTick(lat, range, pyramid, typed, 0);
  assert.equal(kept[1]?.weightKg, 50);
  assert.equal(kept[1]?.reps, 8);
  assert.equal(kept[1]?.touched, true);
});

test('a new scheme is only data and still plans the sets', () => {
  const wave: SetScheme = {
    id: 'wave',
    title: 'Wave',
    about: 'Weight and reps both rise across the sets.',
    amount: 'up',
    load: 'up',
  };
  const planned = planWithScheme(lat, { sets: 3, repsMin: 8, repsMax: 12 }, wave, null);
  assert.deepEqual(
    planned.sets.map(set => set.reps),
    [8, 10, 12],
  );
  assert.deepEqual(
    planned.sets.map(set => set.weightKg),
    [null, null, null],
  );
  const again = planWithScheme(lat, { sets: 3, repsMin: 8, repsMax: 12 }, wave, [
    { weightKg: 40, reps: 8 },
    { weightKg: 40, reps: 10 },
    { weightKg: 40, reps: 12 },
  ]);
  assert.equal(again.raised, true);
  assert.deepEqual(
    again.sets.map(set => set.weightKg),
    [45, 45, 45],
  );
  const next = nextSetAfterTick(lat, { sets: 3, repsMin: 8, repsMax: 12 }, wave, [open(40, 8), open(null, 10), open(null, 12)], 0);
  assert.equal(next[1]?.weightKg, 45);
  assert.equal(schemeLine(wave, planned), 'Weight up, reps up: 8, 10, 12');
});

test('back and biceps and push-ups use the seeded patterns', () => {
  const back = gymFlowById('gym-supersets-back-biceps-beginner');
  assert.ok(back);
  const second = back.items[0];
  assert.ok(second);
  assert.deepEqual(
    planWithScheme(move(second.exerciseId), second, schemeById(second.scheme), null).sets.map(set => set.reps),
    [12, 11, 10],
  );
  const home = gymFlowById('cal-upper-beginner');
  const push = home?.items[0];
  assert.ok(push);
  const pushPlan = planWithScheme(move(push.exerciseId), push, schemeById(push.scheme), null);
  assert.deepEqual(
    pushPlan.sets.map(set => set.reps),
    [10, 9, 8],
  );
  assert.deepEqual(
    pushPlan.sets.map(set => set.weightKg),
    [null, null, null],
  );
  assert.equal(schemeLine(schemeById(push.scheme), pushPlan), 'Reps down: 10, 9, 8');
});

test('an unknown scheme is rejected when saving and falls back while running', () => {
  const type = trainingCatalog().types[0];
  assert.throws(
    () =>
      parseSession(
        {
          id: 'bad-scheme',
          typeId: type.id,
          title: 'Bad',
          goal: 'Nope.',
          blocks: [{ id: 'one', exerciseId: 'barbell-bench-press', sets: 3, scheme: 'not-a-scheme', targets: { reps: { min: 8, max: 10 } } }],
          status: 'draft',
        },
        trainingCatalog().types,
      ),
    (error: unknown) => error instanceof TrainingError && /Unknown set scheme/.test(error.message),
  );
  const fallback = schemeById('not-a-scheme');
  assert.equal(fallback.amount, 'hold');
  assert.equal(fallback.load, 'hold');
  assert.deepEqual(
    planWithScheme(lat, range, fallback, null).sets.map(set => set.reps),
    [12, 12, 12],
  );
});

test('an admin can add a scheme without a release', async () => {
  resetTrainingMemory();
  const admin: PublicUser = {
    id: 'scheme-admin',
    handle: 'scheme-admin',
    name: 'Scheme',
    role: 'admin',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
  const member: PublicUser = {
    id: 'scheme-member',
    handle: 'scheme-member',
    name: 'Member',
    role: 'member',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
  const wave = {
    id: 'wave',
    title: 'Wave',
    about: 'Weight and reps both rise across the sets.',
    amount: 'up' as const,
    load: 'up' as const,
  };
  const saved = await trainingPost(admin, { action: 'upsert-scheme', scheme: wave }, { demo: true });
  assert.equal(saved.status, 200);
  clearTrainingCache();
  const listed = await trainingGet('http://local/api/mobile/training?resource=schemes', { user: member, allow: true, demo: true });
  assert.equal(listed.status, 200);
  const schemes = (listed.body as { schemes: SetScheme[] }).schemes;
  const storedWave = schemes.find(scheme => scheme.id === wave.id);
  assert.ok(storedWave);
  assert.equal(storedWave.title, wave.title);
  registerSchemes(schemes);
  const resolved = schemeById(wave.id);
  assert.equal(resolved.title, wave.title);
  assert.equal(resolved.amount, wave.amount);
  assert.equal(resolved.load, wave.load);
  const session = parseSession(
    {
      id: 'wave-day',
      typeId: 'type-strength',
      title: 'Wave day',
      goal: 'One wave.',
      blocks: [{ id: 'press', exerciseId: 'barbell-bench-press', sets: 3, scheme: wave.id, targets: { reps: { min: 8, max: 12 } } }],
      status: 'draft',
    },
    trainingCatalog().types,
    schemes,
  );
  assert.equal(session.blocks[0]?.scheme, wave.id);
  const planned = planWithScheme(move('barbell-bench-press'), { sets: 3, repsMin: 8, repsMax: 12 }, resolved, null);
  assert.deepEqual(
    planned.sets.map(set => set.reps),
    [8, 10, 12],
  );
  const stored = await trainingPost(admin, { action: 'upsert-session', session: { ...session, status: 'live' } }, { demo: true });
  assert.equal(stored.status, 200);
  registerSchemes([]);
});

test('scheme ids live only in the data, the seed and the tests', () => {
  const ids = ['straight', 'pyramid', 'reverse-pyramid', 'descending', 'drop-set', 'wave'];
  const allowed = new Set([
    'shared/set-schemes-data.ts',
    'shared/gym-flows.ts',
    'shared/gym-flow-sessions.ts',
    'shared/training-seed/index.ts',
    'tests/set-schemes.test.ts',
  ]);
  for (const file of [...walk('shared'), ...walk('src'), ...walk('mobile'), ...walk('tests')]) {
    if (allowed.has(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const id of ids) {
      assert.equal(text.includes(`'${id}'`) || text.includes(`"${id}"`), false, `${file} mentions ${id}`);
    }
  }
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === '.next' ? [] : walk(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}
