import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyRegions } from '../shared/body-flow';
import { writtenDailyFlow, purposes } from '../shared/purposes';
import { mapFlowSchema, areasPlannedByNow, copyMapFlow, dailyFlowOn, followedMapFlow, freeSlot, plannedByNow, planFromMapFlow, regimeAhead, slotProblem, styleProblems, type MapFlow, type MapFlowDay, type MapFlowProgress } from '../shared/map-flow';
import { mapFlowStyles } from '../shared/map-flow-styles';
import { mapFlowTemplates, readyMapFlowPurposeIds } from '../shared/map-flow-templates';
import { predictBodyFlow } from '../shared/predicted-body-flow';
import type { MuscleArea } from '../shared/muscle-map';

const none: MapFlowProgress = { doneDates: [], letGo: [] };

function day(name: string, id: string, effort: MapFlowDay['effort'] = 'upper'): MapFlowDay {
  return { name, effort, flows: [{ kind: 'flow', id }], items: [] };
}

const rest: MapFlowDay = { name: 'Rest', effort: 'rest', flows: [], items: [] };

function pattern(repeat: MapFlow['repeat'], days: MapFlowDay[], styleId = 'member'): MapFlow {
  return mapFlowSchema.parse({
    id: crypto.randomUUID(),
    slot: 1,
    name: 'Test',
    styleId,
    purposeIds: [],
    repeat,
    sourceKind: 'backfill',
    days,
    released: [],
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  });
}

test('an in-turn pattern of three days shifts when a day is missed and loops after it is done', () => {
  const flow = pattern('in-turn', [day('Push', 'push'), day('Pull', 'pull'), day('Legs', 'legs')]);
  assert.equal(dailyFlowOn(flow, '2026-11-09', none, '2026-11-09')?.flows[0].id, 'push');
  assert.equal(dailyFlowOn(flow, '2026-11-09', none, '2026-11-10')?.flows[0].id, 'push');
  assert.equal(dailyFlowOn(flow, '2026-11-09', none, '2026-11-08'), null);
  const didMonday = dailyFlowOn(flow, '2026-11-09', { doneDates: ['2026-11-09'], letGo: [] }, '2026-11-10');
  assert.equal(didMonday?.flows[0].id, 'pull');
  const finished = dailyFlowOn(flow, '2026-11-09', { doneDates: ['2026-11-09', '2026-11-10', '2026-11-11'], letGo: [] }, '2026-11-12');
  assert.equal(finished?.flows[0].id, 'push');
  const planned = plannedByNow(flow, '2026-11-09', none, '2026-11-11').map(row => row.placement.flows[0].id);
  assert.deepEqual(planned, ['push', 'push', 'push']);
  const moved = plannedByNow(flow, '2026-11-09', { doneDates: ['2026-11-09'], letGo: [] }, '2026-11-10').map(row => row.placement.flows[0].id);
  assert.deepEqual(moved, ['push', 'pull']);
});

test('a weekday pattern keeps its day, and a miss comes back on the next rest day unless it is let go', () => {
  const flow = pattern('weekdays', [day('Monday', 'mon'), day('Tuesday', 'tue'), day('Wednesday', 'wed'), rest, day('Friday', 'fri'), rest, rest]);
  assert.equal(dailyFlowOn(flow, '2026-11-09', none, '2026-11-09')?.flows[0].id, 'mon');
  assert.equal(dailyFlowOn(flow, '2026-11-09', none, '2026-11-10')?.flows[0].id, 'tue');
  const offered = dailyFlowOn(flow, '2026-11-09', none, '2026-11-12');
  assert.equal(offered?.makeup, true);
  assert.equal(offered?.flows[0].id, 'mon');
  const releasedMonday = dailyFlowOn(flow, '2026-11-09', { doneDates: [], letGo: [{ index: 0, on: '2026-11-09' }] }, '2026-11-12');
  assert.equal(releasedMonday?.flows[0].id, 'tue');
  assert.equal(releasedMonday?.makeup, true);
  const released = dailyFlowOn(flow, '2026-11-09', {
    doneDates: [],
    letGo: [
      { index: 0, on: '2026-11-09' },
      { index: 1, on: '2026-11-10' },
      { index: 2, on: '2026-11-11' },
    ],
  }, '2026-11-12');
  assert.equal(released?.effort, 'rest');
  assert.equal(released?.makeup, false);
  const done = dailyFlowOn(flow, '2026-11-09', { doneDates: ['2026-11-09'], letGo: [] }, '2026-11-12');
  assert.equal(done?.flows[0].id, 'tue');
  assert.equal(done?.makeup, true);
});

