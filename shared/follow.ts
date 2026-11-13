/**
 * Trying someone else's flow for a few sessions, then going back.
 * The member's own series is paused, never deleted. A snapshot carries the
 * public shape only: sets, reps, order. Weights and logs stay with the owner.
 * The person running it gets their own weights from the Personalised layer.
 */
import { hasChanges, type Customflow, type CustomflowChanges, type CustomflowSource } from './customflows';
import { addCalendarDays, calendarWeekday, occurrences, type FlowSeries, type Recurrence, type SeriesCompletion, type SeriesEnd, type SeriesItemKind, type SeriesOccurrence, type SeriesTime } from './flow-series';
import { gymFlowById } from './gym-flows';
import { dailyFlowOn, plannedExerciseIds, type CopySource, type MapFlow, type MapFlowDay, type MapFlowRepeat } from './map-flow';
import { mainAreasTrained } from './body-flow';
import { muscleAreas, type MuscleArea } from './muscle-map';

/** How long a trial can last. Null means until the member stops. The default is 4. */
export const followLengths = [
  { sessions: 1 as const, label: '1 session' },
  { sessions: 4 as const, label: '4 sessions' },
  { sessions: null, label: 'Until I stop' },
] as const;

export const defaultFollowSessions = 4 as const;
export const defaultFollowAfter = 'return' as const;
export const slotOneWarning = 'Slot 1 is the Map flow on Today. Replacing it changes what you follow.';
export const slotsFullLine = 'All five slots are in use. Choose one to replace.';

export type FollowSpan = 1 | 4 | null;
export type FollowThen = 'return' | 'keep';

export type FollowSource = {
  kind: CustomflowSource['kind'];
  id: string;
  version: number | null;
};

export type PublicItem = {
  exerciseId: string;
  sets: number;
  repsMin?: number;
  repsMax?: number;
};

/** What the owner is offering. Private fields may be present; a snapshot drops them. */
export type TheirFlow = {
  title: string;
  fromName: string;
  kind: 'custom' | 'daily' | 'map';
  source?: FollowSource;
  items?: readonly (PublicItem & { weightKg?: number; logs?: unknown })[];
  changes?: CustomflowChanges;
  weightKg?: number;
  logs?: unknown;
  bodyWeightKg?: number;
  ticks?: unknown;
  map?: CopySource & { weightKg?: number; logs?: unknown; ticks?: unknown };
};

export type FollowWhere = { kind: 'replace'; flowId: string } | { kind: 'add'; date: string };

export type FollowMap = {
  repeat: MapFlowRepeat;
  days: readonly MapFlowDay[];
  released?: MapFlow['released'];
};

export type PublicSnapshot = {
  title: string;
  fromName: string;
  kind: 'custom' | 'daily';
  source: FollowSource;
  items: PublicItem[];
  changes: CustomflowChanges;
};

export type SeriesDraft = {
  itemKind: SeriesItemKind;
  itemId: string;
  version?: number;
  start: string;
  time: SeriesTime;
  recurrence: Recurrence;
  end: SeriesEnd;
};

export type FollowSeriesPlan = {
  kind: 'series';
  where: FollowWhere;
  sessions: FollowSpan;
  after: FollowThen;
  snapshot: PublicSnapshot;
  pause: { flowId: string; title: string } | null;
  create: SeriesDraft;
  dates: string[];
  reason: string;
  ownTitle: string;
  problem: string | null;
};

export type FollowMapPlan = {
  kind: 'map';
  slot: number | null;
  source: CopySource;
  problem: string | null;
};

export type FollowPlanResult = FollowSeriesPlan | FollowMapPlan;

export type ReplacementSuggestion = {
  where: FollowWhere;
  title: string;
  reason: string;
};

export type FollowStatus = 'active' | 'returned' | 'kept' | 'stopped';

export type FollowRecord = {
  id: string;
  pausedSeriesId: string | null;
  replacementSeriesId: string;
  replacedFlowId: string | null;
  sessionsTotal: FollowSpan;
  after: FollowThen;
  where: 'replace' | 'add';
  fromName: string;
  title: string;
  ownTitle: string;
  startedOn: string;
  dates: string[];
  status: FollowStatus;
  source: FollowSource;
  items: PublicItem[];
  changes: CustomflowChanges;
  finishedDates: string[];
  reviewLine: string | null;
  adopted: boolean;
  recurrence: Recurrence;
  time: SeriesTime;
};

