import test from 'node:test';
import assert from 'node:assert/strict';
import { completionDay } from '../shared/completion-input';
test('replayed completions preserve their original device day across midnight', () => {
  const now = new Date('2026-10-17T18:40:00Z');
  assert.equal(completionDay('2026-10-17', 'Asia/Kolkata', now), '2026-10-17');
  assert.equal(completionDay(undefined, 'Asia/Kolkata', now), '2026-10-18');
  assert.equal(completionDay(undefined, 'America/Los_Angeles', now), '2026-10-17');
});
test('completion replay rejects impossible, future and expired days', () => {
  const now = new Date('2026-10-17T12:00Z');
  for (const value of ['2026-10-18', '2026-02-30', '2026-09-19', 'x', '2026-1-1'])
    assert.throws(() => completionDay(value, 'Asia/Kolkata', now));
  assert.equal(completionDay('2026-09-20', 'Asia/Kolkata', now), '2026-09-20');
  assert.throws(() => completionDay(undefined, 'Not/AZone', now));
});
