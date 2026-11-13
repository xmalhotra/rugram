/**
 * A Map flow is a pattern of Daily flows. It is not a week.
 * In turn, a missed day shifts the plan and nothing is skipped.
 * Pinned to weekdays is only for seven days: a miss is offered again on the
 * next rest day, or let go by the member. It is never dropped on its own.
 * Nothing here writes a row. Weights and logs are not part of a copy.
 */
import { z } from 'zod';
import { bodyRegions, mainAreasTrained } from './body-flow';
import { exerciseRestClass } from './exercise-rest';
import { type FlowLevel, type TrainPlace } from './flow-defaults';
import { addCalendarDays, calendarWeekday, inclusiveSpan, type SeriesItemKind } from './flow-series';
import { gymFlowById } from './gym-flows';
import { mapFlowStyleById } from './map-flow-styles';
import { muscleMapFor, type MuscleArea } from './muscle-map';
import { routineCheckpoints } from './routines';
import type { BodyPlan, PlannedFlow } from './predicted-body-flow';

export const mapFlowSlotCount = 5;

export const mapFlowEfforts = ['rest', 'easy', 'upper', 'lower', 'heavy-lower', 'hard-run', 'full', 'core', 'skill'] as const;
export type MapFlowEffort = (typeof mapFlowEfforts)[number];

export const mapFlowRepeats = ['in-turn', 'weekdays'] as const;
export type MapFlowRepeat = (typeof mapFlowRepeats)[number];

const plannedExerciseSchema = z
  .object({
    exerciseId: z.string().min(1),
    sets: z.number().int().min(1).max(20),
  })
  .strict();

export const mapFlowRefSchema = z
  .object({
    kind: z.enum(['flow', 'session', 'community']),
    id: z.string().trim().min(1).max(120),
    version: z.number().int().min(1).max(10000).optional(),
    items: z.array(plannedExerciseSchema).max(12).optional(),
  })
  .strict();

export type MapFlowRef = z.infer<typeof mapFlowRefSchema>;

export const mapDayItemSchema = z
  .object({
    itemId: z.string().min(1).max(80),
    name: z.string().min(1).max(80),
    checkpoint: z.enum(routineCheckpoints),
    timesPerDay: z.number().int().min(1).max(6),
  })
  .strict();

export type MapDayItem = z.infer<typeof mapDayItemSchema>;

export const mapFlowDaySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    effort: z.enum(mapFlowEfforts),
    flows: z.array(mapFlowRefSchema).max(8),
    items: z.array(mapDayItemSchema).max(6),
  })
  .strict();

export type MapFlowDay = z.infer<typeof mapFlowDaySchema>;