const privateKey = /^(weightKg|bodyWeightKg|bodyWeight|logs|ticks|weight|personalised)$/;

/** Drops weights, body weight, logs and ticks at every level. */
export function stripPrivate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPrivate);
  if (!value || typeof value !== 'object') return value;
  const next: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (privateKey.test(key)) continue;
    next[key] = stripPrivate(item);
  }
  return next;
}

function publicChanges(changes: CustomflowChanges | undefined): CustomflowChanges {
  if (!changes) return {};
  const next: CustomflowChanges = {};
  if (changes.order?.length) next.order = [...changes.order];
  if (changes.swaps && Object.keys(changes.swaps).length) next.swaps = { ...changes.swaps };
  if (changes.removed?.length) next.removed = [...changes.removed];
  return next;
}

function publicItems(items: TheirFlow['items']): PublicItem[] {
  return (items ?? []).flatMap(item => {
    if (!item.exerciseId || !Number.isFinite(item.sets) || item.sets < 1) return [];
    return [
      {
        exerciseId: item.exerciseId,
        sets: item.sets,
        ...(item.repsMin != null ? { repsMin: item.repsMin } : {}),
        ...(item.repsMax != null ? { repsMax: item.repsMax } : {}),
      },
    ];
  });
}

export function publicSnapshot(flow: TheirFlow): PublicSnapshot {
  const source = flow.source ?? { kind: 'qram-flow' as const, id: '', version: null };
  return {
    title: flow.title.trim(),
    fromName: flow.fromName.trim(),
    kind: flow.kind === 'daily' ? 'daily' : 'custom',
    source,
    items: publicItems(flow.items),
    changes: publicChanges(flow.changes),
  };
}

function exerciseIds(flow: { items?: readonly { exerciseId: string }[]; source?: { id: string } }) {
  if (flow.items?.length) return flow.items.map(item => item.exerciseId);
  if (flow.source?.id) return plannedExerciseIds({ kind: 'flow', id: flow.source.id });
  return [];
}

function flowTitle(id: string, day: MapFlowDay) {
  return gymFlowById(id)?.title ?? day.name;
}

function areaList(ids: readonly string[]) {
  return mainAreasTrained(ids);
}

function sharedNames(left: readonly MuscleArea[], right: readonly MuscleArea[]) {
  const have = new Set(right);
  return muscleAreas.filter(area => have.has(area.id) && left.includes(area.id)).map(area => area.title.toLowerCase());
}

function nameList(names: readonly string[]) {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

function asMap(map: FollowMap): MapFlow {
  return map as MapFlow;
}

/** The next rest day, or tomorrow when the pattern has none. */
export function nextAddDate(map: FollowMap | null, today: string) {
  if (!map?.days.length) return addCalendarDays(today, 1);
  let done = { doneDates: [] as string[], letGo: map.released ?? [] };
  const room = map.days.length + 14;
  for (let step = 0; step < room; step += 1) {
    const date = addCalendarDays(today, step);
    const placed = dailyFlowOn(asMap(map), today, done, date);
    if (!placed) break;
    if (placed.effort === 'rest' || placed.flows.length === 0) return date;
    done = { doneDates: [...done.doneDates, date], letGo: done.letGo };
  }
  return addCalendarDays(today, 1);
}

/**
 * The flow in the followed Map flow that trains the most of the same areas.
 * No shared area means add a day. The reason names the areas.
 */
export function suggestReplacement(theirFlow: Pick<TheirFlow, 'items' | 'source'>, map: FollowMap | null, today: string): ReplacementSuggestion {
  const theirs = areaList(exerciseIds(theirFlow));
  let best: { flowId: string; title: string; score: number; names: string[] } | null = null;
  for (const day of map?.days ?? []) {
    for (const ref of day.flows) {
      const names = sharedNames(theirs, areaList(plannedExerciseIds(ref)));
      const score = names.length;
      if (!best || score > best.score) best = { flowId: ref.id, title: flowTitle(ref.id, day), score, names };
    }
  }
  if (!best || best.score === 0) {
    return {
      where: { kind: 'add', date: nextAddDate(map, today) },
      title: 'Add a day',
      reason: map?.days.some(day => day.flows.length > 0)
        ? 'Nothing in this Map flow trains the same areas.'
        : 'There is no flow here to replace, so this adds a day.',
    };
  }
  return {
    where: { kind: 'replace', flowId: best.flowId },
    title: best.title,
    reason: `Both train ${nameList(best.names)}.`,
  };
}

function datesForFlow(map: FollowMap, today: string, flowId: string, count: number) {
  const dates: string[] = [];
  let done = { doneDates: [] as string[], letGo: map.released ?? [] };
  const room = count * map.days.length + 21;
  for (let step = 0; step < room && dates.length < count; step += 1) {
    const date = addCalendarDays(today, step);
    const placed = dailyFlowOn(asMap(map), today, done, date);
    if (!placed) break;
    if (placed.flows.some(flow => flow.id === flowId)) dates.push(date);
    done = { doneDates: [...done.doneDates, date], letGo: done.letGo };
  }
  return dates;
}

function weeklyDates(start: string, count: number) {
  return Array.from({ length: count }, (_, index) => addCalendarDays(start, index * 7));
}

function gap(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86400000));
}

