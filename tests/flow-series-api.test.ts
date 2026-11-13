import assert from 'node:assert/strict';
import test from 'node:test';
import { changeFlowSeries, FlowSeriesError, readSeriesWindow } from '../src/lib/flow-series-store';
import { trainingPost } from '../src/lib/training-store';
import type { PublicUser } from '../src/lib/types';
import { knownFlowIds } from '../shared/training';
import { trainingCatalog } from '../shared/training-seed';
import { addCalendarDays } from '../shared/flow-series';

const user = (id: string): PublicUser => ({
  id,
  handle: id,
  name: id,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

const flowId = [...knownFlowIds()][0];
const sessionId = trainingCatalog().sessions[0]?.id;

function draft(itemKind: 'flow' | 'session', itemId: string, start = '2026-11-09') {
  return {
    itemKind,
    itemId,
    start,
    time: { checkpoint: 'Morning' as const },
    recurrence: { kind: 'daily' as const, every: 1 },
    end: { kind: 'after' as const, count: 4 },
  };
}

test('create, list, skip, move, update and delete a series', async () => {
  assert.ok(flowId);
  assert.ok(sessionId);
  const owner = user(`series-owner-${crypto.randomUUID()}`);
  const created = await changeFlowSeries(owner, { action: 'create', ...draft('flow', flowId) }, true);
  assert.equal(created.series.length, 1);
  const id = created.series[0]?.id;
  assert.ok(id);
  const session = await changeFlowSeries(owner, { action: 'create', ...draft('session', sessionId, '2026-11-10') }, true);
  assert.equal(session.series.length, 2);

  const sessionIdOnSeries = session.series.find(row => row.itemKind === 'session')?.id;
  assert.ok(sessionIdOnSeries);
  const window = await readSeriesWindow(owner, '2026-11-09', '2026-11-12', true);
  assert.deepEqual(
    window.occurrences.filter(row => row.seriesId === id).map(row => row.date),
    ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'],
  );
  assert.deepEqual(
    window.occurrences.filter(row => row.seriesId === sessionIdOnSeries).map(row => row.date),
    ['2026-11-10', '2026-11-11', '2026-11-12'],
  );

  await changeFlowSeries(owner, { action: 'skip-one', seriesId: id, date: '2026-11-10' }, true);
  const skipped = await readSeriesWindow(owner, '2026-11-09', '2026-11-13', true);
  assert.equal(
    skipped.occurrences.some(row => row.seriesId === id && row.date === '2026-11-10'),
    false,
  );
  assert.equal(
    skipped.occurrences.some(row => row.seriesId === id && row.date === '2026-11-13'),
    false,
    'the skipped day still uses up the count',
  );

  await changeFlowSeries(
    owner,
    { action: 'move-one', seriesId: id, date: '2026-11-11', to: { date: '2026-11-20', time: { checkpoint: 'Dinner', at: '19:00' } } },
    true,
  );
  const left = await readSeriesWindow(owner, '2026-11-11', '2026-11-11', true);
  assert.equal(left.occurrences.some(row => row.seriesId === id), false);
  const arrived = await readSeriesWindow(owner, '2026-11-20', '2026-11-20', true);
  assert.equal(arrived.occurrences[0]?.seriesId, id);
  assert.equal(arrived.occurrences[0]?.moved, true);
  assert.equal(arrived.occurrences[0]?.original, '2026-11-11');

  const updated = await changeFlowSeries(
    owner,
    { action: 'update-series', id, recurrence: { kind: 'once' }, end: { kind: 'never' } },
    true,
  );
  assert.equal(updated.series.find(row => row.id === id)?.recurrence.kind, 'once');
  const once = await readSeriesWindow(owner, '2026-11-01', '2026-11-30', true);
  assert.deepEqual(
    once.occurrences.filter(row => row.seriesId === id).map(row => row.date),
    ['2026-11-09'],
  );

  const removed = await changeFlowSeries(owner, { action: 'delete-series', id }, true);
  assert.equal(removed.series.some(row => row.id === id), false);
  const after = await readSeriesWindow(owner, '2026-11-01', '2026-11-30', true);
  assert.equal(after.occurrences.some(row => row.seriesId === id), false);
});

test('a split day can be added to the routine before it has exercises', async () => {
  const owner = user(`series-split-${crypto.randomUUID()}`);
  const created = await changeFlowSeries(owner, { action: 'create', ...draft('flow', 'gym-splits-upper-a') }, true);
  const id = created.series[0]?.id;
  assert.equal(created.series[0]?.itemId, 'gym-splits-upper-a');
  assert.ok(id);
  await changeFlowSeries(owner, { action: 'delete-series', id }, true);
});

test("another member cannot change someone else's series", async () => {
  assert.ok(flowId);
  const owner = user(`series-owner-${crypto.randomUUID()}`);
  const other = user(`series-other-${crypto.randomUUID()}`);
  const created = await changeFlowSeries(owner, { action: 'create', ...draft('flow', flowId) }, true);
  const id = created.series[0]?.id;
  assert.ok(id);
  const attempts = [
    { action: 'update-series', id, time: { checkpoint: 'Dinner' } },
    { action: 'delete-series', id },
    { action: 'skip-one', seriesId: id, date: '2026-11-09' },
    { action: 'move-one', seriesId: id, date: '2026-11-09', to: { date: '2026-11-12' } },
    { action: 'restore-one', seriesId: id, date: '2026-11-09' },
  ];
  for (const attempt of attempts) {
    await assert.rejects(() => changeFlowSeries(other, attempt, true), (error: unknown) => {
      assert.ok(error instanceof FlowSeriesError);
      assert.equal(error.status, 404);
      return true;
    });
  }
  const still = await readSeriesWindow(owner, '2026-11-09', '2026-11-12', true);
  assert.equal(still.series.length, 1);
  assert.equal(still.occurrences.filter(row => row.seriesId === id).length, 4);
});

test('unknown items and an overlong range are refused', async () => {
  assert.ok(flowId);
  const owner = user(`series-owner-${crypto.randomUUID()}`);
  await assert.rejects(() => changeFlowSeries(owner, { action: 'create', ...draft('flow', 'missing-flow') }, true), /Unknown flow/);
  await assert.rejects(() => changeFlowSeries(owner, { action: 'create', ...draft('session', 'missing-session') }, true), /Unknown session/);
  await assert.rejects(() => readSeriesWindow(owner, '2026-11-01', addCalendarDays('2026-11-01', 62), true), /62 days/);
  await assert.rejects(() => readSeriesWindow(owner, '2026-11-10', '2026-11-01', true), /dates/);
  const edge = await readSeriesWindow(owner, '2026-11-01', addCalendarDays('2026-11-01', 61), true);
  assert.deepEqual(edge.occurrences, []);
});

function rememberRun(run: { userId: string; status: string; updatedAt: string; flowId: string; state?: unknown }) {
  const bag = (globalThis.qramFlowRuns ??= { metrics: [], runs: [] }) as {
    runs: { userId: string; status: string; updatedAt: string; flowId: string; state?: unknown }[];
  };
  bag.runs.push(run);
}

function blockValues(typeId: string) {
  if (typeId === 'type-strength') return { weight: 40, reps: 8 };
  if (typeId === 'type-bodyweight-reps') return { reps: 10 };
  if (typeId === 'type-holds') return { seconds: 30 };
  if (typeId === 'type-intervals') return { seconds: 240, metres: 800 };
  if (typeId === 'type-steady') return { seconds: 1800, metres: 3000 };
  return { done: true };
}

async function logDone(person: PublicUser, id: string, planDate: string) {
  const session = trainingCatalog().sessions.find(row => row.id === id);
  assert.ok(session);
  const values = blockValues(session.typeId);
  const blocks = session.blocks.map(block => ({
    id: block.id,
    sets: Array.from({ length: block.sets }, (_, index) => ({ index: index + 1, values })),
  }));
  const result = await trainingPost(person, { action: 'log', sessionId: id, planDate, blocks }, { demo: true });
  assert.equal(result.status, 200);
}

test("another member's finished run does not complete this member's routine", async () => {
  assert.ok(flowId);
  const owner = user(`series-done-${crypto.randomUUID()}`);
  const other = user(`series-other-${crypto.randomUUID()}`);
  const created = await changeFlowSeries(owner, { action: 'create', ...draft('flow', flowId, '2026-11-09') }, true);
  const seriesId = created.series.find(row => row.itemId === flowId)?.id;
  assert.ok(seriesId);
  rememberRun({
    userId: other.id,
    status: 'finished',
    updatedAt: '2026-11-09T12:00:00.000Z',
    flowId,
    state: { cards: [{ sourceFlowId: flowId }] },
  });
  rememberRun({
    userId: owner.id,
    status: 'finished',
    updatedAt: '2026-11-10T12:00:00.000Z',
    flowId: 'personal-copy',
    state: { cards: [{ sourceFlowId: flowId }, { sourceFlowId: flowId }] },
  });
  rememberRun({
    userId: owner.id,
    status: 'abandoned',
    updatedAt: '2026-11-11T12:00:00.000Z',
    flowId,
  });
  const window = await readSeriesWindow(owner, '2026-11-09', '2026-11-12', true);
  const rows = window.occurrences.filter(row => row.seriesId === seriesId);
  assert.equal(rows.find(row => row.date === '2026-11-09')?.status, 'open');
  assert.equal(rows.find(row => row.date === '2026-11-10')?.status, 'done');
  assert.equal(rows.find(row => row.date === '2026-11-11')?.status, 'open');

  rememberRun({
    userId: owner.id,
    status: 'posted',
    updatedAt: '2026-11-12T12:00:00.000Z',
    flowId,
  });
  await changeFlowSeries(owner, { action: 'move-one', seriesId, date: '2026-11-12', to: { date: '2026-11-20' } }, true);
  const movedAway = await readSeriesWindow(owner, '2026-11-20', '2026-11-20', true);
  assert.equal(movedAway.occurrences.find(row => row.seriesId === seriesId)?.status, 'open');
  rememberRun({
    userId: owner.id,
    status: 'finished',
    updatedAt: '2026-11-20T12:00:00.000Z',
    flowId,
  });
  const moved = await readSeriesWindow(owner, '2026-11-20', '2026-11-20', true);
  assert.equal(moved.occurrences.find(row => row.seriesId === seriesId)?.date, '2026-11-20');
  assert.equal(moved.occurrences.find(row => row.seriesId === seriesId)?.status, 'done');
});

test("another member's training log does not finish this member's session", async () => {
  assert.ok(sessionId);
  const owner = user(`series-log-${crypto.randomUUID()}`);
  const other = user(`series-log-other-${crypto.randomUUID()}`);
  const created = await changeFlowSeries(owner, { action: 'create', ...draft('session', sessionId, '2026-11-09') }, true);
  const seriesId = created.series.find(row => row.itemKind === 'session')?.id;
  assert.ok(seriesId);
  await logDone(other, sessionId, '2026-11-09');
  await logDone(owner, sessionId, '2026-11-10');
  const early = await readSeriesWindow(owner, '2026-11-09', '2026-11-10', true);
  assert.equal(early.occurrences.find(row => row.seriesId === seriesId && row.date === '2026-11-09')?.status, 'open');
  assert.equal(early.occurrences.find(row => row.seriesId === seriesId && row.date === '2026-11-10')?.status, 'done');
  await logDone(owner, sessionId, '2026-11-09');
  const done = await readSeriesWindow(owner, '2026-11-09', '2026-11-09', true);
  assert.equal(done.occurrences.find(row => row.seriesId === seriesId)?.status, 'done');
});

type DemoCommunity = {
  flows: Map<string, { id: string; authorId: string; title: string; cards: { cardId: string; sourceFlowId: string; title: string }[]; version: number }>;
  versions: Map<string, { version: number; title: string; cards: { cardId: string; sourceFlowId: string; title: string }[] }[]>;
};

test('a community series runs the saved version, and a finish counts as that flow', async () => {
  assert.ok(flowId);
  const bag = globalThis as {
    qramDemoCommunity?: DemoCommunity;
    qramDemoHiddenAuthors?: Set<string>;
    rugramDemoStore?: { users: { id: string; disabled?: boolean }[] };
  };
  const previous = bag.qramDemoCommunity;
  const hiddenBefore = bag.qramDemoHiddenAuthors;
  const authorId = `author-${crypto.randomUUID()}`;
  const id = `community-${crypto.randomUUID()}`;
  const cards = [{ cardId: 'card-1', sourceFlowId: flowId, title: 'Pull' }];
  const stored = { id, authorId, title: 'Morning pull', cards, version: 1 };
  const community: DemoCommunity = {
    flows: new Map([[id, stored]]),
    versions: new Map([[id, [{ version: 1, title: stored.title, cards }]]]),
  };
  if (bag.rugramDemoStore) bag.rugramDemoStore.users.push({ id: authorId });
  bag.qramDemoCommunity = community;
  const owner = user(`series-community-${crypto.randomUUID()}`);
  const other = user(`series-community-other-${crypto.randomUUID()}`);
  try {
    await assert.rejects(
      () => changeFlowSeries(owner, { action: 'create', ...draft('flow', id), itemKind: 'community' }, true),
      /Check the series/,
    );
    await assert.rejects(
      () =>
        changeFlowSeries(
          owner,
          { action: 'create', ...draft('flow', `community-${crypto.randomUUID()}`), itemKind: 'community', version: 1 },
          true,
        ),
      /Unknown flow/,
    );
    bag.qramDemoHiddenAuthors = new Set([authorId]);
    await assert.rejects(
      () => changeFlowSeries(owner, { action: 'create', ...draft('flow', id), itemKind: 'community', version: 1 }, true),
      /Unknown flow/,
    );
    bag.qramDemoHiddenAuthors = hiddenBefore;

    const created = await changeFlowSeries(
      owner,
      { action: 'create', ...draft('flow', id, '2026-11-09'), itemKind: 'community', version: 1 },
      true,
    );
    const seriesId = created.series.find(row => row.itemId === id)?.id;
    assert.ok(seriesId);
    assert.equal(created.series.find(row => row.id === seriesId)?.version, 1);
    const source = await changeFlowSeries(owner, { action: 'create', ...draft('flow', flowId, '2026-11-09') }, true);
    const sourceId = source.series.find(row => row.itemId === flowId)?.id;
    assert.ok(sourceId);

    stored.version = 2;
    stored.title = 'Morning pull, revised';
    const pinned = await readSeriesWindow(owner, '2026-11-09', '2026-11-09', true);
    assert.equal(pinned.series.find(row => row.id === seriesId)?.version, 1);
    assert.equal(pinned.occurrences.find(row => row.seriesId === seriesId)?.version, 1);

    const adopted = await changeFlowSeries(owner, { action: 'update-series', id: seriesId, version: 2 }, true);
    assert.equal(adopted.series.find(row => row.id === seriesId)?.version, 2);

    await changeFlowSeries(owner, { action: 'update-series', id: seriesId, version: 1 }, true);
    rememberRun({
      userId: other.id,
      status: 'finished',
      updatedAt: '2026-11-09T12:00:00.000Z',
      flowId: id,
      state: { cards: [{ sourceFlowId: flowId }] },
    });
    const theirs = await readSeriesWindow(owner, '2026-11-09', '2026-11-09', true);
    assert.equal(theirs.occurrences.find(row => row.seriesId === seriesId)?.status, 'open');
    rememberRun({
      userId: owner.id,
      status: 'finished',
      updatedAt: '2026-11-09T18:00:00.000Z',
      flowId: id,
      state: { cards: [{ sourceFlowId: flowId }, { sourceFlowId: flowId }] },
    });
    const done = await readSeriesWindow(owner, '2026-11-09', '2026-11-09', true);
    assert.equal(done.occurrences.find(row => row.seriesId === seriesId)?.status, 'done');
    assert.equal(done.occurrences.find(row => row.seriesId === sourceId)?.status, 'open');
  } finally {
    bag.qramDemoCommunity = previous;
    bag.qramDemoHiddenAuthors = hiddenBefore;
    if (bag.rugramDemoStore) bag.rugramDemoStore.users = bag.rugramDemoStore.users.filter(person => person.id !== authorId);
  }
});
