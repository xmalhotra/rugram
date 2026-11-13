import assert from 'node:assert/strict';
import test from 'node:test';
import { readCustomflows } from '../src/lib/customflow-store';
import { readFlowFollows, startFlowFollow, stopFlowFollow } from '../src/lib/follow-store';
import { changeFlowSeries, readSeriesWindow } from '../src/lib/flow-series-store';
import { listMapFlows } from '../src/lib/map-flow-store';
import { mapFlowTemplateById } from '../shared/map-flow-templates';
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

function series(itemId: string, start = '2026-11-01') {
  return {
    action: 'create' as const,
    itemKind: 'flow' as const,
    itemId,
    start,
    time: { checkpoint: 'Morning' as const },
    recurrence: { kind: 'daily' as const, every: 1 },
    end: { kind: 'never' as const },
  };
}

function rememberRun(run: { userId: string; status: string; updatedAt: string; flowId: string }) {
  const bag = (globalThis.qramFlowRuns ??= { metrics: [], runs: [] }) as {
    runs: { userId: string; status: string; updatedAt: string; flowId: string }[];
  };
  bag.runs.push(run);
}

function offered(extra: Record<string, unknown> = {}) {
  return {
    title: 'Size upper',
    fromName: 'q_ava',
    kind: 'custom' as const,
    source: { kind: 'qram-flow' as const, id: 'gym-splits-size-upper', version: null },
    items: [{ exerciseId: 'dumbbell-bench-press', sets: 4, repsMin: 8, repsMax: 12, weightKg: 80, logs: [{ weight: 80 }] }],
    changes: { order: ['dumbbell-bench-press', 'incline-dumbbell-press'] },
    weightKg: 70,
    logs: ['private'],
    bodyWeightKg: 71,
    ...extra,
  };
}

async function ownSeries(owner: PublicUser) {
  await changeFlowSeries(owner, series('gym-splits-power-upper'), true);
  const window = await readSeriesWindow(owner, '2026-11-01', '2026-11-20', true);
  const seriesRow = window.series.find(item => item.itemId === 'gym-splits-power-upper');
  assert.ok(seriesRow);
  return {
    id: seriesRow.id,
    itemId: seriesRow.itemId,
    start: seriesRow.start,
    recurrence: seriesRow.recurrence,
    end: seriesRow.end,
  };
}

function sameSeries(row: { id: string; itemId: string; start: string; recurrence: unknown; end: unknown } | undefined, fingerprint: Awaited<ReturnType<typeof ownSeries>>) {
  assert.ok(row);
  assert.equal(row.id, fingerprint.id);
  assert.equal(row.itemId, fingerprint.itemId);
  assert.equal(row.start, fingerprint.start);
  assert.deepEqual(row.recurrence, fingerprint.recurrence);
  assert.deepEqual(row.end, fingerprint.end);
}