function recurrenceFor(dates: string[], open: boolean, weekly: boolean): Recurrence {
  if (weekly) return { kind: 'weekly', every: 1, days: [calendarWeekday(dates[0] ?? '2026-11-16')] };
  if (!open && dates.length <= 1) return { kind: 'once' };
  if (dates.length < 2) return { kind: 'daily', every: 1 };
  const every = Math.min(30, gap(dates[0], dates[1]));
  if (every === 7) return { kind: 'weekly', every: 1, days: [calendarWeekday(dates[0])] };
  return { kind: 'daily', every };
}

function cleanMapSource(raw: NonNullable<TheirFlow['map']>): CopySource {
  const stripped = stripPrivate(raw) as CopySource;
  return {
    ...(stripped.id ? { id: stripped.id } : {}),
    name: stripped.name,
    styleId: stripped.styleId,
    purposeIds: [...(stripped.purposeIds ?? [])],
    repeat: stripped.repeat,
    days: stripped.days,
  };
}

function itemKindOf(source: FollowSource): SeriesItemKind {
  if (source.kind === 'qram-session') return 'session';
  if (source.kind === 'community-flow') return 'community';
  return 'flow';
}

/**
 * The series changes for one trial.
 * A Map flow is copied into a free slot. A Daily flow is the same trial for one day.
 * Replace pauses the similar flow. Add puts the snapshot on the chosen day.
 */