const releasedSchema = z
  .object({
    index: z.number().int().min(0).max(6),
    on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export type ReleasedDay = z.infer<typeof releasedSchema>;

export const mapFlowSchema = z
  .object({
    id: z.string().uuid(),
    slot: z.number().int().min(1).max(mapFlowSlotCount),
    name: z.string().trim().min(1).max(80),
    styleId: z.string().min(1),
    purposeIds: z.array(z.string().min(1)).max(8),
    repeat: z.enum(mapFlowRepeats),
    sourceKind: z.enum(['template', 'copy', 'backfill']),
    sourceId: z.string().min(1).max(120).optional(),
    days: z.array(mapFlowDaySchema).min(1).max(100),
    released: z.array(releasedSchema).max(14),
    createdAt: z.string().min(10),
    updatedAt: z.string().min(10),
  })
  .strict()
  .superRefine((flow, ctx) => {
    if (!mapFlowStyleById(flow.styleId)) ctx.addIssue({ code: 'custom', message: 'Unknown style.', path: ['styleId'] });
    if (flow.repeat === 'weekdays' && flow.days.length !== 7)
      ctx.addIssue({ code: 'custom', message: 'Pinning to weekdays needs seven days.', path: ['repeat'] });
  });

export type MapFlow = z.infer<typeof mapFlowSchema>;

export type MapFlowFollow = { mapFlowId: string; from: string };

export type MapFlowProgress = {
  /** Dates the member finished a flow that belongs to this Map flow. */
  doneDates: readonly string[];
  /** Pinned days the member chose to let go. `on` is the date it was first missed. */
  letGo: readonly ReleasedDay[];
};

export type DailyFlowPlacement = {
  index: number;
  name: string;
  effort: MapFlowEffort;
  flows: MapFlowRef[];
  items: MapDayItem[];
  /** A missed weekday offered again on a rest day. */
  makeup: boolean;
};

export type MapFlowItem = {
  id: string;
  itemId: string;
  name: string;
  checkpoint: MapDayItem['checkpoint'];
  timesPerDay: number;
};

const legMains = new Set<MuscleArea>(['quads', 'hamstrings', 'glutes']);

function eachDate(from: string, to: string) {
  const span = inclusiveSpan(from, to);
  if (span == null) return [];
  const dates: string[] = [];
  for (let index = 0; index < span; index += 1) dates.push(addCalendarDays(from, index));
  return dates;
}

function isRestDay(day: MapFlowDay) {
  return day.effort === 'rest' || day.flows.length === 0;
}

function placement(flow: MapFlow, index: number, makeup: boolean): DailyFlowPlacement {
  const day = flow.days[index];
  return {
    index,
    name: day.name,
    effort: day.effort,
    flows: day.flows,
    items: day.items,
    makeup,
  };
}

function released(done: MapFlowProgress, index: number, on: string) {
  return done.letGo.some(item => item.index === index && item.on === on);
}

function inTurnOn(flow: MapFlow, followedFrom: string, done: MapFlowProgress, date: string): DailyFlowPlacement | null {
  const length = flow.days.length;
  let index = 0;
  for (const day of eachDate(followedFrom, date)) {
    if (day === date) return placement(flow, index, false);
    const current = flow.days[index];
    if (isRestDay(current) || done.doneDates.includes(day)) index = (index + 1) % length;
  }
  return null;
}

function pinnedOn(flow: MapFlow, followedFrom: string, done: MapFlowProgress, date: string): DailyFlowPlacement | null {
  if (flow.days.length !== 7) return null;
  const open: { index: number; on: string }[] = [];
  for (const day of eachDate(followedFrom, date)) {
    const pinned = calendarWeekday(day) - 1;
    const pinnedDay = flow.days[pinned];
    const pending = open.find(item => !released(done, item.index, item.on));
    if (day === date) {
      if (isRestDay(pinnedDay) && pending) return placement(flow, pending.index, true);
      return placement(flow, pinned, false);
    }
    if (isRestDay(pinnedDay) && pending && done.doneDates.includes(day)) {
      const at = open.findIndex(item => item.index === pending.index && item.on === pending.on);
      if (at >= 0) open.splice(at, 1);
    }
    if (!isRestDay(pinnedDay) && !done.doneDates.includes(day) && !released(done, pinned, day)) open.push({ index: pinned, on: day });
  }
  return null;
}

/**
 * Which Daily flow falls on `date`.
 * In turn, the index advances only when that day was done, or when it is a rest day.
 * A missed training day stays the next one, so later days shift and nothing is skipped.
 * Pinned to weekdays uses Monday as the first day. A miss is offered on the next rest day.
 */
export function dailyFlowOn(
  flow: MapFlow,
  followedFrom: string,
  done: MapFlowProgress,
  date: string,
): DailyFlowPlacement | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(followedFrom) || date < followedFrom) return null;
  if (!flow.days.length) return null;
  if (flow.repeat === 'weekdays') return pinnedOn(flow, followedFrom, done, date);
  return inTurnOn(flow, followedFrom, done, date);
}

/** What the pattern planned from the follow date through `date`, inclusive. */
export function plannedByNow(flow: MapFlow, followedFrom: string, done: MapFlowProgress, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < followedFrom) return [];
  const rows: { date: string; placement: DailyFlowPlacement }[] = [];
  for (const day of eachDate(followedFrom, date)) {
    const placed = dailyFlowOn(flow, followedFrom, done, day);
    if (placed) rows.push({ date: day, placement: placed });
  }
  return rows;
}

/** Exercises a planned flow contributes. A gym flow uses its written sets. Otherwise the ref's own items. */
export function plannedExerciseIds(ref: MapFlowRef): string[] {
  const gym = gymFlowById(ref.id);
  if (gym?.items.length) return [...new Set(gym.items.map(item => item.exerciseId))];
  return [...new Set((ref.items ?? []).map(item => item.exerciseId))];
}

