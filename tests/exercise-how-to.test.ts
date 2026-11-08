import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { howToGeneral, isYouTubeUrl, parseHowTo, seededHowTos, type ExerciseHowTo } from '../shared/exercise-how-to';
import { gymFlowById } from '../shared/gym-flows';
import { resetTrainingMemory, trainingGet, trainingPost } from '../src/lib/training-store';
import type { PublicUser } from '../src/lib/types';

const admin: PublicUser = {
  id: 'howto-admin',
  handle: 'howto-admin',
  name: 'How',
  role: 'admin',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
};

const member: PublicUser = {
  id: 'howto-member',
  handle: 'howto-member',
  name: 'Member',
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
};

function flowIds(id: string) {
  const flow = gymFlowById(id);
  assert.ok(flow, id);
  return flow.items.map(item => item.exerciseId);
}

test('the eleven home exercises parse, stay short, and make no medical claim', () => {
  const rows = seededHowTos();
  const expected = [...flowIds('cal-upper-beginner'), ...flowIds('cal-upper-intermediate')];
  const home = rows.filter(row => expected.includes(row.exerciseId));
  assert.equal(home.length, 11);
  assert.deepEqual(home.map(row => row.exerciseId).sort(), [...expected].sort());
  assert.equal(howToGeneral, 'General guidance, not medical advice. Stop if something hurts.');
  const text = [howToGeneral, ...rows.flatMap(row => [...row.steps, row.feel, row.mistake, row.note ?? ''])].join('\n');
  assert.match(text, /not medical advice/);
  assert.doesNotMatch(text, /\b(cure|cures|treat|treats|treatment|diagnose|diagnosis|heal|heals|healing|prescription|clinical)\b/i);
  for (const row of home) {
    assert.deepEqual(parseHowTo(row), row);
    assert.equal(row.status, 'live');
    for (const step of row.steps) assert.ok(step.length <= 90, step);
  }
  const push = home.find(row => row.exerciseId === 'push-up');
  assert.deepEqual(push?.steps, [
    'Hands under your shoulders, body straight from head to heels.',
    'Bend your elbows and lower your chest close to the floor.',
    'Push back up until your arms are straight.',
  ]);
  assert.throws(() => parseHowTo({ ...home[0], exerciseId: 'missing-move' }), /Unknown exercise/);
  assert.throws(() => parseHowTo({ ...home[0], steps: home[0]?.steps.slice(0, 1) }), /2 to 5/);
  assert.throws(() => parseHowTo({ ...home[0], steps: [...(home[0]?.steps ?? []), 'x'.repeat(91)] }), /90 characters/);
});

test('every seeded how-to parses, stays within 90 characters, and avoids banned claims', () => {
  const rows = seededHowTos();
  const banned = /burn|cure|prevent|guarantee/i;
  assert.ok(rows.length > 11);
  for (const row of rows) {
    assert.deepEqual(parseHowTo(row), row);
    const text = [...row.steps, row.feel, row.mistake, row.note ?? ''].join('\n');
    assert.doesNotMatch(text, banned);
    for (const step of row.steps) assert.ok(step.length <= 90, `${row.exerciseId}: ${step}`);
  }
});

test('an admin can save a how-to and a member can read it, including one the app has never named', async () => {
  resetTrainingMemory();
  const missing = await trainingGet('http://local/api/mobile/training?resource=how-to&id=air-squat', {
    user: member,
    allow: true,
    demo: true,
  });
  assert.equal(missing.status, 200);
  assert.equal((missing.body as { howTo: ExerciseHowTo | null }).howTo, null);
  const seeded = await trainingGet('http://local/api/mobile/training?resource=how-to&id=push-up', {
    user: member,
    allow: true,
    demo: true,
  });
  assert.equal(seeded.status, 200);
  const pushed = (seeded.body as { howTo: ExerciseHowTo; general: string }).howTo;
  assert.equal(pushed.feel, 'Chest and the back of your arms.');
  assert.equal((seeded.body as { general: string }).general, howToGeneral);
  const created: ExerciseHowTo = {
    exerciseId: 'air-squat',
    steps: ['Stand with your feet about hip width.', 'Sit your hips back and bend your knees.', 'Stand back up and squeeze your glutes.'],
    feel: 'Legs and glutes.',
    mistake: 'Letting your knees cave in.',
    status: 'live',
  };
  const denied = await trainingPost(member, { action: 'upsert-how-to', howTo: created }, { demo: true });
  assert.equal(denied.status, 403);
  const saved = await trainingPost(admin, { action: 'upsert-how-to', howTo: created }, { demo: true });
  assert.equal(saved.status, 200);
  const listed = await trainingGet('http://local/api/mobile/training?resource=how-to&id=air-squat', {
    user: member,
    allow: true,
    demo: true,
  });
  assert.equal(listed.status, 200);
  assert.equal((listed.body as { howTo: ExerciseHowTo }).howTo.mistake, created.mistake);
  const draft = await trainingPost(
    admin,
    { action: 'upsert-how-to', howTo: { ...created, exerciseId: 'hip-circles', status: 'draft' } },
    { demo: true },
  );
  assert.equal(draft.status, 200);
  const hidden = await trainingGet('http://local/api/mobile/training?resource=how-to&id=hip-circles', {
    user: member,
    allow: true,
    demo: true,
  });
  assert.equal((hidden.body as { howTo: ExerciseHowTo | null }).howTo, null);
});

