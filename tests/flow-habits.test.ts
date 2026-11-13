import assert from 'node:assert/strict';
import test from 'node:test';
import type { HabitFlow } from '../shared/mobile';
import { flows } from '../shared/mobile';
import type { FlowCategoryGroup } from '../shared/flow-categories';
import {
  addToRoutine,
  appendUse,
  completed,
  doneToday,
  autoRest,
  branchSummary,
  createRoutine,
  dayBranches,
  deleteRoutine,
  emptyFlowHabits,
  flowStage,
  flowWeight,
  gapSuggestions,
  isStale,
  localDate,
  mergeFlowHabits,
  onStreak,
  openedLabel,
  parseFlowHabits,
  removeFromRoutine,
  renameRoutine,
  routineOf,
  seedStages,
  setFlowStage,
  stageCounts,
  todayGroups,
  usesInDays,
} from '../shared/flow-habits';

const now = Date.parse('2026-11-02T12:00:00.000Z');
const flow = (id: string, pathId = 'alpha'): HabitFlow => ({
  ...flows[0],
  id,
  pathId,
  title: id,
});
const groups: FlowCategoryGroup[] = [
  { id: 'fitness', title: 'Fitness', illustration: 'workout', focusIds: ['alpha'] },
  { id: 'lifestyle', title: 'Lifestyle', illustration: 'sleep', focusIds: ['beta'] },
  { id: 'tech', title: 'Tech', illustration: 'coding', focusIds: ['gamma'] },
];
const focuses = [
  { id: 'alpha', flowIds: ['fit-a', 'fit-b'] },
  { id: 'beta', flowIds: ['life-a'] },
  { id: 'gamma', flowIds: ['tech-a', 'tech-b'] },
];

test('branchSummary counts each branch in order', () => {
  assert.equal(
    branchSummary([
      { title: 'Fitness', count: 3 },
      { title: 'Tech', count: 1 },
      { title: 'Lifestyle', count: 1 },
    ]),
    '3 Fitness · 1 Tech · 1 Lifestyle',
  );
  assert.equal(branchSummary([{ title: 'Fitness', count: 0 }]), '');
});

test('dayBranches keeps the day order and parks flows without a slot', () => {
  assert.deepEqual(
    dayBranches(
      [{ id: 'night' }, { id: 'open' }, { id: 'morning' }, { id: 'evening' }],
      { morning: 'morning', evening: 'evening', night: 'night' },
    ).map(branch => [branch.title, branch.flowIds]),
    [
      ['Morning', ['morning']],
      ['Evening', ['evening']],
      ['Night', ['night']],
      ['Unscheduled', ['open']],
    ],
  );
  assert.deepEqual(dayBranches([{ id: 'only' }], {}), [
    { id: 'unscheduled', title: 'Unscheduled', flowIds: ['only'] },
  ]);
});

test('openedLabel distinguishes today, elapsed days, and flows never opened', () => {
  assert.equal(openedLabel(undefined, now), '· not opened yet');
  assert.equal(openedLabel('not-a-date', now), '· not opened yet');
  assert.equal(openedLabel('2026-11-02T01:00:00.000Z', now), '· today');
  assert.equal(openedLabel('2026-10-30T12:00:00.000Z', now), '· 3d ago');
  assert.equal(openedLabel('2026-10-19T12:00:00.000Z', now), '· 14d ago');
});

test('gapSuggestions offers the first missing flow from up to two empty categories', () => {
  const catalogue = [flow('fit-a'), flow('fit-b'), flow('life-a'), flow('tech-a'), flow('tech-b')];
  assert.deepEqual(
    gapSuggestions(groups, [flow('fit-a')], catalogue, focuses).map(item => [
      item.title,
      item.flow.id,
    ]),
    [
      ['Lifestyle', 'life-a'],
      ['Tech', 'tech-a'],
    ],
  );
  assert.equal(gapSuggestions(groups, [], catalogue, focuses).length, 2);
  assert.deepEqual(
    gapSuggestions(groups, [], [flow('tech-b')], focuses).map(item => item.flow.id),
    ['tech-b'],
  );
});

const day = 86_400_000;

