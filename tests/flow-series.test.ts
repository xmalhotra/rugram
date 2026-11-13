import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeRecurrence,
  flowSeriesSchema,
  formatSeriesClock,
  occurrences,
  type FlowSeries,
  type SeriesException,
} from '../shared/flow-series';

function series(patch: Partial<FlowSeries> & Pick<FlowSeries, 'id' | 'start' | 'recurrence'>): FlowSeries {
  return {
    itemKind: 'flow',
    itemId: 'flow',
    time: { checkpoint: 'Morning' },
    end: { kind: 'never' },
    createdAt: '2026-11-01T00:00:00.000Z',
    ...patch,
  };
}

const wide = ['2026-01-01', '2026-12-31'] as const;

test('once lands on its start date and nowhere else', () => {
  const item = series({ id: '00000000-0000-4000-8000-000000000001', start: '2026-11-10', recurrence: { kind: 'once' } });
  const hit = occurrences([item], [], '2026-11-01', '2026-11-30');
  assert.deepEqual(hit.map(row => row.date), ['2026-11-10']);
  assert.equal(hit[0]?.original, '2026-11-10');
  assert.equal(hit[0]?.moved, false);
  assert.deepEqual(occurrences([item], [], '2026-11-11', '2026-11-12'), []);
});

test('daily every 2 steps across the range', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000002',
    start: '2026-11-09',
    recurrence: { kind: 'daily', every: 2 },
  });
  assert.deepEqual(
    occurrences([item], [], '2026-11-09', '2026-11-15').map(row => row.date),
    ['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-15'],
  );
});

test('weekdays skip the weekend', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000003',
    start: '2026-11-06',
    recurrence: { kind: 'weekdays' },
  });
  assert.deepEqual(
    occurrences([item], [], '2026-11-06', '2026-11-09').map(row => row.date),
    ['2026-11-06', '2026-11-09'],
  );
});

test('weekly on three days, every two weeks, keeps the start week', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000004',
    start: '2026-11-02',
    recurrence: { kind: 'weekly', every: 2, days: [5, 1, 3] },
  });
  assert.deepEqual(
    occurrences([item], [], '2026-11-02', '2026-11-22').map(row => row.date),
    ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-16', '2026-11-18', '2026-11-20'],
  );
});

test('monthly on the 31st skips months that lack that date', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000005',
    start: '2026-01-31',
    recurrence: { kind: 'monthly', every: 1, by: 'date' },
  });
  assert.deepEqual(
    occurrences([item], [], ...wide).map(row => row.date),
    ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31', '2026-08-31', '2026-10-31', '2026-12-31'],
  );
});

test('an end date keeps that day and drops the next', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000006',
    start: '2026-11-01',
    recurrence: { kind: 'daily', every: 1 },
    end: { kind: 'on', date: '2026-11-03' },
  });
  assert.deepEqual(
    occurrences([item], [], '2026-11-01', '2026-11-10').map(row => row.date),
    ['2026-11-01', '2026-11-02', '2026-11-03'],
  );
});

test('a count includes a skipped occurrence and does not grow a replacement', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000007',
    start: '2026-11-09',
    recurrence: { kind: 'daily', every: 1 },
    end: { kind: 'after', count: 3 },
  });
  const exceptions: SeriesException[] = [{ seriesId: item.id, date: '2026-11-10', change: 'skip' }];
  assert.deepEqual(
    occurrences([item], exceptions, '2026-11-01', '2026-11-30').map(row => row.date),
    ['2026-11-09', '2026-11-11'],
  );
});

test('a moved occurrence leaves one range and arrives in another', () => {
  const item = series({
    id: '00000000-0000-4000-8000-000000000008',
    start: '2026-11-09',
    recurrence: { kind: 'once' },
    time: { checkpoint: 'Pre-workout', at: '07:30' },
  });
  const exceptions: SeriesException[] = [
    { seriesId: item.id, date: '2026-11-09', change: { date: '2026-11-20', time: { checkpoint: 'Dinner', at: '19:00' } } },
  ];
  assert.deepEqual(occurrences([item], exceptions, '2026-11-09', '2026-11-11'), []);
  const arrived = occurrences([item], exceptions, '2026-11-20', '2026-11-21');
  assert.equal(arrived.length, 1);
  assert.equal(arrived[0]?.date, '2026-11-20');
  assert.equal(arrived[0]?.original, '2026-11-09');
  assert.equal(arrived[0]?.moved, true);
  assert.deepEqual(arrived[0]?.time, { checkpoint: 'Dinner', at: '19:00' });
});

