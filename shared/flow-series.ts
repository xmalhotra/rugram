/**
 * A flow or session on a member's routine, as a calendar series.
 * It happens once or repeats, at a checkpoint and an optional clock time.
 * One occurrence can be skipped or moved without changing the series.
 * Dates are plain local dates (YYYY-MM-DD), with no time zones.
 */
import { z } from 'zod';
import { routineCheckpoints, type RoutineCheckpoint } from './routines';

export type { RoutineCheckpoint as Checkpoint } from './routines';

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export type SeriesTime = { checkpoint: RoutineCheckpoint; at?: string };

export type Recurrence =
  | { kind: 'once' }
  | { kind: 'daily'; every: number }
  | { kind: 'weekdays' }
  | { kind: 'weekly'; every: number; days: number[] }
  | { kind: 'monthly'; every: number; by: 'date' };

export type SeriesEnd = { kind: 'never' } | { kind: 'on'; date: string } | { kind: 'after'; count: number };

export type SeriesItemKind = 'flow' | 'session' | 'community';

export type FlowSeries = {
  id: string;
  itemKind: SeriesItemKind;
  itemId: string;
  /** The published version a community flow keeps running. Absent for Qram flows and sessions. */
  version?: number;
  /** The Map flow this series belongs to. Absent on rows saved before Map flows. */
  mapFlowId?: string;
  start: string;
  time: SeriesTime;
  recurrence: Recurrence;
  end: SeriesEnd;
  createdAt: string;
};

/** A change to one occurrence. `date` is the original date, before any move. */
export type SeriesException = {
  seriesId: string;
  date: string;
  change: 'skip' | { date?: string; time?: SeriesTime };
};

/** A finished flow run or a done training log, on the calendar date it counts. */
export type SeriesCompletion = {
  itemKind: SeriesItemKind;
  itemId: string;
  date: string;
};

export type SeriesOccurrence = {
  seriesId: string;
  itemKind: SeriesItemKind;
  itemId: string;
  /** Copied from the series, so a community row knows which version it runs. */
  version?: number;
  date: string;
  time: SeriesTime;
  /** The date this occurrence had before a move. */
  original: string;
  moved: boolean;
  /** Done when a completion matches this kind and id on `date` (after a move). */
  status: 'open' | 'done';
};

type Parts = { y: number; m: number; d: number; utc: number };

function parts(iso: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = Date.UTC(y, m - 1, d);
  const date = new Date(utc);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return { y, m, d, utc };
}

function stamp(y: number, m: number, d: number) {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const calendarDateSchema = z.string().refine((value): value is string => parts(value) !== null, 'Check the date.');

const clockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const seriesTimeSchema = z
  .object({
    checkpoint: z.enum(routineCheckpoints),
    at: clockSchema.optional(),
  })
  .strict();

const weekdayNumber = z.number().int().min(1).max(7);

export const recurrenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('once') }).strict(),
  z.object({ kind: z.literal('daily'), every: z.number().int().min(1).max(30) }).strict(),
  z.object({ kind: z.literal('weekdays') }).strict(),
  z
    .object({
      kind: z.literal('weekly'),
      every: z.number().int().min(1).max(12),
      days: z.array(weekdayNumber).min(1).max(7),
    })
    .strict(),
  z
    .object({
      kind: z.literal('monthly'),
      every: z.number().int().min(1).max(12),
      by: z.literal('date'),
    })
    .strict(),
]);

export const seriesEndSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('never') }).strict(),
  z.object({ kind: z.literal('on'), date: calendarDateSchema }).strict(),
  z.object({ kind: z.literal('after'), count: z.number().int().min(1).max(365) }).strict(),
]);

export const flowSeriesSchema = z
  .object({
    id: z.string().uuid(),
    itemKind: z.enum(['flow', 'session', 'community']),
    itemId: z.string().trim().min(1).max(120),
    version: z.number().int().min(1).max(10000).optional(),
    mapFlowId: z.string().uuid().optional(),
    start: calendarDateSchema,
    time: seriesTimeSchema,
    recurrence: recurrenceSchema,
    end: seriesEndSchema,
    createdAt: z.string().min(10),
  })
  .strict()
  .superRefine((series, ctx) => {
    if (series.recurrence.kind === 'weekly' && new Set(series.recurrence.days).size !== series.recurrence.days.length)
      ctx.addIssue({ code: 'custom', message: 'Each day is listed once.', path: ['recurrence', 'days'] });
    if (series.itemKind === 'community' && series.version == null)
      ctx.addIssue({ code: 'custom', message: 'Choose a version.', path: ['version'] });
    if (series.itemKind !== 'community' && series.version != null)
      ctx.addIssue({ code: 'custom', message: 'Only a community flow keeps a version.', path: ['version'] });
  });