test('the followed Map flow is the latest one on or before the date, otherwise slot 1', () => {
  const base = { id: 'base', slot: 1, createdAt: '2026-11-01T00:00:00.000Z' };
  const other = { id: 'other', slot: 2, createdAt: '2026-11-01T00:00:00.000Z' };
  assert.equal(followedMapFlow([base, other], [], '2026-11-09')?.flow.id, 'base');
  assert.equal(followedMapFlow([base, other], [], '2026-11-09')?.from, '2026-11-01');
  const follows = [{ mapFlowId: 'other', from: '2026-11-12' }];
  assert.equal(followedMapFlow([base, other], follows, '2026-11-11')?.flow.id, 'base');
  assert.equal(followedMapFlow([base, other], follows, '2026-11-12')?.flow.id, 'other');
  assert.equal(followedMapFlow([other], [], '2026-11-12'), null);
});

test('slot 1 cannot be cleared while it is the only Map flow, and a sixth slot is refused', () => {
  assert.equal(slotProblem([{ slot: 1 }], 1, 'clear'), 'Base stays while it is the only Map flow.');
  assert.equal(slotProblem([{ slot: 1 }, { slot: 2 }], 2, 'clear'), null);
  assert.equal(slotProblem([{ slot: 1 }, { slot: 2 }], 1, 'clear'), null);
  const full = [1, 2, 3, 4, 5].map(slot => ({ slot }));
  assert.equal(freeSlot(full), null);
  assert.equal(slotProblem(full, 1, 'use'), 'That slot is in use.');
  assert.equal(slotProblem([{ slot: 1 }], 2, 'use'), null);
});

test('a copy keeps the pattern and style and drops weights, logs and ticks', () => {
  const copied = copyMapFlow(
    {
      id: 'source',
      name: 'Upper and lower',
      styleId: 'body-part',
      purposeIds: ['gain-muscle'],
      repeat: 'in-turn',
      weightKg: 80,
      logs: [{ reps: 5 }],
      ticks: { '2026-11-09': 1 },
      days: [
        {
          name: 'Upper day',
          effort: 'upper',
          flows: [{ kind: 'flow', id: 'gym-splits-size-upper', weightKg: 40, logs: [{ reps: 8 }] }],
          items: [{ itemId: 'creatine', name: 'Creatine', checkpoint: 'Morning', timesPerDay: 1, ticks: { '2026-11-09': 1 }, weightKg: 5, logs: [] }],
        },
        rest,
      ],
    },
    3,
    '2026-11-09',
  );
  assert.equal(copied.mapFlow.slot, 3);
  assert.equal(copied.mapFlow.styleId, 'body-part');
  assert.equal(copied.mapFlow.repeat, 'in-turn');
  assert.equal(copied.mapFlow.sourceKind, 'copy');
  assert.equal(copied.mapFlow.sourceId, 'source');
  assert.deepEqual(
    copied.mapFlow.days.map(day => day.flows.map(flow => flow.id)),
    [['gym-splits-size-upper'], []],
  );
  assert.equal(copied.series[0]?.itemId, 'gym-splits-size-upper');
  assert.equal(copied.series[0]?.mapFlowId, copied.mapFlow.id);
  assert.equal(copied.items[0]?.itemId, 'creatine');
  const text = JSON.stringify(copied);
  assert.equal(text.includes('weightKg'), false);
  assert.equal(text.includes('ticks'), false);
  assert.equal(text.includes('"logs"'), false);
  assert.notEqual(copied.mapFlow.id, 'source');
});