test('occurrences sort by date, then checkpoint, then clock time', () => {
  const morning = series({
    id: '00000000-0000-4000-8000-0000000000b1',
    start: '2026-11-10',
    recurrence: { kind: 'once' },
    time: { checkpoint: 'Wake up', at: '09:00' },
  });
  const early = series({
    id: '00000000-0000-4000-8000-0000000000b2',
    start: '2026-11-10',
    recurrence: { kind: 'once' },
    time: { checkpoint: 'Wake up', at: '07:00' },
  });
  const open = series({
    id: '00000000-0000-4000-8000-0000000000b3',
    start: '2026-11-10',
    recurrence: { kind: 'once' },
    time: { checkpoint: 'Wake up' },
  });
  const bed = series({
    id: '00000000-0000-4000-8000-0000000000b4',
    start: '2026-11-09',
    recurrence: { kind: 'once' },
    time: { checkpoint: 'Before bed' },
  });
  const pre = series({
    id: '00000000-0000-4000-8000-0000000000b5',
    start: '2026-11-10',
    recurrence: { kind: 'once' },
    time: { checkpoint: 'Pre-workout', at: '18:00' },
  });
  assert.deepEqual(
    occurrences([morning, bed, pre, early, open], [], '2026-11-09', '2026-11-10').map(row => row.seriesId),
    [bed.id, open.id, early.id, morning.id, pre.id],
  );
});

test('describeRecurrence speaks every form Teams would', () => {
  const base = { itemKind: 'flow' as const, itemId: 'flow', time: { checkpoint: 'Morning' as const }, createdAt: '2026-11-01T00:00:00.000Z' };
  assert.equal(
    describeRecurrence({ ...base, id: '00000000-0000-4000-8000-000000000011', start: '2026-11-09', recurrence: { kind: 'once' }, end: { kind: 'never' } }),
    'Once on Mon 9 Nov',
  );
  assert.equal(
    describeRecurrence({ ...base, id: '00000000-0000-4000-8000-000000000012', start: '2026-11-09', recurrence: { kind: 'daily', every: 1 }, end: { kind: 'never' } }),
    'Every day',
  );
  assert.equal(
    describeRecurrence({ ...base, id: '00000000-0000-4000-8000-000000000013', start: '2026-11-09', recurrence: { kind: 'daily', every: 2 }, end: { kind: 'never' } }),
    'Every 2 days',
  );
  assert.equal(
    describeRecurrence({ ...base, id: '00000000-0000-4000-8000-000000000014', start: '2026-11-09', recurrence: { kind: 'weekdays' }, end: { kind: 'never' } }),
    'Every weekday',
  );
  assert.equal(
    describeRecurrence({
      ...base,
      id: '00000000-0000-4000-8000-000000000015',
      start: '2026-11-09',
      recurrence: { kind: 'weekly', every: 1, days: [5, 1, 3] },
      end: { kind: 'never' },
    }),
    'Every week on Mon, Wed, Fri',
  );
  assert.equal(
    describeRecurrence({
      ...base,
      id: '00000000-0000-4000-8000-000000000016',
      start: '2026-11-10',
      recurrence: { kind: 'weekly', every: 2, days: [2] },
      end: { kind: 'never' },
    }),
    'Every 2 weeks on Tue',
  );
  assert.equal(
    describeRecurrence({
      ...base,
      id: '00000000-0000-4000-8000-000000000017',
      start: '2026-11-10',
      recurrence: { kind: 'monthly', every: 1, by: 'date' },
      end: { kind: 'never' },
    }),
    'Every month on day 10',
  );
  assert.equal(
    describeRecurrence({
      ...base,
      id: '00000000-0000-4000-8000-000000000018',
      start: '2026-11-09',
      recurrence: { kind: 'daily', every: 1 },
      end: { kind: 'on', date: '2026-12-31' },
    }),
    'Every day until 31 Dec',
  );
  assert.equal(
    describeRecurrence({
      ...base,
      id: '00000000-0000-4000-8000-000000000019',
      start: '2026-11-09',
      recurrence: { kind: 'daily', every: 1 },
      end: { kind: 'after', count: 12 },
    }),
    'Every day, 12 times',
  );
  assert.equal(flowSeriesSchema.safeParse({ ...base, id: 'not-a-uuid', start: '2026-11-09', recurrence: { kind: 'once' }, end: { kind: 'never' } }).success, false);
  assert.equal(
    flowSeriesSchema.safeParse({
      ...base,
      id: '00000000-0000-4000-8000-000000000020',
      start: '2026-02-31',
      recurrence: { kind: 'once' },
      end: { kind: 'never' },
    }).success,
    false,
  );
});