export function followPlan(input: {
  theirFlow: TheirFlow;
  myMapFlow: FollowMap | null;
  where: FollowWhere;
  sessions: FollowSpan;
  after: FollowThen;
  today: string;
  slots?: readonly { slot: number }[];
  replaceSlot?: number;
  confirmBase?: boolean;
}): FollowPlanResult {
  if (input.theirFlow.kind === 'map') {
    if (!input.theirFlow.map) return { kind: 'map', slot: null, source: { name: '', styleId: 'member', purposeIds: [], repeat: 'in-turn', days: [] }, problem: 'That Map flow has no days.' };
    const source = cleanMapSource(input.theirFlow.map);
    const taken = new Set((input.slots ?? []).map(slot => slot.slot));
    if (input.replaceSlot != null) {
      if (input.replaceSlot < 1 || input.replaceSlot > 5) return { kind: 'map', slot: null, source, problem: 'Choose a slot from 1 to 5.' };
      if (input.replaceSlot === 1 && !input.confirmBase) return { kind: 'map', slot: null, source, problem: slotOneWarning };
      return { kind: 'map', slot: input.replaceSlot, source, problem: null };
    }
    let slot: number | null = null;
    for (let index = 1; index <= 5; index += 1) {
      if (!taken.has(index)) {
        slot = index;
        break;
      }
    }
    return {
      kind: 'map',
      slot,
      source,
      problem: slot == null ? slotsFullLine : null,
    };
  }
  const snapshot = publicSnapshot(input.theirFlow);
  const sessions: FollowSpan = input.theirFlow.kind === 'daily' ? 1 : input.sessions;
  const count = sessions ?? 4;
  const open = sessions == null;
  let where = input.where;
  let reason = 'Added on a day of its own.';
  let ownTitle = 'Your flow';
  if (input.where.kind === 'replace') {
    const flowId = input.where.flowId;
    const day = input.myMapFlow?.days.find(item => item.flows.some(flow => flow.id === flowId));
    if (!day) {
      where = { kind: 'add', date: nextAddDate(input.myMapFlow, input.today) };
      reason = 'That flow is not in this Map flow, so this adds a day.';
    } else {
      where = input.where;
      ownTitle = flowTitle(flowId, day);
      reason = suggestReplacement(input.theirFlow, input.myMapFlow, input.today).reason;
    }
  }
  const adding = where.kind === 'add';
  let dates: string[];
  if (where.kind === 'add') dates = weeklyDates(where.date, open ? 4 : count);
  else if (input.myMapFlow) dates = datesForFlow(input.myMapFlow, input.today, where.flowId, open ? 4 : count);
  else dates = [input.today];
  const start = dates[0] ?? input.today;
  const recurrence = recurrenceFor(dates, open, adding);
  // An added day stays weekly so "keep it" can continue. A finite trial still only shows `dates`.
  const create: SeriesDraft = {
    itemKind: itemKindOf(snapshot.source),
    itemId: snapshot.source.id,
    ...(snapshot.source.version != null ? { version: snapshot.source.version } : {}),
    start,
    time: { checkpoint: 'Morning' },
    recurrence,
    end: open ? { kind: 'never' } : { kind: 'after', count: Math.max(1, dates.length) },
  };
  return {
    kind: 'series',
    where,
    sessions,
    after: input.after,
    snapshot,
    pause: adding || where.kind !== 'replace' ? null : { flowId: where.flowId, title: ownTitle },
    create,
    dates,
    reason,
    ownTitle: adding ? 'Your day' : ownTitle,
    problem: snapshot.source.id ? null : 'That flow has no source.',
  };
}

export function returnLine(ownTitle: string, fromName: string, count: number) {
  if (count === 1) return `${ownTitle} is back. 1 session of ${fromName}'s flow is done.`;
  return `${ownTitle} is back. ${count} sessions of ${fromName}'s flow are done.`;
}

export function sessionsLeft(follow: Pick<FollowRecord, 'sessionsTotal' | 'finishedDates' | 'status'>) {
  if (follow.sessionsTotal == null) return null;
  if (follow.status !== 'active') return 0;
  return Math.max(0, follow.sessionsTotal - follow.finishedDates.length);
}

/** One finished session counts down. At zero the pause lifts, or the trial is kept. */
export function nextFollowState(follow: FollowRecord, finishedOn: readonly string[]): FollowRecord {
  if (follow.status !== 'active') return follow;
  const allowed = new Set(follow.dates);
  const finished = [...new Set(finishedOn)]
    .filter(date => date >= follow.startedOn && (follow.sessionsTotal == null || allowed.has(date)))
    .sort();
  if (follow.sessionsTotal == null || finished.length < follow.sessionsTotal) {
    if (finished.join('|') === follow.finishedDates.join('|')) return follow;
    return { ...follow, finishedDates: finished };
  }
  const done = finished.slice(0, follow.sessionsTotal);
  if (follow.after === 'keep') return { ...follow, finishedDates: done, status: 'kept', reviewLine: null };
  return { ...follow, finishedDates: done, status: 'returned', reviewLine: returnLine(follow.ownTitle, follow.fromName, done.length) };
}

export function stoppedFollow(follow: FollowRecord): FollowRecord {
  if (follow.status !== 'active') return follow;
  return { ...follow, status: 'stopped' };
}

/** The snapshot becomes the member's Custom flow, with the owner's name kept on it. */
export function keptCustomflow(follow: FollowRecord, now: string): (Customflow & { fromName: string }) | null {
  if (!hasChanges(follow.changes)) return null;
  return {
    source: { kind: follow.source.kind, id: follow.source.id, version: follow.source.version },
    changes: follow.changes,
    fromName: follow.fromName,
    createdAt: now,
    updatedAt: now,
  };
}