test('a trial counts down, returns on its own, and leaves history on the original series', async () => {
  const owner = user(`follow-return-${crypto.randomUUID()}`);
  const fingerprint = await ownSeries(owner);
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-10T12:00:00.000Z', flowId: 'gym-splits-power-upper' });
  const started = await startFlowFollow(
    owner,
    { action: 'start', theirFlow: offered(), sessions: 4, after: 'return', today: '2026-11-16' },
    true,
  );
  const trial = started.follows.find(item => item.status === 'active');
  assert.ok(trial);
  assert.equal(trial.sessionsLeft, 4);
  assert.equal(trial.pausedSeriesId, fingerprint.id);
  assert.equal(JSON.stringify(started).includes('"weightKg"'), false);
  assert.equal(JSON.stringify(started).includes('"logs"'), false);
  assert.equal(JSON.stringify(started).includes('"bodyWeightKg"'), false);
  assert.equal(trial.items[0]?.exerciseId, 'dumbbell-bench-press');
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const mid = await readFlowFollows(owner, '2026-11-16', true);
  const counted = mid.follows.find(item => item.id === trial.id);
  assert.equal(counted?.sessionsLeft, 3);
  assert.equal(counted?.status, 'active');
  const one = user(`follow-one-${crypto.randomUUID()}`);
  const keptSeries = await ownSeries(one);
  const begun = await startFlowFollow(one, { action: 'start', theirFlow: offered(), sessions: 1, after: 'return', today: '2026-11-16' }, true);
  const id = begun.follows.find(item => item.fromName === 'q_ava')?.id;
  assert.ok(id);
  rememberRun({ userId: one.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const returned = await readFlowFollows(one, '2026-11-17', true);
  const done = returned.follows.find(item => item.id === id);
  assert.equal(done?.status, 'returned');
  assert.equal(done?.sessionsLeft, 0);
  assert.match(returned.reviewLines[0] ?? '', /is back/);
  assert.match(returned.reviewLines[0] ?? '', /q_ava/);
  const window = await readSeriesWindow(one, '2026-11-10', '2026-11-17', true);
  const on = (date: string) => window.occurrences.filter(item => item.date === date && item.seriesId === keptSeries.id).map(item => item.itemId);
  assert.deepEqual(on('2026-11-17'), ['gym-splits-power-upper']);
  assert.deepEqual(on('2026-11-16'), ['gym-splits-size-upper']);
  sameSeries(window.series.find(item => item.id === keptSeries.id), keptSeries);
});

test('stopping early lifts the pause and keep turns the snapshot into a Custom flow', async () => {
  const owner = user(`follow-stop-${crypto.randomUUID()}`);
  const fingerprint = await ownSeries(owner);
  const started = await startFlowFollow(owner, { action: 'start', theirFlow: offered(), sessions: 4, after: 'return', today: '2026-11-16' }, true);
  const id = started.follows[0]?.id;
  assert.ok(id);
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const stopped = await stopFlowFollow(owner, id, true, '2026-11-17');
  assert.equal(stopped.follows.find(item => item.id === id)?.status, 'stopped');
  const window = await readSeriesWindow(owner, '2026-11-16', '2026-11-17', true);
  const on = (date: string) => window.occurrences.filter(item => item.date === date && item.seriesId === fingerprint.id).map(item => item.itemId);
  assert.deepEqual(on('2026-11-16'), ['gym-splits-size-upper']);
  assert.deepEqual(on('2026-11-17'), ['gym-splits-power-upper']);
  sameSeries(window.series.find(item => item.id === fingerprint.id), fingerprint);

  const keeper = user(`follow-keep-${crypto.randomUUID()}`);
  const own = await ownSeries(keeper);
  const begun = await startFlowFollow(keeper, { action: 'start', theirFlow: offered(), sessions: 1, after: 'keep', today: '2026-11-16' }, true);
  rememberRun({ userId: keeper.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const kept = await readFlowFollows(keeper, '2026-11-17', true);
  assert.equal(kept.follows[0]?.status, 'kept');
  const flows = await readCustomflows(keeper);
  const custom = Object.values(flows).find(item => item.source.id === 'gym-splits-size-upper');
  assert.equal(custom?.fromName, 'q_ava');
  assert.ok(custom?.changes.order?.length);
  assert.equal(JSON.stringify(custom).includes('"weightKg"'), false);
  const after = await readSeriesWindow(keeper, '2026-11-16', '2026-11-17', true);
  sameSeries(after.series.find(item => item.id === own.id), own);
  const next = after.occurrences.filter(item => item.date === '2026-11-17' && item.seriesId === own.id).map(item => item.itemId);
  assert.deepEqual(next, ['gym-splits-size-upper']);
  assert.equal(begun.follows[0]?.pausedSeriesId, own.id);
});

test('a shared Map flow is copied into a free slot without private fields', async () => {
  const owner = user(`follow-map-${crypto.randomUUID()}`);
  const template = mapFlowTemplateById('gain-muscle-beginner');
  assert.ok(template);
  const started = await startFlowFollow(
    owner,
    {
      action: 'start',
      today: '2026-11-16',
      theirFlow: {
        title: template.name,
        fromName: 'q_ava',
        kind: 'map',
        map: {
          ...template,
          weightKg: 80,
          logs: ['private'],
          days: template.days.map(day => ({
            ...day,
            flows: day.flows.map(flow => ({ ...flow, weightKg: 40, logs: [1] })),
          })),
        },
      },
    },
    true,
  );
  assert.equal(started.placedSlot, 1);
  const listed = await listMapFlows(owner, true, '2026-11-16');
  const copy = listed.flows.find(flow => flow.slot === 1);
  assert.ok(copy);
  assert.equal(copy.name, template.name);
  assert.equal(copy.styleId, template.styleId);
  assert.equal(JSON.stringify(copy).includes('"weightKg"'), false);
  assert.equal(JSON.stringify(copy).includes('"logs"'), false);
  assert.equal(JSON.stringify(started).includes('"weightKg"'), false);
});