test('parseFlowHabits keeps valid stage fields and drops junk', () => {
  const parsed = parseFlowHabits({
    lastOpened: { a: '2026-11-01T00:00:00.000Z', b: 'nope' },
    position: { a: 1, b: -1 },
    slots: { a: 'morning', b: 'dawn' },
    stages: { a: 'active', b: 'new', c: 'next', d: 'resting' },
    stagedAt: { a: '2026-11-01T00:00:00.000Z', b: 'yesterday' },
    seeded: 'yes',
    tryToday: { a: '2026-11-04', b: 'tomorrow', c: '2026-13-40' },
    rested: ['a', 1, '', 'a', 'b'],
  });
  assert.deepEqual(parsed.stages, { a: 'active', c: 'next', d: 'resting' });
  assert.deepEqual(parsed.stagedAt, { a: '2026-11-01T00:00:00.000Z' });
  assert.equal(parsed.seeded, false);
  assert.deepEqual(parsed.tryToday, { a: '2026-11-04' });
  assert.deepEqual(parsed.rested, ['a', 'b']);
  assert.deepEqual(parseFlowHabits(null), emptyFlowHabits());
  assert.equal(parseFlowHabits({ seeded: true }).seeded, true);
});

test('mergeFlowHabits lets the fresh copy win, unions rested, and seeds if either side did', () => {
  const stored = {
    ...emptyFlowHabits(),
    stages: { a: 'next' as const, b: 'resting' as const },
    stagedAt: { a: '2026-11-01T00:00:00.000Z' },
    tryToday: { a: '2026-11-01', c: '2026-11-02' },
    rested: ['b'],
    seeded: false,
  };
  const fresh = {
    ...emptyFlowHabits(),
    stages: { a: 'active' as const },
    stagedAt: { a: '2026-11-03T00:00:00.000Z' },
    tryToday: { a: '2026-11-04' },
    rested: ['b', 'd'],
    seeded: true,
  };
  const merged = mergeFlowHabits(stored, fresh);
  assert.equal(merged.stages.a, 'active');
  assert.equal(merged.stages.b, 'resting');
  assert.equal(merged.stagedAt.a, '2026-11-03T00:00:00.000Z');
  assert.equal(merged.tryToday.a, '2026-11-04');
  assert.equal(merged.tryToday.c, '2026-11-02');
  assert.deepEqual(merged.rested, ['b', 'd']);
  assert.equal(merged.seeded, true);
  assert.equal(mergeFlowHabits(fresh, stored).seeded, true);
});

test('seedStages marks current follows active once, then leaves the record alone', () => {
  const nowIso = '2026-11-04T00:00:00.000Z';
  const seeded = seedStages(emptyFlowHabits(), ['cindy', 'cindy', 'morning'], nowIso);
  assert.equal(seeded.seeded, true);
  assert.equal(seeded.stages.cindy, 'active');
  assert.equal(seeded.stages.morning, 'active');
  assert.equal(seeded.stagedAt.cindy, nowIso);
  assert.equal(seedStages(seeded, ['later'], nowIso), seeded);
  assert.equal(flowStage(seeded, 'later'), 'new');
  assert.equal(flowStage(seeded, 'cindy'), 'active');
});

test('setFlowStage stamps the change and clears Trying today only when the flow starts', () => {
  const base = {
    ...emptyFlowHabits(),
    tryToday: { cindy: '2026-11-04', other: '2026-11-04' },
  };
  const started = setFlowStage(base, 'cindy', 'active', '2026-11-04T01:00:00.000Z');
  assert.equal(started.stages.cindy, 'active');
  assert.equal(started.stagedAt.cindy, '2026-11-04T01:00:00.000Z');
  assert.deepEqual(started.tryToday, { other: '2026-11-04' });
  const later = setFlowStage(base, 'cindy', 'next', '2026-11-04T02:00:00.000Z');
  assert.equal(later.stages.cindy, 'next');
  assert.equal(later.tryToday.cindy, '2026-11-04');
});