/**
 * Muscle areas the followed Map flow planned before `today` that were not done and not let go.
 * Today is still ahead. `range` keeps only those dates, after the pattern has been walked from the follow.
 */
export function areasPlannedByNow(
  flow: MapFlow,
  followedFrom: string,
  done: MapFlowProgress,
  today: string,
  range?: { from: string; to: string },
  idsFor: (ref: MapFlowRef) => readonly string[] = plannedExerciseIds,
): MuscleArea[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !/^\d{4}-\d{2}-\d{2}$/.test(followedFrom)) return [];
  const end = addCalendarDays(today, -1);
  if (end < followedFrom) return [];
  const areas = new Set<MuscleArea>();
  for (const row of plannedByNow(flow, followedFrom, done, end)) {
    if (range && (row.date < range.from || row.date > range.to)) continue;
    if (done.doneDates.includes(row.date)) continue;
    if (done.letGo.some(item => item.index === row.placement.index && item.on === row.date)) continue;
    if (row.placement.effort === 'rest' || row.placement.flows.length === 0) continue;
    for (const ref of row.placement.flows) {
      for (const area of mainAreasTrained(idsFor(ref))) areas.add(area);
    }
  }
  return [...areas].sort((a, b) => a.localeCompare(b));
}

/** The next dates if each day is done, so a new follow can show the regime ahead. */
export function regimeAhead(flow: MapFlow, from: string, count: number) {
  const rows: { date: string; name: string }[] = [];
  const limit = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  let done: MapFlowProgress = { doneDates: [], letGo: flow.released };
  for (let step = 0; rows.length < limit && step < limit + flow.days.length + 14; step += 1) {
    const date = addCalendarDays(from, step);
    const placed = dailyFlowOn(flow, from, done, date);
    if (!placed) break;
    rows.push({ date, name: placed.name });
    done = { doneDates: [...done.doneDates, date], letGo: done.letGo };
  }
  return rows;
}

function startedOn(createdAt: string) {
  return /^\d{4}-\d{2}-\d{2}/.test(createdAt) ? createdAt.slice(0, 10) : createdAt;
}

/**
 * The Map flow followed on `date`: the latest follow on or before that date.
 * When nothing was followed yet, slot 1 is the base, from the day it was created.
 */
export function followedMapFlow<T extends { id: string; slot: number; createdAt: string }>(
  flows: readonly T[],
  follows: readonly MapFlowFollow[],
  date: string,
): { flow: T; from: string } | null {
  const ordered = [...follows].filter(follow => follow.from <= date).sort((a, b) => b.from.localeCompare(a.from) || a.mapFlowId.localeCompare(b.mapFlowId));
  for (const follow of ordered) {
    const flow = flows.find(item => item.id === follow.mapFlowId);
    if (flow) return { flow, from: follow.from };
  }
  const base = flows.find(item => item.slot === 1);
  if (!base) return null;
  return { flow: base, from: startedOn(base.createdAt) };
}

export function freeSlot(flows: readonly { slot: number }[]) {
  for (let slot = 1; slot <= mapFlowSlotCount; slot += 1) {
    if (!flows.some(flow => flow.slot === slot)) return slot;
  }
  return null;
}

/** Why a slot cannot be filled or cleared. Null when the action is allowed. */
export function slotProblem(flows: readonly { slot: number }[], slot: number, action: 'use' | 'clear') {
  if (!Number.isInteger(slot) || slot < 1 || slot > mapFlowSlotCount) return 'Choose a slot from 1 to 5.';
  const taken = flows.some(flow => flow.slot === slot);
  if (action === 'use' && taken) return 'That slot is in use.';
  if (action === 'use' && flows.length >= mapFlowSlotCount) return 'All five slots are in use.';
  if (action === 'clear' && !taken) return 'That slot is empty.';
  if (action === 'clear' && slot === 1 && flows.length <= 1) return 'Base stays while it is the only Map flow.';
  return null;
}

export function planFromMapFlow(flow: { days: readonly { flows: readonly MapFlowRef[] }[] }): BodyPlan {
  return {
    days: flow.days.map(day => ({
      flows: day.flows.map(item => ({
        id: item.id,
        kind: item.kind,
        ...(item.version != null ? { version: item.version } : {}),
        ...(item.items ? { items: item.items } : {}),
      })),
    })),
  };
}

