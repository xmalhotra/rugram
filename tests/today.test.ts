import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseToday, todaySteps, type TodayEntry, type TodayFacts } from '../shared/today';
import { profileAction, reverseProfileAction } from '../shared/profile-action';
import type { MobilePayload } from '../shared/mobile';
const flow = {
  id: 'one',
  title: 'One',
  description: 'A flow',
  goal: 'Focus',
  steps: [{ id: 'step', title: 'A step', cue: 'When ready', duration: '1 minute' }],
};
const data = {
  user: { id: 'user' },
  flows: [flow],
  profile: {
    city: 'Hyderabad',
    flowIds: ['one'],
    savedProductIds: [],
    completed: [],
    eventIds: [],
  },
} as unknown as MobilePayload;
const now = new Date('2026-10-17T20:00:00Z');
test('Today includes only joined flows and uses the device day', () => {
  const action = { action: 'complete', id: 'one:step', enabled: true, timeZone: 'Asia/Kolkata' };
  const updated = profileAction(data, action, now);
  assert.deepEqual(updated.profile.completed, ['2026-10-18:one:step']);
  assert.equal(todaySteps([flow], updated.profile, now, 'Asia/Kolkata')[0].done, true);
  assert.equal(todaySteps([flow], updated.profile, now, 'UTC')[0].done, false);
  assert.deepEqual(todaySteps([flow], { ...data.profile, flowIds: [] }, now), []);
  assert.deepEqual(data.profile.completed, []);
});
test('completion is idempotent, reversible and cannot be entered without joining', () => {
  const action = { action: 'complete', id: 'one:step', enabled: true, timeZone: 'Asia/Kolkata' };
  const updated = profileAction(data, action, now);
  assert.equal(profileAction(updated, action, now).profile.completed.length, 1);
  assert.deepEqual(
    profileAction(updated, reverseProfileAction(data, action, now), now).profile.completed,
    [],
  );
  const unjoined = { ...data, profile: { ...data.profile, flowIds: [] } };
  assert.equal(profileAction(unjoined, action, now), unjoined);
});
const flowEntry = (over: Partial<TodayEntry> = {}): TodayEntry => ({
  id: 'push',
  kind: 'flow',
  title: 'Push',
  detail: 'Push day',
  done: false,
  ...over,
});

function facts(over: Partial<TodayFacts> = {}): TodayFacts {
  return {
    workout: null,
    question: null,
    today: null,
    tomorrow: null,
    missed: null,
    starter: { id: 'starter', title: 'First flow', reason: 'A first flow for this focus' },
    doneSummary: 'Today is done',
    ...over,
  };
}

test('Today uses the first matching rule, in order', () => {
  const workout = { title: 'Push', exercise: 2, exerciseCount: 5, timer: '12:04' };
  const question = { id: 'focus', title: 'What are you here for?', reason: 'Qram starts from what you want.' };
  const missed = { id: 'legs', title: 'Leg day', reason: 'Legs are missed this week' };
  const pending = [flowEntry(), flowEntry({ id: 'creatine', kind: 'item', title: 'Creatine', detail: '5 g', done: false })];
  const full = facts({
    workout,
    question,
    today: pending,
    missed,
    tomorrow: flowEntry({ id: 'pull', title: 'Pull', detail: 'Pull day' }),
  });
  assert.equal(chooseToday(full).rule, 'continue');
  assert.deepEqual(chooseToday({ ...full, workout: null }).rule, 'question');
  const started = chooseToday({ ...full, workout: null, question: null });
  assert.equal(started.rule, 'start');
  if (started.rule === 'start') assert.equal(started.entry.id, 'push');
  const itemOnly = chooseToday(facts({ today: [flowEntry({ id: 'creatine', kind: 'item', title: 'Creatine', detail: '5 g' })] }));
  assert.equal(itemOnly.rule, 'start');
  if (itemOnly.rule === 'start') assert.equal(itemOnly.entry.kind, 'item');
  const gap = chooseToday(facts({ today: [], missed }));
  assert.equal(gap.rule, 'suggest');
  const noPlan = chooseToday(facts({ today: null, missed }));
  assert.equal(noPlan.rule, 'suggest');
  const starter = chooseToday(facts());
  assert.equal(starter.rule, 'starter');
  if (starter.rule === 'starter') assert.equal(starter.starter?.title, 'First flow');
  const rest = chooseToday(facts({ today: [] }));
  assert.equal(rest.rule, 'done');
  const done = chooseToday(
    facts({
      today: [flowEntry({ done: true })],
      missed,
      tomorrow: flowEntry({ id: 'pull', title: 'Pull', detail: 'Pull day' }),
      doneSummary: 'Push is done',
    }),
  );
  assert.equal(done.rule, 'done');
  if (done.rule === 'done') {
    assert.equal(done.summary, 'Push is done');
    assert.equal(done.tomorrow?.title, 'Pull');
  }
});

test('save and flow actions use explicit desired state, and rollback preserves unrelated data', () => {
  const action = { action: 'save', id: 'product', enabled: true };
  const updated = profileAction(data, action, now);
  assert.deepEqual(profileAction(updated, action, now).profile.savedProductIds, ['product']);
  const changed = { ...updated, profile: { ...updated.profile, city: 'Bengaluru' } };
  const reverted = profileAction(changed, reverseProfileAction(data, action, now), now);
  assert.equal(reverted.profile.city, 'Bengaluru');
  assert.deepEqual(reverted.profile.savedProductIds, []);
});