const moveSchema = z
  .object({
    date: calendarDateSchema.optional(),
    time: seriesTimeSchema.optional(),
  })
  .strict();

export const seriesExceptionSchema = z
  .object({
    seriesId: z.string().uuid(),
    date: calendarDateSchema,
    change: z.union([z.literal('skip'), moveSchema]),
  })
  .strict();

/** Monday is 1 and Sunday is 7. */
export function calendarWeekday(iso: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const parsed = parts(iso);
  const js = parsed ? new Date(parsed.utc).getUTCDay() : 1;
  return (js === 0 ? 7 : js) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function addCalendarDays(iso: string, days: number) {
  const parsed = parts(iso);
  if (!parsed) return iso;
  const next = new Date(parsed.utc + days * 86400000);
  return stamp(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function shiftCalendarMonth(iso: string, delta: number) {
  const parsed = parts(iso);
  if (!parsed) return iso;
  const index = parsed.y * 12 + (parsed.m - 1) + delta;
  const year = Math.floor(index / 12);
  const month = index - year * 12 + 1;
  return stamp(year, month, 1);
}

/** Inclusive day count, or null when a date is impossible or `from` is after `to`. */
export function inclusiveSpan(from: string, to: string) {
  const start = parts(from);
  const end = parts(to);
  if (!start || !end || end.utc < start.utc) return null;
  return Math.round((end.utc - start.utc) / 86400000) + 1;
}

/** "Mon 9 Nov" */
export function formatSeriesDate(iso: string) {
  const parsed = parts(iso);
  if (!parsed) return iso;
  return `${weekdayNames[calendarWeekday(iso) - 1]} ${parsed.d} ${monthNames[parsed.m - 1]}`;
}

/** "6:30 AM" from a 24-hour clock time. */
export function formatSeriesClock(at: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(at);
  if (!match) return at;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}

function formatEnd(iso: string) {
  const parsed = parts(iso);
  if (!parsed) return iso;
  return `${parsed.d} ${monthNames[parsed.m - 1]}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  return { y, m: index - y * 12 + 1 };
}

function weekIndex(start: string, date: string) {
  const startMonday = addCalendarDays(start, 1 - calendarWeekday(start));
  const dateMonday = addCalendarDays(date, 1 - calendarWeekday(date));
  const a = parts(startMonday);
  const b = parts(dateMonday);
  if (!a || !b) return 0;
  return Math.round((b.utc - a.utc) / (7 * 86400000));
}

/** Dates the series would produce through `cap`, before exceptions. `count` stops after that many. */
function expand(series: FlowSeries, cap: string | null, count: number | null) {
  const dates: string[] = [];
  const recurrence = series.recurrence;
  if (!parts(series.start)) return dates;
  if (recurrence.kind === 'once') {
    if ((!cap || series.start <= cap) && (count === null || count >= 1)) dates.push(series.start);
    return dates;
  }
  if (recurrence.kind === 'daily') {
    for (let date = series.start, guard = 0; guard < 20000; guard += 1) {
      if (cap && date > cap) break;
      if (count !== null && dates.length >= count) break;
      dates.push(date);
      date = addCalendarDays(date, recurrence.every);
    }
    return dates;
  }
  if (recurrence.kind === 'monthly') {
    const start = parts(series.start);
    if (!start) return dates;
    const capParts = cap ? parts(cap) : null;
    for (let step = 0; step < 2400; step += 1) {
      if (count !== null && dates.length >= count) break;
      const shifted = addMonths(start.y, start.m, step * recurrence.every);
      if (capParts && (shifted.y > capParts.y || (shifted.y === capParts.y && shifted.m > capParts.m))) break;
      if (start.d > daysInMonth(shifted.y, shifted.m)) continue;
      const date = stamp(shifted.y, shifted.m, start.d);
      if (date < series.start) continue;
      if (cap && date > cap) break;
      dates.push(date);
    }
    return dates;
  }
  for (let date = series.start, guard = 0; guard < 20000; guard += 1) {
    if (cap && date > cap) break;
    if (count !== null && dates.length >= count) break;
    const weekday = calendarWeekday(date);
    const hit =
      recurrence.kind === 'weekdays'
        ? weekday <= 5
        : recurrence.days.includes(weekday) && weekIndex(series.start, date) % recurrence.every === 0;
    if (hit) dates.push(date);
    date = addCalendarDays(date, 1);
  }
  return dates;
}

function sameTime(a: SeriesTime, b: SeriesTime) {
  return a.checkpoint === b.checkpoint && a.at === b.at;
}

type OccurrenceDraft = Omit<SeriesOccurrence, 'status'>;

/**
 * Occurrences in the inclusive range, after exceptions.
 * A count end counts occurrences before exceptions, so a skip does not grow a replacement.
 * A move can leave this range or arrive from outside it.
 * A completion marks the occurrence done only on its actual date, after a move.
 */
export function occurrences(
  seriesList: FlowSeries[],
  exceptions: SeriesException[],
  from: string,
  to: string,
  completions: SeriesCompletion[] = [],
): SeriesOccurrence[] {
  if (inclusiveSpan(from, to) === null) return [];
  const done = new Set(completions.map(item => `${item.itemKind}:${item.itemId}:${item.date}`));
  const rows: SeriesOccurrence[] = [];
  for (const series of seriesList) {
    if (!parts(series.start)) continue;
    const own = exceptions.filter(exception => exception.seriesId === series.id);
    let cap: string | null = to;
    for (const exception of own) if (exception.date > cap) cap = exception.date;
    let count: number | null = null;
    if (series.end.kind === 'after') {
      count = series.end.count;
      cap = null;
    } else if (series.end.kind === 'on' && series.end.date < cap) cap = series.end.date;
    const drafts: OccurrenceDraft[] = expand(series, cap, count).map(date => ({
      seriesId: series.id,
      itemKind: series.itemKind,
      itemId: series.itemId,
      ...(series.version != null ? { version: series.version } : {}),
      date,
      time: series.time,
      original: date,
      moved: false,
    }));
    for (const exception of own) {
      const index = drafts.findIndex(item => item.original === exception.date);
      if (index < 0) continue;
      if (exception.change === 'skip') {
        drafts.splice(index, 1);
        continue;
      }
      const next = drafts[index];
      if (!next) continue;
      if (exception.change.date && exception.change.date !== next.date) {
        next.date = exception.change.date;
        next.moved = true;
      }
      if (exception.change.time) {
        if (!sameTime(next.time, exception.change.time)) next.moved = true;
        next.time = exception.change.time;
      }
    }
    for (const draft of drafts) {
      if (draft.date < from || draft.date > to) continue;
      rows.push({
        ...draft,
        status: done.has(`${draft.itemKind}:${draft.itemId}:${draft.date}`) ? 'done' : 'open',
      });
    }
  }
  const checkpointOrder = new Map(routineCheckpoints.map((name, index) => [name, index]));
  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const checkpoint = (checkpointOrder.get(a.time.checkpoint) ?? 99) - (checkpointOrder.get(b.time.checkpoint) ?? 99);
    if (checkpoint) return checkpoint;
    const clock = (a.time.at ?? '').localeCompare(b.time.at ?? '');
    if (clock) return clock;
    return a.seriesId.localeCompare(b.seriesId) || a.original.localeCompare(b.original);
  });
  return rows;
}

/** Plain English for the series, in the style of a Teams meeting. */
export function describeRecurrence(series: FlowSeries) {
  const recurrence = series.recurrence;
  let body = 'Every day';
  if (recurrence.kind === 'once') body = `Once on ${formatSeriesDate(series.start)}`;
  else if (recurrence.kind === 'daily') body = recurrence.every === 1 ? 'Every day' : `Every ${recurrence.every} days`;
  else if (recurrence.kind === 'weekdays') body = 'Every weekday';
  else if (recurrence.kind === 'weekly') {
    const names = [...recurrence.days]
      .sort((a, b) => a - b)
      .map(day => weekdayNames[day - 1] ?? '')
      .filter(Boolean)
      .join(', ');
    body = recurrence.every === 1 ? `Every week on ${names}` : `Every ${recurrence.every} weeks on ${names}`;
  } else {
    const day = parts(series.start)?.d ?? 1;
    body = recurrence.every === 1 ? `Every month on day ${day}` : `Every ${recurrence.every} months on day ${day}`;
  }
  if (series.end.kind === 'on') return `${body} until ${formatEnd(series.end.date)}`;
  if (series.end.kind === 'after') {
    const word = series.end.count === 1 ? 'time' : 'times';
    return `${body}, ${series.end.count} ${word}`;
  }
  return body;
}