test('autoRest moves stale active flows and leaves the unstamped and the already sorted', () => {
  const state = {
    ...emptyFlowHabits(),
    seeded: true,
    stages: {
      stale: 'active' as const,
      recent: 'active' as const,
      opened: 'active' as const,
      blank: 'active' as const,
      queued: 'next' as const,
      outside: 'active' as const,
    },
    stagedAt: {
      stale: '2026-10-01T00:00:00.000Z',
      recent: '2026-10-22T00:00:00.000Z',
      opened: '2026-10-01T00:00:00.000Z',
      queued: '2026-09-01T00:00:00.000Z',
      outside: '2026-09-01T00:00:00.000Z',
    },
    lastOpened: { opened: '2026-11-01T00:00:00.000Z' },
    rested: ['stale'],
  };
  const now = Date.parse('2026-11-04T00:00:00.000Z');
  const first = autoRest(state, ['stale', 'recent', 'opened', 'blank', 'queued'], now);
  assert.deepEqual(first.moved, ['stale']);
  assert.equal(first.state.stages.stale, 'resting');
  assert.equal(first.state.stages.recent, 'active');
  assert.equal(first.state.stages.opened, 'active');
  assert.equal(first.state.stages.blank, 'active');
  assert.equal(first.state.stages.outside, 'active');
  assert.deepEqual(first.state.rested, ['stale']);
  assert.equal(first.state.stagedAt.stale, state.stagedAt.stale);
  const exact = autoRest(
    {
      ...state,
      stages: { edge: 'active' },
      stagedAt: { edge: new Date(now - 14 * day).toISOString() },
      rested: [],
    },
    ['edge'],
    now,
  );
  assert.deepEqual(exact.moved, ['edge']);
  const within = {
    ...state,
    stages: { edge: 'active' as const },
    stagedAt: { edge: new Date(now - 14 * day + 1).toISOString() },
    rested: [] as string[],
  };
  const newer = autoRest(within, ['edge'], now);
  assert.deepEqual(newer.moved, []);
  assert.equal(newer.state, within);
  assert.equal(autoRest(state, ['recent'], now).state, state);
});

test('stageCounts and todayGroups follow the stage, the slot, and who is trying today', () => {
  const state = {
    ...emptyFlowHabits(),
    seeded: true,
    stages: {
      am: 'active' as const,
      pm: 'active' as const,
      loose: 'active' as const,
      later: 'next' as const,
      asleep: 'resting' as const,
    },
    slots: { am: 'morning' as const, pm: 'evening' as const, later: 'night' as const },
    tryToday: { later: '2026-11-04', loose: '2026-11-04', asleep: '2026-11-03', fresh: '2026-11-04' },
  };
  const ids = ['am', 'pm', 'loose', 'later', 'asleep', 'fresh'];
  assert.deepEqual(stageCounts(state, ids), { active: 3, next: 1, resting: 1, new: 1 });
  assert.deepEqual(
    todayGroups(ids, state, '2026-11-04').map(group => [group.id, group.title, group.items]),
    [
      ['morning', 'Morning', [{ kind: 'flow', id: 'am' }]],
      ['evening', 'Evening', [{ kind: 'flow', id: 'pm' }]],
      ['any', 'Any time', [{ kind: 'flow', id: 'loose' }]],
      ['trying', 'Trying today', [{ kind: 'flow', id: 'later' }, { kind: 'flow', id: 'fresh' }]],
    ],
  );
  assert.deepEqual(todayGroups(['am'], state, '2026-11-04'), [
    { id: 'morning', title: 'Morning', items: [{ kind: 'flow', id: 'am' }] },
  ]);
});

test('uses stay inside 30 days and 60 entries, and a repeat inside 10 minutes is ignored', () => {
  const now = Date.now();
  const recent = new Date(now - 60_000).toISOString();
  const older = new Date(now - 31 * day).toISOString();
  const many = Array.from({ length: 61 }, (_, index) => new Date(now - (61 - index) * 60_000).toISOString());
  const parsed = parseFlowHabits({
    uses: { kept: [older, recent, 'nope', recent], burst: many, bad: 'nope' },
    routines: [
      { id: 'r-1', name: ' Morning routine ', flowIds: ['a', 'a', 1, 'b'], slot: 'morning' },
      { id: 'r-1', name: 'duplicate', flowIds: ['c'], slot: 'night' },
      { id: 'r-2', name: ' ', flowIds: ['a'], slot: 'night' },
      { id: 'r-3', name: 'Shared', flowIds: ['a', 'c'], slot: 'dawn' },
      { id: 'r-4', name: 'Loose', flowIds: ['c'], slot: null },
    ],
  });
  assert.deepEqual(parsed.uses.kept, [recent]);
  assert.equal(parsed.uses.burst.length, 60);
  assert.equal(parsed.uses.burst[0], many[1]);
  assert.equal(parsed.uses.burst.at(-1), many.at(-1));
  assert.equal(parsed.uses.bad, undefined);
  assert.deepEqual(
    parsed.routines.map(routine => [routine.id, routine.name, routine.flowIds, routine.slot]),
    [
      ['r-1', 'Morning routine', ['a', 'b'], 'morning'],
      ['r-4', 'Loose', ['c'], null],
    ],
  );
  const again = appendUse(parsed.uses.kept, new Date(now).toISOString(), now);
  assert.deepEqual(again, parsed.uses.kept);
  const later = appendUse(parsed.uses.kept, new Date(now + 11 * 60_000).toISOString(), now + 11 * 60_000);
  assert.equal(later.length, 2);
});