function synthetic(follow: FollowRecord): FlowSeries {
  return {
    id: follow.replacementSeriesId,
    itemKind: itemKindOf(follow.source),
    itemId: follow.source.id,
    ...(follow.source.version != null ? { version: follow.source.version } : {}),
    start: follow.startedOn,
    time: follow.time,
    recurrence: follow.recurrence,
    end: { kind: 'never' },
    createdAt: follow.startedOn,
  };
}

/** Whether this date still shows the followed flow. */
export function followShowsOn(follow: FollowRecord, date: string) {
  if (date < follow.startedOn) return false;
  if (follow.status === 'stopped' || follow.status === 'returned') return follow.finishedDates.includes(date);
  if (follow.where === 'add' && (follow.status === 'kept' || follow.sessionsTotal == null)) {
    return occurrences([synthetic(follow)], [], date, date).length > 0;
  }
  if (follow.status === 'kept' || follow.sessionsTotal == null) return true;
  return follow.dates.includes(date);
}

function paint(row: SeriesOccurrence, completions: readonly SeriesCompletion[]): SeriesOccurrence {
  const done = completions.some(item => item.itemKind === row.itemKind && item.itemId === row.itemId && item.date === row.date);
  return { ...row, status: done ? 'done' : 'open' };
}

/**
 * Future days of a paused series show the snapshot. Days before the trial stay as they were.
 * The replacement series itself is hidden: the paused row is rewritten, and an added day is inserted.
 */
export function applyFollowOccurrences(
  rows: readonly SeriesOccurrence[],
  follows: readonly FollowRecord[],
  completions: readonly SeriesCompletion[],
  from: string,
  to: string,
): SeriesOccurrence[] {
  if (!follows.length) return [...rows];
  const hidden = new Set(follows.map(follow => follow.replacementSeriesId));
  const rewritten = rows.filter(row => !hidden.has(row.seriesId)).map(row => {
    const follow = follows.find(item => item.where === 'replace' && item.pausedSeriesId === row.seriesId && followShowsOn(item, row.date));
    if (!follow) return row;
    const itemKind = itemKindOf(follow.source);
    const next: SeriesOccurrence = {
      ...row,
      itemKind,
      itemId: follow.source.id,
      ...(follow.source.version != null ? { version: follow.source.version } : {}),
    };
    if (follow.source.version == null) delete next.version;
    return paint(next, completions);
  });
  const extras: SeriesOccurrence[] = [];
  for (const follow of follows) {
    if (follow.where !== 'add') continue;
    const spanFrom = from < follow.startedOn ? follow.startedOn : from;
    if (spanFrom > to) continue;
    const candidates =
      follow.status === 'kept' || follow.sessionsTotal == null
        ? occurrences([synthetic(follow)], [], spanFrom, to).map(row => row.date)
        : follow.status === 'active'
          ? follow.dates.filter(date => date >= from && date <= to)
          : follow.finishedDates.filter(date => date >= from && date <= to);
    for (const date of candidates) {
      if (!followShowsOn(follow, date)) continue;
      const itemKind = itemKindOf(follow.source);
      extras.push(
        paint(
          {
            seriesId: follow.replacementSeriesId,
            itemKind,
            itemId: follow.source.id,
            ...(follow.source.version != null ? { version: follow.source.version } : {}),
            date,
            time: follow.time,
            original: date,
            moved: false,
            status: 'open',
          },
          completions,
        ),
      );
    }
  }
  return [...rewritten, ...extras].sort((a, b) => a.date.localeCompare(b.date) || a.seriesId.localeCompare(b.seriesId) || a.itemId.localeCompare(b.itemId));
}

export function reviewLinesFor(follows: readonly FollowRecord[], today: string) {
  const start = addCalendarDays(today, -6);
  return follows.flatMap(follow => {
    if (follow.status !== 'returned' || !follow.reviewLine) return [];
    const on = follow.finishedDates[follow.finishedDates.length - 1];
    if (!on || on < start || on > today) return [];
    return [follow.reviewLine];
  });
}