type CopyDay = {
  name: string;
  effort: MapFlowEffort;
  flows: readonly {
    kind: SeriesItemKind;
    id: string;
    version?: number;
    items?: readonly { exerciseId: string; sets: number; weightKg?: number }[];
    weightKg?: number;
    logs?: unknown;
  }[];
  items: readonly {
    itemId: string;
    name: string;
    checkpoint: MapDayItem['checkpoint'];
    timesPerDay: number;
    ticks?: unknown;
    weightKg?: number;
    logs?: unknown;
  }[];
};

export type CopySource = {
  id?: string;
  name: string;
  styleId: string;
  purposeIds: readonly string[];
  repeat: MapFlowRepeat;
  days: readonly CopyDay[];
  createdAt?: string;
  weightKg?: number;
  logs?: unknown;
  ticks?: unknown;
};

function cleanDay(day: CopyDay): MapFlowDay {
  return mapFlowDaySchema.parse({
    name: day.name,
    effort: day.effort,
    flows: day.flows.map(flow => ({
      kind: flow.kind,
      id: flow.id,
      ...(flow.version != null ? { version: flow.version } : {}),
      ...(flow.items ? { items: flow.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets })) } : {}),
    })),
    items: day.items.map(item => ({
      itemId: item.itemId,
      name: item.name,
      checkpoint: item.checkpoint,
      timesPerDay: item.timesPerDay,
    })),
  });
}

function newId() {
  return crypto.randomUUID();
}

/**
 * A new Map flow in `slot` with the same pattern and style.
 * Series and items are new. Weights, logs and ticks are left behind.
 */