test('the how-to page does not branch on an exercise id', () => {
  const source = readFileSync('mobile/src/ExerciseHowTo.tsx', 'utf8');
  for (const row of seededHowTos()) assert.equal(source.includes(row.exerciseId), false, row.exerciseId);
  assert.equal(/exerciseId\s*===/.test(source), false);
  assert.equal(source.includes('General guidance'), false);
});

test('register-how-to-frames builds the map from a temporary folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'howto-frames-'));
  const map = join(dir, 'how-to-frames.ts');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  writeFileSync(join(dir, 'air-squat-2.png'), png);
  writeFileSync(join(dir, 'air-squat-1.png'), png);
  const realMap = 'mobile/src/how-to-frames.ts';
  const realAssets = 'mobile/assets/howto';
  const beforeMap = readFileSync(realMap, 'utf8');
  const beforeAssets = existsSync(realAssets) ? readdirSync(realAssets).sort() : null;
  execFileSync('node', ['scripts/register-how-to-frames.mjs', '--dir', dir, '--map', map], { encoding: 'utf8' });
  const written = readFileSync(map, 'utf8');
  assert.match(written, /eslint-disable @typescript-eslint\/no-require-imports/);
  assert.match(written, /'air-squat': \[require\('\.\/air-squat-1\.jpg'\) as number, require\('\.\/air-squat-2\.jpg'\) as number\]/);
  assert.equal(existsSync(join(dir, 'air-squat-1.jpg')), true);
  assert.equal(existsSync(join(dir, 'air-squat-1.png')), false);
  assert.equal(readFileSync(realMap, 'utf8'), beforeMap);
  assert.deepEqual(existsSync(realAssets) ? readdirSync(realAssets).sort() : null, beforeAssets);
  rmSync(dir, { recursive: true, force: true });
});

test('a how-to may carry a YouTube video, and anything else is refused', async () => {
  const { parseHowTo, exerciseVideoUrl, isYouTubeUrl } = await import('../shared/exercise-how-to');
  const base = { exerciseId: 'push-up', steps: ['One step here.', 'Another step here.'], feel: 'Chest.', mistake: 'Sagging.', status: 'live' };
  assert.equal(parseHowTo({ ...base, videoUrl: 'https://www.youtube.com/watch?v=abc123' }).videoUrl, 'https://www.youtube.com/watch?v=abc123');
  assert.equal(parseHowTo({ ...base, videoUrl: 'https://youtu.be/abc123' }).videoUrl, 'https://youtu.be/abc123');
  assert.throws(() => parseHowTo({ ...base, videoUrl: 'https://example.com/video' }));
  assert.throws(() => parseHowTo({ ...base, videoUrl: 'http://youtube.com/watch?v=abc' }));
  assert.equal(isYouTubeUrl('https://m.youtube.com/shorts/abc'), true);
  assert.equal(exerciseVideoUrl('Push-Up', 'https://youtu.be/abc123'), 'https://youtu.be/abc123');
  assert.match(exerciseVideoUrl('V-Taps'), /^https:\/\/www\.youtube\.com\/results\?search_query=V-Taps%20exercise%20proper%20form$/);
});

test('seeded videos are single YouTube watch links, one per exercise', () => {
  const withVideo = seededHowTos().filter(row => row.videoUrl);
  assert.ok(withVideo.length >= 40);
  const ids = new Set<string>();
  for (const row of withVideo) {
    const match = /^https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/.exec(row.videoUrl ?? '');
    assert.ok(match, row.exerciseId);
    assert.ok(isYouTubeUrl(row.videoUrl ?? ''), row.exerciseId);
    assert.ok(!ids.has(match[1]), `${row.exerciseId} reuses a video`);
    ids.add(match[1]);
  }
});
