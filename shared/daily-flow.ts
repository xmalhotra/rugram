/**
 * One day of a Daily flow: the flows on the calendar and the lifestyle items,
 * in one list. A flow is done when it has been done. An item is done when every
 * serving for that day is ticked. Nothing here writes or drops a stored row.
 *
 * Order is the clock time, then the checkpoint. An entry with a clock uses that
 * time. An entry without one sits at its checkpoint, so Wake up still comes
 * before Morning, and a flow set to 7:00 still lands at 7:00.
 */
import type { DailyChecks, DailyCheckpoint } from './daily-checks';
import { dailySlot } from './daily-checks';
import type { SeriesItemKind, SeriesOccurrence, SeriesTime } from './flow-series';
import { routineCheckpoints } from './routines';

export type DailyFlowEntry =
  | {
      kind: 'flow';
      seriesId: string;
      itemKind: SeriesItemKind;
      itemId: string;
      version?: number;
      date: string;
      original: string;
      time: SeriesTime;
      moved: boolean;
      status: 'open' | 'done';
    }
  | {
      kind: 'item';
      id: string;
      name: string;
      checkpoint: DailyCheckpoint;
      timesPerDay: number;
      ticked: number;
      routineId?: string;
      status: 'open' | 'done';
    };

/** Where an unticked checkpoint sits when nobody set a clock. */
const checkpointMinutes: Record<DailyCheckpoint, number> = {
  'Wake up': 6 * 60,
  Morning: 8 * 60,
  'Mid-morning': 10 * 60 + 30,
  Lunch: 13 * 60,
  Afternoon: 15 * 60,
  'Pre-workout': 17 * 60,
  'Post-workout': 18 * 60 + 30,
  Dinner: 20 * 60,
  'Before bed': 22 * 60,
  anytime: 23 * 60 + 59,
};

const checkpointIndex = new Map<DailyCheckpoint, number>([
  ...routineCheckpoints.map((name, index) => [name, index] as const),
  ['anytime', routineCheckpoints.length],
]);

function clockMinutes(at: string | undefined) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(at ?? '');
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function checkpointOf(checkpoint: DailyCheckpoint) {
  return checkpointIndex.get(checkpoint) ?? routineCheckpoints.length;
}

type Ranked = { entry: DailyFlowEntry; minutes: number; checkpoint: number; kind: number; index: number };

/**
 * The day's flows and items, earliest first.
 * Occurrences on another date are left out. Ticks are read for `date` only.
 * An empty list is a rest day: nothing was stored for it.
 */
export function dailyFlowDay(date: string, occurrences: readonly SeriesOccurrence[], checks: DailyChecks): DailyFlowEntry[] {
  const ranked: Ranked[] = [];
  occurrences.forEach((occurrence, index) => {
    if (occurrence.date !== date) return;
    const checkpoint = occurrence.time.checkpoint;
    ranked.push({
      entry: {
        kind: 'flow',
        seriesId: occurrence.seriesId,
        itemKind: occurrence.itemKind,
        itemId: occurrence.itemId,
        ...(occurrence.version != null ? { version: occurrence.version } : {}),
        date: occurrence.date,
        original: occurrence.original,
        time: occurrence.time,
        moved: occurrence.moved,
        status: occurrence.status,
      },
      minutes: clockMinutes(occurrence.time.at) ?? checkpointMinutes[checkpoint],
      checkpoint: checkpointOf(checkpoint),
      kind: 0,
      index,
    });
  });
  checks.items.forEach((item, index) => {
    const checkpoint = dailySlot(item);
    const ticked = checks.ticks[date]?.[item.id] ?? 0;
    ranked.push({
      entry: {
        kind: 'item',
        id: item.id,
        name: item.name,
        checkpoint,
        timesPerDay: item.timesPerDay,
        ticked,
        ...(item.routineId ? { routineId: item.routineId } : {}),
        status: ticked >= item.timesPerDay ? 'done' : 'open',
      },
      minutes: checkpointMinutes[checkpoint],
      checkpoint: checkpointOf(checkpoint),
      kind: 1,
      index,
    });
  });
  ranked.sort(
    (a, b) => a.minutes - b.minutes || a.checkpoint - b.checkpoint || a.kind - b.kind || a.index - b.index,
  );
  return ranked.map(row => row.entry);
}

export type DailyFlowAddLevel = {
  /** The gym flow this level runs. */
  id: string;
  level: string;
  minutes: number;
  exercises: number;
  reason?: string;
};

export type DailyFlowAddSource = DailyFlowAddLevel & {
  name: string;
  /** Body part, or the catalogue group when the flow is not one muscle. */
  body: string;
};

export type DailyFlowAddRow = {
  name: string;
  body: string;
  levels: DailyFlowAddLevel[];
};

export type DailyFlowAddList = {
  suggested: DailyFlowAddRow[];
  groups: { body: string; rows: DailyFlowAddRow[] }[];
};

const levelOrder = ['Beginner', 'Intermediate', 'Advanced'];

/** Catalogue groups, in the order a member scans a body. */
const bodyOrder = [
  'Back',
  'Biceps',
  'Chest',
  'Triceps',
  'Shoulders',
  'Legs',
  'Core',
  'Arms',
  'Supersets',
  'Full Body',
  'Splits',
  'Upper Body',
];

function levelRank(level: string) {
  const index = levelOrder.indexOf(level);
  return index < 0 ? levelOrder.length : index;
}

function bodyRank(body: string) {
  const index = bodyOrder.indexOf(body);
  return index < 0 ? bodyOrder.length : index;
}

/**
 * One row per flow name. Levels of the same name share that row.
 * A row with a reason is suggested, and is not repeated under its body part.
 */
export function dailyFlowAddList(sources: readonly DailyFlowAddSource[]): DailyFlowAddList {
  const rows = new Map<string, DailyFlowAddRow>();
  for (const source of sources) {
    const key = `${source.body}\0${source.name}`;
    const level: DailyFlowAddLevel = {
      id: source.id,
      level: source.level,
      minutes: source.minutes,
      exercises: source.exercises,
      ...(source.reason ? { reason: source.reason } : {}),
    };
    const existing = rows.get(key);
    if (!existing) {
      rows.set(key, { name: source.name, body: source.body, levels: [level] });
      continue;
    }
    if (existing.levels.some(item => item.id === level.id || item.level === level.level)) continue;
    existing.levels.push(level);
  }
  const list = [...rows.values()];
  for (const row of list) {
    row.levels.sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.level.localeCompare(b.level));
  }
  const suggested = list.filter(row => row.levels.some(level => level.reason));
  const rest = list.filter(row => !suggested.includes(row));
  const byBody = new Map<string, DailyFlowAddRow[]>();
  for (const row of rest) {
    const group = byBody.get(row.body) ?? [];
    group.push(row);
    byBody.set(row.body, group);
  }
  const names = [...byBody.keys()].sort((a, b) => bodyRank(a) - bodyRank(b) || a.localeCompare(b));
  return { suggested, groups: names.map(body => ({ body, rows: byBody.get(body) ?? [] })) };
}