test('a finished run counts for today, and a second finish inside ten minutes does not add another', () => {
  const now = Date.parse('2026-11-04T15:00:00');
  const once = completed(emptyFlowHabits(), 'flow-a', new Date(now).toISOString(), now);
  assert.equal(doneToday(once, 'flow-a', now), true);
  assert.equal(doneToday(once, 'flow-b', now), false);
  assert.equal(doneToday(once, 'flow-a', now + 2 * 86_400_000), false);
  const twice = completed(once, 'flow-a', new Date(now + 60_000).toISOString(), now + 60_000);
  assert.equal(twice.uses['flow-a']?.length, 1);
});

test('weight, staleness, and streak follow the recorded uses', () => {
  const now = Date.parse('2026-11-04T15:00:00.000Z');
  const at = (daysAgo: number, hour = 15) => new Date(now - daysAgo * day + (hour - 15) * 3_600_000).toISOString();
  const state = {
    ...emptyFlowHabits(),
    lastOpened: { quiet: at(8), mixed: at(8) },
    stagedAt: { parked: at(6) },
    uses: {
      daily: [at(1), at(2), at(3), at(4), at(5)],
      regular: [at(1), at(3)],
      light: [at(1)],
      mixed: [at(1)],
      streak: [at(0, 9), at(1, 9), at(2, 9)],
      held: [at(1, 9), at(2, 9), at(3, 9)],
      gap: [at(0, 9), at(1, 9)],
    },
  };
  assert.equal(usesInDays(state, 'daily', 7, now), 5);
  assert.equal(usesInDays(state, 'daily', 2, now), 2);
  assert.equal(usesInDays(state, 'missing', 7, now), 0);
  assert.equal(flowWeight(state, 'daily', now), 'daily');
  assert.equal(flowWeight(state, 'regular', now), 'regular');
  assert.equal(flowWeight(state, 'light', now), 'light');
  assert.equal(flowWeight(state, 'missing', now), 'light');
  assert.equal(isStale(state, 'quiet', now), true);
  assert.equal(isStale(state, 'mixed', now), false);
  assert.equal(isStale(state, 'parked', now), false);
  assert.equal(isStale(state, 'missing', now), false);
  assert.equal(isStale({ ...state, lastOpened: { edge: new Date(now - 7 * day).toISOString() } }, 'edge', now), true);
  const localNow = new Date(2026, 10, 4, 15).getTime();
  const localAt = (dayOfMonth: number) => new Date(2026, 10, dayOfMonth, 9).toISOString();
  const streakState = {
    ...emptyFlowHabits(),
    uses: {
      throughToday: [localAt(2), localAt(3), localAt(4)],
      throughYesterday: [localAt(1), localAt(2), localAt(3)],
      short: [localAt(3), localAt(4)],
    },
  };
  assert.equal(onStreak(streakState, 'throughToday', localNow), true);
  assert.equal(onStreak(streakState, 'throughYesterday', localNow), true);
  assert.equal(onStreak(streakState, 'short', localNow), false);
  assert.equal(onStreak(streakState, 'missing', localNow), false);
});