export function copyMapFlow(source: CopySource, slot: number, start?: string) {
  if (slot < 1 || slot > mapFlowSlotCount) throw new Error('Choose a slot from 1 to 5.');
  const days = source.days.map(cleanDay);
  if (source.repeat === 'weekdays' && days.length !== 7) throw new Error('Pinning to weekdays needs seven days.');
  const now = new Date().toISOString();
  const id = newId();
  const begun = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : now.slice(0, 10);
  const mapFlow = mapFlowSchema.parse({
    id,
    slot,
    name: source.name.trim(),
    styleId: source.styleId,
    purposeIds: [...source.purposeIds],
    repeat: source.repeat,
    sourceKind: 'copy',
    ...(source.id ? { sourceId: source.id } : {}),
    days,
    released: [],
    createdAt: now,
    updatedAt: now,
  });
  const seen = new Set<string>();
  const series = days.flatMap(day =>
    day.flows.flatMap(flow => {
      const key = `${flow.kind}:${flow.id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          id: newId(),
          itemKind: flow.kind,
          itemId: flow.id,
          ...(flow.version != null ? { version: flow.version } : {}),
          mapFlowId: id,
          start: begun,
          time: { checkpoint: 'Morning' as const },
          recurrence: { kind: 'once' as const },
          end: { kind: 'never' as const },
          createdAt: now,
        },
      ];
    }),
  );
  const itemSeen = new Set<string>();
  const items: MapFlowItem[] = days.flatMap(day =>
    day.items.flatMap(item => {
      if (itemSeen.has(item.itemId)) return [];
      itemSeen.add(item.itemId);
      return [{ id: newId(), itemId: item.itemId, name: item.name, checkpoint: item.checkpoint, timesPerDay: item.timesPerDay }];
    }),
  );
  return { mapFlow, series, items };
}

function exercisesOf(day: MapFlowDay) {
  const rows: { exerciseId: string; sets: number }[] = [];
  for (const flow of day.flows) {
    const gym = gymFlowById(flow.id);
    if (gym) {
      for (const item of gym.items) rows.push({ exerciseId: item.exerciseId, sets: item.sets });
      continue;
    }
    for (const item of flow.items ?? []) rows.push(item);
  }
  return rows;
}

function primaryRegion(day: MapFlowDay) {
  const totals = new Map<string, number>();
  for (const exercise of exercisesOf(day)) {
    for (const area of muscleMapFor(exercise.exerciseId).main) {
      const region = bodyRegions.find(item => item.areas.includes(area));
      if (!region) continue;
      totals.set(region.name, (totals.get(region.name) ?? 0) + exercise.sets);
    }
  }
  let best: string | null = null;
  let score = 0;
  for (const [name, value] of totals) {
    if (value > score) {
      best = name;
      score = value;
    }
  }
  return best;
}

function heavyLower(day: MapFlowDay) {
  return exercisesOf(day).some(exercise => {
    if (exerciseRestClass[exercise.exerciseId] !== 'heavy-compound') return false;
    return muscleMapFor(exercise.exerciseId).main.some(area => legMains.has(area));
  });
}

function supersetLabels(day: MapFlowDay) {
  const counts = new Map<string, number>();
  for (const flow of day.flows) {
    const gym = gymFlowById(flow.id);
    if (!gym) continue;
    for (const item of gym.items) {
      if (!item.superset) continue;
      counts.set(item.superset, (counts.get(item.superset) ?? 0) + 1);
    }
  }
  return [...counts.values()].some(count => count >= 2);
}

function trainingDay(day: MapFlowDay) {
  return day.effort !== 'rest' && day.effort !== 'easy' && day.flows.length > 0;
}

/**
 * Plain-language problems when a pattern breaks its style.
 * An empty list means the pattern matches the rules.
 */
export function styleProblems(styleId: string, days: readonly MapFlowDay[]) {
  const style = mapFlowStyleById(styleId);
  if (!style) return ['Unknown style.'];
  const problems: string[] = [];
  const length = days.length;
  for (const rule of style.rules) {
    if (rule.kind === 'rest-or-easy') {
      if (!days.some(day => day.effort === 'rest' || day.effort === 'easy' || day.flows.length === 0))
        problems.push('The pattern needs a rest or easy day.');
      continue;
    }
    if (rule.kind === 'same-region-gap') {
      for (let index = 0; index < length; index += 1) {
        const left = primaryRegion(days[index]);
        const right = primaryRegion(days[(index + 1) % length]);
        if (left && left === right) problems.push(`${days[index].name} and the next day both work ${left.toLowerCase()}.`);
      }
      continue;
    }
    if (rule.kind === 'training-gap') {
      for (let index = 0; index < length; index += 1) {
        if (trainingDay(days[index]) && trainingDay(days[(index + 1) % length]))
          problems.push(`${days[index].name} sits next to another training day.`);
      }
      continue;
    }
    if (rule.kind === 'paired-sets') {
      for (const day of days) {
        if (!trainingDay(day)) continue;
        if (!supersetLabels(day)) problems.push(`${day.name} does not pair exercises.`);
      }
      continue;
    }
    if (rule.kind === 'straight-sets') {
      for (const day of days) {
        if (trainingDay(day) && supersetLabels(day)) problems.push(`${day.name} pairs exercises.`);
      }
      continue;
    }
    const heavy = days.flatMap((day, index) => (day.effort === 'heavy-lower' ? [index] : []));
    const runs = days.flatMap((day, index) => (day.effort === 'hard-run' ? [index] : []));
    if (!heavy.length || !runs.length) {
      problems.push('Hybrid needs a heavy lower-body day and a hard run.');
      continue;
    }
    for (const index of heavy) {
      if (!heavyLower(days[index])) problems.push(`${days[index].name} is not heavy lower-body work.`);
    }
    for (const index of runs) {
      const day = days[index];
      if (heavyLower(day)) problems.push(`${day.name} puts heavy lower-body work on the run.`);
      if (!day.flows.some(flow => rule.hardRunFlowIds.includes(flow.id))) problems.push(`${day.name} has no run.`);
    }
    for (const from of heavy) {
      for (const to of runs) {
        if (from === to) {
          problems.push('Heavy lower-body work and a hard run share a day.');
          continue;
        }
        const forward = (to - from + length) % length;
        const back = (from - to + length) % length;
        const steps = Math.min(forward, back);
        const start = forward <= back ? from : to;
        if (steps <= 1) {
          problems.push('Heavy lower-body work sits next to a hard run.');
          continue;
        }
        let buffered = false;
        for (let step = 1; step < steps; step += 1) {
          const effort = days[(start + step) % length].effort;
          if (rule.buffer.includes(effort as 'rest' | 'easy' | 'upper')) buffered = true;
        }
        if (!buffered) problems.push('Put a rest day, an easy day, or an upper-body day between heavy lower-body work and a hard run.');
      }
    }
  }
  return [...new Set(problems)];
}

export type { FlowLevel, TrainPlace, PlannedFlow };
