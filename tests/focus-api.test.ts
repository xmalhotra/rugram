import assert from 'node:assert/strict';
import test from 'node:test';
import { FocusPlanError, changeFocusPlan, readFocusPlan } from '../src/lib/focus-store';
import { gymFlowById } from '../shared/gym-flows';
import { changeFlowSeries, readSeriesWindow } from '../src/lib/flow-series-store';
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

const flowId = 'gym-back-biceps';
const exercises = [
  'barbell-bent-over-row',
  'incline-dumbbell-curl',
  'mid-width-lat-pulldown',
  'close-grip-seated-row',
  'face-pull',
  'cable-curl',
];

function rememberRun(run: { id: string; userId: string; status: string; updatedAt: string; flowId: string; title: string; state?: unknown }) {
  const bag = (globalThis.qramFlowRuns ??= { metrics: [], runs: [] }) as {
    runs: { id: string; userId: string; status: string; updatedAt: string; flowId: string; title: string; state?: unknown }[];
  };
  bag.runs.push(run);
}

test('a focus plan adds a once-only series, leaves a set time alone, and undo removes it', async () => {
  const owner = user(`focus-${crypto.randomUUID()}`);
  const other = user(`focus-other-${crypto.randomUUID()}`);
  assert.notEqual(owner.id, '1');
  assert.notEqual(other.id, '1');
  const created = await changeFlowSeries(
    owner,
    {
      action: 'create',
      itemKind: 'flow',
      itemId: flowId,
      start: '2026-11-09',
      time: { checkpoint: 'Morning', at: '07:15' },
      recurrence: { kind: 'weekly', every: 1, days: [1] },
      end: { kind: 'never' },
    },
    true,
  );
  const series = created.series.find(row => row.itemId === flowId);
  assert.ok(series);
  rememberRun({
    id: `run-${owner.id}`,
    userId: owner.id,
    status: 'finished',
    updatedAt: '2026-11-09T12:00:00.000Z',
    flowId,
    title: 'Back + Biceps',
    state: {
      cards: exercises.map(exerciseId => ({
        cardId: `${flowId}:${exerciseId}`,
        sourceFlowId: flowId,
        status: 'done',
      })),
    },
  });

  const plan = await readFocusPlan(owner, '2026-11-15', true);
  const add = plan.suggestions.find(item => item.kind === 'add' && /legs had 0 sets/i.test(item.reason));
  assert.ok(add, plan.suggestions.map(item => `${item.kind}: ${item.reason}`).join(' | '));
  assert.equal(add.change.type, 'once');
  for (const item of plan.suggestions) {
    if (item.change.type === 'move') assert.equal('time' in item.change, false);
    if (item.change.type === 'once' || item.change.type === 'replace') assert.equal(item.change.time.at, undefined);
  }
  assert.equal(plan.done, 1);
  assert.equal(plan.planned >= 1, true);

  const applied = await changeFocusPlan(owner, { action: 'apply', week: '2026-11-15', ids: [add.id] }, true);
  assert.equal(applied.appliedIds.includes(add.id), true);
  const window = await readSeriesWindow(owner, '2026-11-16', '2026-11-22', true);
  const added = window.series.find(row => row.id !== series.id && row.recurrence.kind === 'once');
  assert.ok(added);
  assert.equal(added.time.at, undefined);
  assert.equal(added.time.checkpoint, 'Morning');
  const kept = window.series.find(row => row.id === series.id);
  assert.equal(kept?.time.at, '07:15');
  assert.equal(kept?.time.checkpoint, 'Morning');

  const otherPlan = await readFocusPlan(other, '2026-11-15', true);
  assert.equal(otherPlan.suggestions.some(item => item.id === add.id), false);
  await assert.rejects(
    () => changeFocusPlan(other, { action: 'apply', week: '2026-11-15', ids: [add.id] }, true),
    (error: unknown) => error instanceof FocusPlanError,
  );

  const undone = await changeFocusPlan(owner, { action: 'undo', week: '2026-11-15', id: add.id }, true);
  assert.equal(undone.appliedIds.includes(add.id), false);
  const after = await readSeriesWindow(owner, '2026-11-16', '2026-11-22', true);
  assert.equal(after.series.some(row => row.id === added.id), false);
  assert.equal(after.series.find(row => row.id === series.id)?.time.at, '07:15');

  await assert.rejects(
    () => changeFocusPlan(owner, { action: 'apply', week: '2026-11-15', ids: ['missing-suggestion'] }, true),
    (error: unknown) => error instanceof FocusPlanError,
  );
});

test('a 2× body-weight deadlift plans the next week as Advanced after one logged week', async () => {
  const owner = user(`focus-lift-${crypto.randomUUID()}`);
  assert.notEqual(owner.id, '1');
  await changeFlowSeries(
    owner,
    {
      action: 'create',
      itemKind: 'flow',
      itemId: flowId,
      start: '2026-11-09',
      time: { checkpoint: 'Morning' },
      recurrence: { kind: 'weekly', every: 1, days: [1] },
      end: { kind: 'never' },
    },
    true,
  );
  rememberRun({
    id: `run-lift-${owner.id}`,
    userId: owner.id,
    status: 'finished',
    updatedAt: '2026-11-09T12:00:00.000Z',
    flowId,
    title: 'Back + Biceps',
    state: {
      cards: exercises.map(exerciseId => ({
        cardId: `${flowId}:${exerciseId}`,
        sourceFlowId: flowId,
        status: 'done',
      })),
    },
  });
  const bodies = ((globalThis as { qramStrengthBody?: { userId: string; weightKg: number; lifestyle: string; updatedAt: string }[] }).qramStrengthBody ?? []).filter(
    row => row.userId !== owner.id,
  );
  const anchors = (
    (globalThis as { qramStrengthAnchors?: { userId: string; pattern: string; weightKg: number; reps: number; updatedAt: string }[] }).qramStrengthAnchors ?? []
  ).filter(row => row.userId !== owner.id);
  bodies.push({ userId: owner.id, weightKg: 80, lifestyle: 'athlete', updatedAt: '2026-11-01T00:00:00.000Z' });
  anchors.push({ userId: owner.id, pattern: 'hinge', weightKg: 160, reps: 5, updatedAt: '2026-11-01T00:00:00.000Z' });
  (globalThis as { qramStrengthBody?: typeof bodies }).qramStrengthBody = bodies;
  (globalThis as { qramStrengthAnchors?: typeof anchors }).qramStrengthAnchors = anchors;

  const plan = await readFocusPlan(owner, '2026-11-15', true);
  const add = plan.suggestions.find(item => item.kind === 'add' && (item.change.type === 'once' || item.change.type === 'replace'));
  assert.ok(add, plan.suggestions.map(item => `${item.kind}: ${item.reason}`).join(' | '));
  const itemId = add.change.type === 'once' || add.change.type === 'replace' ? add.change.itemId : '';
  assert.equal(gymFlowById(itemId)?.level, 'Advanced');
});