test('a completion is done on that date, and a move is done on the new date', () => {
  const item = series({
    id: '00000000-0000-4000-8000-0000000000c1',
    start: '2026-11-09',
    recurrence: { kind: 'daily', every: 1 },
    end: { kind: 'after', count: 2 },
  });
  assert.deepEqual(
    occurrences([item], [], '2026-11-09', '2026-11-10').map(row => row.status),
    ['open', 'open'],
  );
  const marked = occurrences([item], [], '2026-11-09', '2026-11-10', [
    { itemKind: 'flow', itemId: item.itemId, date: '2026-11-09' },
    { itemKind: 'session', itemId: item.itemId, date: '2026-11-10' },
  ]);
  assert.equal(marked.find(row => row.date === '2026-11-09')?.status, 'done');
  assert.equal(marked.find(row => row.date === '2026-11-10')?.status, 'open', 'another date, and another kind, stay open');
  const exceptions: SeriesException[] = [{ seriesId: item.id, date: '2026-11-09', change: { date: '2026-11-20' } }];
  const movedOpen = occurrences([item], exceptions, '2026-11-01', '2026-11-30', [
    { itemKind: 'flow', itemId: item.itemId, date: '2026-11-09' },
  ]);
  assert.equal(movedOpen.find(row => row.date === '2026-11-20')?.status, 'open');
  assert.equal(movedOpen.some(row => row.date === '2026-11-09'), false);
  const movedDone = occurrences([item], exceptions, '2026-11-20', '2026-11-20', [
    { itemKind: 'flow', itemId: item.itemId, date: '2026-11-20' },
  ]);
  assert.equal(movedDone[0]?.date, '2026-11-20');
  assert.equal(movedDone[0]?.original, '2026-11-09');
  assert.equal(movedDone[0]?.status, 'done');
});

test('a community series keeps its version, and a finish of that flow marks the day', () => {
  const bare = {
    id: '00000000-0000-4000-8000-0000000000c1',
    itemId: 'community-flow',
    start: '2026-11-09',
    time: { checkpoint: 'Morning' as const },
    recurrence: { kind: 'once' as const },
    end: { kind: 'never' as const },
    createdAt: '2026-11-01T00:00:00.000Z',
  };
  assert.equal(flowSeriesSchema.safeParse({ ...bare, itemKind: 'community' }).success, false);
  assert.equal(flowSeriesSchema.safeParse({ ...bare, itemKind: 'flow', version: 1 }).success, false);
  assert.equal(flowSeriesSchema.safeParse({ ...bare, itemKind: 'community', version: 2 }).success, true);
  const item = series({
    id: bare.id,
    itemKind: 'community',
    itemId: bare.itemId,
    version: 2,
    start: bare.start,
    recurrence: { kind: 'once' },
  });
  const open = occurrences([item], [], '2026-11-09', '2026-11-09');
  assert.equal(open[0]?.version, 2);
  assert.equal(open[0]?.status, 'open');
  const done = occurrences([item], [], '2026-11-09', '2026-11-09', [
    { itemKind: 'community', itemId: bare.itemId, date: '2026-11-09' },
  ]);
  assert.equal(done[0]?.status, 'done');
});

test('a clock time reads as a 12-hour time, and anything else is left alone', () => {
  assert.equal(formatSeriesClock('06:30'), '6:30 AM');
  assert.equal(formatSeriesClock('00:05'), '12:05 AM');
  assert.equal(formatSeriesClock('12:00'), '12:00 PM');
  assert.equal(formatSeriesClock('18:45'), '6:45 PM');
  assert.equal(formatSeriesClock('23:59'), '11:59 PM');
  assert.equal(formatSeriesClock('oops'), 'oops');
});
