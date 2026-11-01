import assert from 'node:assert/strict';
import test from 'node:test';
import { todaySteps } from '../shared/today';
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
test('save and flow actions use explicit desired state, and rollback preserves unrelated data', () => {
  const action = { action: 'save', id: 'product', enabled: true };
  const updated = profileAction(data, action, now);
  assert.deepEqual(profileAction(updated, action, now).profile.savedProductIds, ['product']);
  const changed = { ...updated, profile: { ...updated.profile, city: 'Bengaluru' } };
  const reverted = profileAction(changed, reverseProfileAction(data, action, now), now);
  assert.equal(reverted.profile.city, 'Bengaluru');
  assert.deepEqual(reverted.profile.savedProductIds, []);
});