test('routines are created, renamed, exclusive, and removed without touching their flows', () => {
  const before = Date.now();
  const created = createRoutine(emptyFlowHabits(), ' Morning routine ', ['am', 'am', 'pm'], 'morning');
  const routine = created.routines[0];
  assert.equal(created.routines.length, 1);
  assert.match(routine.id, /^r-[0-9a-z]+$/);
  const stamp = Number.parseInt(routine.id.slice(2), 36);
  assert.ok(stamp >= before && stamp <= Date.now());
  assert.equal(routine.name, 'Morning routine');
  assert.deepEqual(routine.flowIds, ['am', 'pm']);
  assert.equal(routine.slot, 'morning');
  assert.equal(routineOf(created, 'am')?.id, routine.id);
  assert.equal(createRoutine(created, '   ', ['am'], null), created);
  const renamed = renameRoutine(created, routine.id, 'Dawn');
  assert.equal(renamed.routines[0].name, 'Dawn');
  assert.equal(renameRoutine(renamed, routine.id, 'Dawn'), renamed);
  const second = createRoutine(renamed, 'Evening routine', ['pm'], 'evening');
  assert.deepEqual(routineOf(second, 'pm')?.flowIds, ['pm']);
  assert.deepEqual(routineOf(second, 'am')?.flowIds, ['am']);
  const moved = addToRoutine(second, routineOf(second, 'am')!.id, 'pm');
  assert.equal(routineOf(moved, 'pm')?.id, routineOf(moved, 'am')?.id);
  assert.equal(moved.routines.find(item => item.name === 'Evening routine')?.flowIds.length, 0);
  assert.equal(addToRoutine(moved, routineOf(moved, 'pm')!.id, 'pm'), moved);
  assert.equal(addToRoutine(moved, 'missing', 'am'), moved);
  const left = removeFromRoutine(moved, routineOf(moved, 'am')!.id, 'am');
  assert.equal(routineOf(left, 'am'), undefined);
  assert.equal(removeFromRoutine(left, 'missing', 'am'), left);
  const removed = deleteRoutine(left, left.routines[0].id);
  assert.equal(removed.routines.length, left.routines.length - 1);
  assert.equal(removed.stages.am, undefined);
  const stored = {
    ...emptyFlowHabits(),
    uses: { am: [new Date(Date.now() - 2 * day).toISOString()] },
    routines: [{ id: 'r-1', name: 'Stored', flowIds: ['am', 'shared'], slot: 'morning' as const }],
  };
  const fresh = {
    ...emptyFlowHabits(),
    uses: { am: [new Date(Date.now() - 60_000).toISOString()], pm: [new Date(Date.now() - 31 * day).toISOString()] },
    routines: [
      { id: 'r-1', name: 'Fresh', flowIds: ['shared'], slot: null },
      { id: 'r-9', name: 'New', flowIds: ['pm'], slot: 'night' as const },
    ],
  };
  const merged = mergeFlowHabits(stored, fresh);
  assert.equal(merged.routines.find(item => item.id === 'r-1')?.name, 'Fresh');
  assert.deepEqual(merged.routines.find(item => item.id === 'r-1')?.flowIds, ['shared']);
  assert.deepEqual(merged.routines.find(item => item.id === 'r-9')?.flowIds, ['pm']);
  assert.equal(merged.uses.am.length, 2);
  assert.equal(merged.uses.pm, undefined);
});

test('todayGroups shows a routine once, in its slot, and hides its flows', () => {
  const state = {
    ...emptyFlowHabits(),
    stages: {
      am: 'active' as const,
      pm: 'active' as const,
      loose: 'active' as const,
      later: 'next' as const,
      asleep: 'resting' as const,
    },
    slots: { am: 'morning' as const, pm: 'evening' as const, loose: 'morning' as const },
    tryToday: { later: '2026-11-04', asleep: '2026-11-04' },
    routines: [
      { id: 'r-am', name: 'Morning routine', flowIds: ['am', 'pm'], slot: 'morning' as const },
      { id: 'r-any', name: 'Loose routine', flowIds: ['loose'], slot: null },
      { id: 'r-off', name: 'Resting routine', flowIds: ['asleep'], slot: 'night' as const },
    ],
  };
  assert.deepEqual(
    todayGroups(['am', 'pm', 'loose', 'later', 'asleep'], state, '2026-11-04').map(group => [
      group.id,
      group.items,
    ]),
    [
      ['morning', [{ kind: 'routine', id: 'r-am' }]],
      ['any', [{ kind: 'routine', id: 'r-any' }]],
      ['trying', [{ kind: 'flow', id: 'later' }]],
    ],
  );
});

test('localDate uses the device calendar day', () => {
  assert.equal(localDate(new Date(2026, 10, 4, 0, 30)), '2026-11-04');
  assert.equal(localDate(new Date(2026, 0, 5, 23, 15)), '2026-01-05');
});
