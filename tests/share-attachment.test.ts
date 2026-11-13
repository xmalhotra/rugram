import assert from 'node:assert/strict';
import test from 'node:test';
import { followPlan, slotOneWarning, slotsFullLine, type TheirFlow } from '../shared/follow';
import {
  attachmentChanges,
  attachmentHasPrivate,
  buildAttachment,
  canDeleteRemark,
  canWriteRemark,
  mergeShareFeed,
  moderateShareText,
  updateOffer,
} from '../shared/share-attachment';

function attachment(exercises: { exerciseId: string; sets: number; repsMin?: number; repsMax?: number; weightKg?: number; logs?: unknown }[]) {
  return buildAttachment({
    kind: 'custom-flow',
    sourceId: 'gym-splits-size-upper',
    title: 'Size upper',
    styleId: 'member',
    styleName: 'Your flow',
    level: 'Intermediate',
    minutes: 40,
    owner: { id: 'owner', name: 'Ava' },
    followedFor: '1 session',
    exercises,
    items: [],
    days: [
      {
        name: 'Size upper',
        effort: 'full',
        exercises,
        items: [],
        flows: [{ kind: 'flow', id: 'gym-splits-size-upper', items: exercises }],
      },
    ],
    purposeIds: [],
    repeat: 'in-turn',
    version: 1,
    weightKg: 80,
    bodyWeightKg: 71,
    logs: [{ private: true }],
    ticks: [1],
  });
}

test('a snapshot never holds weights, body weight or logs', () => {
  const snapshot = attachment([
    { exerciseId: 'dumbbell-bench-press', sets: 4, repsMin: 8, repsMax: 12, weightKg: 80, logs: [{ weight: 80 }] },
  ]);
  const text = JSON.stringify(snapshot);
  assert.equal(attachmentHasPrivate(snapshot), false);
  assert.equal(text.includes('weightKg'), false);
  assert.equal(text.includes('bodyWeight'), false);
  assert.equal(text.includes('logs'), false);
  assert.equal(text.includes('"ticks"'), false);
  assert.equal(snapshot.exercises[0]?.sets, 4);
  assert.equal(snapshot.exercises[0]?.repsMin, 8);
});

test('an update is offered as words and does not change the saved copy', () => {
  const saved = attachment([{ exerciseId: 'dumbbell-bench-press', sets: 4, repsMin: 8, repsMax: 12 }]);
  const current = attachment([
    { exerciseId: 'dumbbell-bench-press', sets: 3, repsMin: 8, repsMax: 12 },
    { exerciseId: 'ez-bar-curl', sets: 3, repsMin: 10, repsMax: 12 },
  ]);
  const before = JSON.stringify(saved);
  const offer = updateOffer(saved, current);
  assert.ok(offer);
  assert.equal(attachmentChanges(saved, current).some(line => line.startsWith('Added')), true);
  assert.equal(offer?.changes.some(line => line.includes('now 3 sets')), true);
  assert.equal(JSON.stringify(saved), before);
  assert.equal(updateOffer(saved, saved), null);
});

test('anyone can remark, and only the author or the writer can delete it', () => {
  assert.equal(canWriteRemark('member'), true);
  assert.equal(canWriteRemark(''), false);
  assert.equal(canDeleteRemark('author', 'author', 'reader'), true);
  assert.equal(canDeleteRemark('reader', 'author', 'reader'), true);
  assert.equal(canDeleteRemark('stranger', 'author', 'reader'), false);
});

test('share text uses the same length limit as other posts', () => {
  assert.equal(moderateShareText('  try this  ', true), 'try this');
  assert.equal(moderateShareText('   ', true), '');
  assert.throws(() => moderateShareText('   ', false), /remark/);
  assert.throws(() => moderateShareText('x'.repeat(281), true), /280/);
});

test('finished runs and attachment posts share one newest-first feed', () => {
  const rows = mergeShareFeed(
    [{ id: 'run', at: '2026-11-01T01:00:00.000Z' }],
    [
      { id: 'late', at: '2026-11-01T03:00:00.000Z' },
      { id: 'mid', at: '2026-11-01T02:00:00.000Z' },
    ],
  );
  assert.deepEqual(
    rows.map(row => (row.kind === 'activity' ? row.activity.id : row.post.id)),
    ['late', 'mid', 'run'],
  );
});

test('a full Map flow asks which slot to replace and warns before slot 1', () => {
  const theirFlow: TheirFlow = {
    title: 'Upper and lower',
    fromName: 'Ava',
    kind: 'map',
    map: {
      name: 'Upper and lower',
      styleId: 'body-part',
      purposeIds: ['gain-muscle'],
      repeat: 'in-turn',
      days: [{ name: 'Upper', effort: 'upper', flows: [{ kind: 'flow', id: 'gym-splits-size-upper' }], items: [] }],
    },
  };
  const slots = [1, 2, 3, 4, 5].map(slot => ({ slot }));
  const base = { theirFlow, myMapFlow: null, where: { kind: 'add' as const, date: '2026-11-16' }, sessions: 1 as const, after: 'return' as const, today: '2026-11-16', slots };
  const full = followPlan(base);
  assert.equal(full.kind, 'map');
  assert.equal(full.problem, slotsFullLine);
  const warned = followPlan({ ...base, replaceSlot: 1 });
  assert.equal(warned.problem, slotOneWarning);
  assert.equal(warned.kind, 'map');
  if (warned.kind === 'map') assert.equal(warned.slot, null);
  const replaced = followPlan({ ...base, replaceSlot: 1, confirmBase: true });
  assert.equal(replaced.kind === 'map' && replaced.slot, 1);
  assert.equal(replaced.problem, null);
  const third = followPlan({ ...base, replaceSlot: 3 });
  assert.equal(third.kind === 'map' && third.slot, 3);
});