const covered: Record<string, MuscleArea[] | 'any'> = {
  Chest: ['chest', 'upper-chest'],
  Back: ['lats', 'mid-back', 'lower-back', 'traps'],
  Shoulders: ['front-delts', 'side-delts', 'rear-delts'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  Core: ['upper-abs', 'lower-abs', 'obliques'],
  Hips: ['glutes', 'hip-flexors'],
  'Full body': 'any',
};

test('every ready Map flow matches its style, and its predicted figure covers its purpose', () => {
  assert.ok(mapFlowStyles.filter(style => style.rules.length > 0).length >= 4);
  const lengths = new Set(mapFlowTemplates.map(template => template.days.length));
  assert.equal(lengths.has(3), true);
  assert.equal(lengths.has(5), true);
  assert.equal(lengths.has(7), true);
  assert.ok(new Set(mapFlowTemplates.map(template => template.styleId)).size >= 4);
  for (const template of mapFlowTemplates) {
    assert.deepEqual(styleProblems(template.styleId, template.days), [], template.id);
    const picture = predictBodyFlow(planFromMapFlow(template), { level: template.level });
    const worked = new Set(picture.filter(row => row.state === 'worked').map(row => row.area));
    for (const purposeId of template.purposeIds) {
      const purpose = purposes.find(item => item.id === purposeId);
      assert.ok(purpose);
      for (const area of purpose.areas) {
        const muscles = covered[area];
        if (!muscles) continue;
        if (muscles === 'any') assert.ok(worked.size > 0, `${template.id} covers ${area}`);
        else assert.ok(muscles.some(id => worked.has(id)), `${template.id} covers ${area}`);
      }
    }
  }
  for (const purpose of purposes) {
    const templates = mapFlowTemplates.filter(template => template.purposeIds.includes(purpose.id));
    for (const level of ['Beginner', 'Intermediate', 'Advanced'] as const) {
      assert.ok(templates.some(template => template.level === level), `${purpose.id} ${level}`);
    }
    for (const written of writtenDailyFlow(purpose.id)) {
      for (const flowId of written.flowIds) {
        assert.ok(
          templates.some(template => template.days.some(day => day.flows.some(flow => flow.id === flowId))),
          `${purpose.id} ${flowId}`,
        );
      }
    }
  }
  assert.deepEqual(readyMapFlowPurposeIds().sort(), purposes.map(purpose => purpose.id).sort());
  const adjacent = styleProblems('hybrid', [
    day('Lower', 'gym-splits-power-lower', 'heavy-lower'),
    day('Run', 'running', 'hard-run'),
    rest,
  ]);
  assert.ok(adjacent.some(line => line.includes('next to a hard run')));
  assert.ok(bodyRegions.length >= 6);
});

test('missed areas are what the followed Map flow planned before today and did not do', () => {
  const flow = pattern('in-turn', [
    {
      name: 'Legs',
      effort: 'lower',
      flows: [{ kind: 'flow', id: 'not-a-gym-flow', items: [{ exerciseId: 'barbell-back-squat', sets: 3 }] }],
      items: [],
    },
  ]);
  assert.deepEqual(areasPlannedByNow(flow, '2026-11-09', none, '2026-11-09'), []);
  assert.equal(areasPlannedByNow(flow, '2026-11-09', none, '2026-11-11').includes('quads'), true);
  const done = areasPlannedByNow(flow, '2026-11-09', { doneDates: ['2026-11-09', '2026-11-10'], letGo: [] }, '2026-11-11');
  assert.equal(done.includes('quads'), false);
  const inRange = areasPlannedByNow(flow, '2026-11-01', none, '2026-11-11', { from: '2026-11-09', to: '2026-11-10' });
  assert.equal(inRange.includes('quads'), true);
  assert.deepEqual(areasPlannedByNow(flow, '2026-11-01', none, '2026-11-11', { from: '2026-11-11', to: '2026-11-11' }), []);
  const released = areasPlannedByNow(
    flow,
    '2026-11-09',
    { doneDates: [], letGo: [{ index: 0, on: '2026-11-09' }] },
    '2026-11-10',
  );
  assert.equal(released.includes('quads'), false);
});

test('regimeAhead shows the next days as if each one is done', () => {
  const flow = pattern('in-turn', [day('Push', 'press'), rest, day('Pull', 'row')]);
  assert.deepEqual(
    regimeAhead(flow, '2026-11-09', 4).map(row => row.name),
    ['Push', 'Rest', 'Pull', 'Push'],
  );
});
