import assert from 'node:assert/strict';
import test from 'node:test';
import { changeFlowSeries, readSeriesWindow } from '../src/lib/flow-series-store';
import { changeMapFlow, listMapFlows, MapFlowError } from '../src/lib/map-flow-store';
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

test('a member with series gets one Base in slot 1, and a second read does not add another', async () => {
  const owner = user(`map-base-${crypto.randomUUID()}`);
  await changeFlowSeries(owner, series('gym-splits-power-upper'), true);
  await changeFlowSeries(owner, series('gym-splits-power-lower', '2026-11-02'), true);
  const list = await listMapFlows(owner, true, '2026-11-09');
  assert.equal(list.flows.length, 1);
  assert.equal(list.flows[0]?.slot, 1);
  assert.equal(list.flows[0]?.name, 'Base');
  assert.equal(list.flows[0]?.sourceKind, 'backfill');
  assert.equal(list.followedId, list.flows[0]?.id);
  const ids = list.flows[0]?.days.flatMap(day => day.flows.map(flow => flow.id)).sort();
  assert.deepEqual(ids, ['gym-splits-power-lower', 'gym-splits-power-upper']);
  const again = await listMapFlows(owner, true, '2026-11-09');
  assert.equal(again.flows.length, 1);
  assert.equal(again.flows[0]?.id, list.flows[0]?.id);
  const window = await readSeriesWindow(owner, '2026-11-09', '2026-11-10', true);
  assert.equal(window.series.length, 2);
  assert.ok(window.series.every(item => item.mapFlowId === list.flows[0]?.id));
  assert.deepEqual(
    window.occurrences.filter(item => item.itemId === 'gym-splits-power-upper').map(item => item.date),
    ['2026-11-09', '2026-11-10'],
  );
});

test('five slots is the limit, and base stays while it is the only Map flow', async () => {
  const owner = user(`map-slots-${crypto.randomUUID()}`);
  const templates = ['gain-muscle-beginner', 'get-stronger-beginner', 'visible-abs-beginner', 'move-better-beginner', 'handstand-beginner'];
  for (const templateId of templates) {
    await changeMapFlow(owner, { action: 'create', templateId, start: '2026-11-09' }, true, '2026-11-09');
  }
  await assert.rejects(() => changeMapFlow(owner, { action: 'create', templateId: 'hyrox-beginner', start: '2026-11-09' }, true), /five slots/);
  const only = user(`map-only-${crypto.randomUUID()}`);
  await changeMapFlow(only, { action: 'create', templateId: 'gain-muscle-beginner', start: '2026-11-09' }, true);
  await assert.rejects(() => changeMapFlow(only, { action: 'clear', slot: 1 }, true), /only Map flow/);
  await changeMapFlow(owner, { action: 'clear', slot: 3 }, true, '2026-11-09');
  const opened = await changeMapFlow(owner, { action: 'create', templateId: 'hyrox-beginner', slot: 3, start: '2026-11-09' }, true, '2026-11-09');
  assert.equal(opened.flows.find(flow => flow.slot === 3)?.styleId, 'hybrid');
  assert.equal(opened.flows.length, 5);
});

test('following from a later date leaves earlier days alone, history stays, and base is one step back', async () => {
  const owner = user(`map-follow-${crypto.randomUUID()}`);
  await changeFlowSeries(owner, series('gym-splits-power-upper'), true);
  const base = await listMapFlows(owner, true, '2026-11-09');
  const baseId = base.flows[0]?.id;
  assert.ok(baseId);
  const created = await changeMapFlow(owner, { action: 'create', templateId: 'gain-muscle-beginner', start: '2026-11-12' }, true, '2026-11-09');
  const other = created.flows.find(flow => flow.slot === 2);
  assert.ok(other);
  await changeMapFlow(owner, { action: 'follow', mapFlowId: other.id, from: '2026-11-12' }, true, '2026-11-12');
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-11T12:00:00.000Z', flowId: 'gym-splits-power-upper' });
  const window = await readSeriesWindow(owner, '2026-11-09', '2026-11-12', true);
  const on = (date: string) => window.occurrences.filter(item => item.date === date).map(item => item.itemId);
  assert.deepEqual(on('2026-11-09'), ['gym-splits-power-upper']);
  assert.deepEqual(on('2026-11-11'), ['gym-splits-power-upper']);
  assert.equal(window.occurrences.find(item => item.date === '2026-11-11')?.status, 'done');
  const withDone = await listMapFlows(owner, true, '2026-11-12');
  assert.ok(withDone.flows.find(flow => flow.id === baseId)?.doneDates.includes('2026-11-11'));
  assert.deepEqual(on('2026-11-12'), ['gym-splits-size-upper']);
  const back = await changeMapFlow(owner, { action: 'base', from: '2026-11-14' }, true, '2026-11-14');
  assert.equal(back.followedId, baseId);
  const returned = await readSeriesWindow(owner, '2026-11-14', '2026-11-14', true);
  assert.deepEqual(returned.occurrences.map(item => item.itemId), ['gym-splits-power-upper']);
  assert.equal(returned.occurrences.find(item => item.date === '2026-11-12'), undefined);
  const during = await readSeriesWindow(owner, '2026-11-12', '2026-11-12', true);
  assert.deepEqual(during.occurrences.map(item => item.itemId), ['gym-splits-size-upper']);
});

test('a stored copy has the same pattern and style and no private fields', async () => {
  const owner = user(`map-copy-${crypto.randomUUID()}`);
  const created = await changeMapFlow(owner, { action: 'create', templateId: 'gain-muscle-beginner', start: '2026-11-09' }, true, '2026-11-09');
  const source = created.flows[0];
  assert.ok(source);
  const copied = await changeMapFlow(owner, { action: 'copy', mapFlowId: source.id, start: '2026-11-09' }, true, '2026-11-09');
  const copy = copied.flows.find(flow => flow.slot === 2);
  assert.ok(copy);
  assert.equal(copy.styleId, source.styleId);
  assert.equal(copy.repeat, source.repeat);
  assert.deepEqual(
    copy.days.map(day => ({ name: day.name, flows: day.flows.map(flow => flow.id), items: day.items.map(item => item.itemId) })),
    source.days.map(day => ({ name: day.name, flows: day.flows.map(flow => flow.id), items: day.items.map(item => item.itemId) })),
  );
  assert.equal(copy.sourceKind, 'copy');
  assert.notEqual(copy.id, source.id);
  assert.equal(JSON.stringify(copy).includes('weightKg'), false);
  assert.equal(JSON.stringify(copy).includes('ticks'), false);
  assert.ok(copy.items.some(item => item.itemId === 'creatine'));
  assert.equal(copy.figure.some(area => area.state === 'worked'), true);
  const other = user(`map-other-${crypto.randomUUID()}`);
  await assert.rejects(() => changeMapFlow(other, { action: 'copy', mapFlowId: source.id, start: '2026-11-09' }, true), (error: unknown) => {
    assert.ok(error instanceof MapFlowError);
    assert.equal(error.status, 404);
    return true;
  });
});
