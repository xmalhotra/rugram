import { z } from 'zod';
import { trainingCatalog } from '../../shared/training-seed';
import { gymFlowById } from '../../shared/gym-flows';
import { knownFlowIds } from '../../shared/training';
import {
  calendarDateSchema,
  flowSeriesSchema,
  inclusiveSpan,
  occurrences,
  recurrenceSchema,
  seriesEndSchema,
  seriesExceptionSchema,
  seriesTimeSchema,
  type FlowSeries,
  type SeriesException,
  type SeriesOccurrence,
} from '../../shared/flow-series';
import { communitySnapshot } from './community-snapshot';
import { demoModeEnabled } from './runtime-config';
import { routineCompletions } from './training-store';
import type { PublicUser } from './types';

export class FlowSeriesError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const seriesRangeDays = 62;
const seriesLimit = 100;

const draftSchema = z
  .object({
    itemKind: z.enum(['flow', 'session', 'community']),
    itemId: z.string().trim().min(1).max(120),
    version: z.number().int().min(1).max(10000).optional(),
    start: calendarDateSchema,
    time: seriesTimeSchema,
    recurrence: recurrenceSchema,
    end: seriesEndSchema,
  })
  .strict();

const moveToSchema = z
  .object({
    date: calendarDateSchema.optional(),
    time: seriesTimeSchema.optional(),
  })
  .strict();

export const seriesActionSchema = z.discriminatedUnion('action', [
  draftSchema.extend({ action: z.literal('create') }).strict(),
  draftSchema
    .partial()
    .extend({ action: z.literal('update-series'), id: z.uuid() })
    .strict(),
  z.object({ action: z.literal('delete-series'), id: z.uuid() }).strict(),
  z.object({ action: z.literal('skip-one'), seriesId: z.uuid(), date: calendarDateSchema }).strict(),
  z.object({ action: z.literal('move-one'), seriesId: z.uuid(), date: calendarDateSchema, to: moveToSchema }).strict(),
  z.object({ action: z.literal('restore-one'), seriesId: z.uuid(), date: calendarDateSchema }).strict(),
]);

export type SeriesAction = z.infer<typeof seriesActionSchema>;

type Memory = { series: { userId: string; series: FlowSeries }[]; exceptions: SeriesException[] };

declare global {
  var qramFlowSeries: Memory | undefined;
}

function demo(flag?: boolean) {
  return flag ?? demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramFlowSeries ??= { series: [], exceptions: [] });
}

function asDate(value: unknown) {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
  return match?.[1] ?? String(value);
}

function asJson(value: unknown) {
  if (typeof value === 'string') return JSON.parse(value) as unknown;
  return value;
}

function asInstant(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function demoSessionIds() {
  const stored = (globalThis as { qramTraining?: { sessions: { id: string }[] } }).qramTraining?.sessions;
  return new Set((stored ?? trainingCatalog().sessions).map(session => session.id));
}

async function assertItem(
  kind: FlowSeries['itemKind'],
  id: string,
  version: number | undefined,
  useDemo: boolean,
) {
  if (kind === 'community') {
    const found = await communitySnapshot(id, version, useDemo);
    if (found === 'missing') throw new FlowSeriesError('Unknown flow.');
    if (found === 'version') throw new FlowSeriesError('That version is no longer available.');
    return;
  }
  if (kind === 'flow') {
    if (!knownFlowIds().has(id) && !gymFlowById(id)) throw new FlowSeriesError('Unknown flow.');
    return;
  }
  if (useDemo) {
    if (!demoSessionIds().has(id)) throw new FlowSeriesError('Unknown session.');
    return;
  }
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT id FROM training_sessions WHERE id=${id} LIMIT 1`;
  if (!rows.length) throw new FlowSeriesError('Unknown session.');
}

function owned(user: PublicUser, id: string) {
  return memory().series.find(row => row.userId === user.id && row.series.id === id)?.series ?? null;
}

function requireOwned(user: PublicUser, id: string) {
  const series = owned(user, id);
  if (!series) throw new FlowSeriesError('Series not found.', 404);
  return series;
}

function readMemory(user: PublicUser): FlowSeries[] {
  return memory()
    .series.filter(row => row.userId === user.id)
    .map(row => row.series)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

function exceptionsFor(user: PublicUser) {
  const ids = new Set(readMemory(user).map(series => series.id));
  return memory().exceptions.filter(exception => ids.has(exception.seriesId));
}

function putException(exception: SeriesException) {
  const list = memory().exceptions.filter(row => !(row.seriesId === exception.seriesId && row.date === exception.date));
  list.push(exception);
  memory().exceptions = list;
}

function checkDraft(input: z.infer<typeof draftSchema>) {
  const parsed = flowSeriesSchema.safeParse({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    itemKind: input.itemKind,
    itemId: input.itemId,
    ...(input.version != null ? { version: input.version } : {}),
    start: input.start,
    time: input.time,
    recurrence: input.recurrence,
    end: input.end,
  });
  if (!parsed.success) throw new FlowSeriesError('Check the series and try again.');
}

function onSchedule(series: FlowSeries, date: string) {
  return occurrences([series], [], date, date).length > 0;
}

function patched(current: FlowSeries, patch: { itemKind?: FlowSeries['itemKind']; itemId?: string; version?: number; start?: string; time?: FlowSeries['time']; recurrence?: FlowSeries['recurrence']; end?: FlowSeries['end'] }) {
  if (
    patch.itemKind === undefined &&
    patch.itemId === undefined &&
    patch.version === undefined &&
    patch.start === undefined &&
    patch.time === undefined &&
    patch.recurrence === undefined &&
    patch.end === undefined
  )
    throw new FlowSeriesError('Check the series and try again.');
  const next: FlowSeries = {
    ...current,
    ...(patch.itemKind ? { itemKind: patch.itemKind } : {}),
    ...(patch.itemId ? { itemId: patch.itemId } : {}),
    ...(patch.version !== undefined ? { version: patch.version } : {}),
    ...(patch.start ? { start: patch.start } : {}),
    ...(patch.time ? { time: patch.time } : {}),
    ...(patch.recurrence ? { recurrence: patch.recurrence } : {}),
    ...(patch.end ? { end: patch.end } : {}),
  };
  if (next.itemKind !== 'community') delete next.version;
  return next;
}

async function applyMemory(user: PublicUser, action: SeriesAction) {
  if (action.action === 'create') {
    checkDraft(action);
    await assertItem(action.itemKind, action.itemId, action.version, true);
    if (readMemory(user).length >= seriesLimit) throw new FlowSeriesError('You can keep up to 100 series.');
    const series: FlowSeries = {
      id: crypto.randomUUID(),
      itemKind: action.itemKind,
      itemId: action.itemId,
      ...(action.version != null ? { version: action.version } : {}),
      start: action.start,
      time: action.time,
      recurrence: action.recurrence,
      end: action.end,
      createdAt: new Date().toISOString(),
    };
    memory().series.push({ userId: user.id, series });
    return;
  }
  if (action.action === 'update-series') {
    const current = requireOwned(user, action.id);
    const next = patched(current, action);
    checkDraft(next);
    await assertItem(next.itemKind, next.itemId, next.version, true);
    const row = memory().series.find(item => item.userId === user.id && item.series.id === current.id);
    if (row) row.series = next;
    return;
  }
  if (action.action === 'delete-series') {
    requireOwned(user, action.id);
    memory().series = memory().series.filter(row => !(row.userId === user.id && row.series.id === action.id));
    memory().exceptions = memory().exceptions.filter(row => row.seriesId !== action.id);
    return;
  }
  if (action.action === 'skip-one') {
    const series = requireOwned(user, action.seriesId);
    if (!onSchedule(series, action.date)) throw new FlowSeriesError("That date isn't on this series.");
    putException({ seriesId: series.id, date: action.date, change: 'skip' });
    return;
  }
  if (action.action === 'move-one') {
    const series = requireOwned(user, action.seriesId);
    if (!action.to.date && !action.to.time) throw new FlowSeriesError('Check the series and try again.');
    if (!onSchedule(series, action.date)) throw new FlowSeriesError("That date isn't on this series.");
    const parsed = seriesExceptionSchema.safeParse({ seriesId: series.id, date: action.date, change: action.to });
    if (!parsed.success) throw new FlowSeriesError('Check the series and try again.');
    putException(parsed.data);
    return;
  }
  const series = requireOwned(user, action.seriesId);
  memory().exceptions = memory().exceptions.filter(row => !(row.seriesId === series.id && row.date === action.date));
}

function mapSeries(row: Record<string, unknown>): FlowSeries | null {
  const parsed = flowSeriesSchema.safeParse({
    id: String(row.id),
    itemKind: row.item_kind,
    itemId: String(row.item_id),
    ...(row.item_version == null ? {} : { version: Number(row.item_version) }),
    ...(row.map_flow_id == null ? {} : { mapFlowId: String(row.map_flow_id) }),
    start: asDate(row.start_date),
    time: asJson(row.time),
    recurrence: asJson(row.recurrence),
    end: asJson(row.series_end),
    createdAt: asInstant(row.created_at),
  });
  return parsed.success ? parsed.data : null;
}

function mapException(row: Record<string, unknown>): SeriesException | null {
  const parsed = seriesExceptionSchema.safeParse({
    seriesId: String(row.series_id),
    date: asDate(row.occurrence_date),
    change: asJson(row.change),
  });
  return parsed.success ? parsed.data : null;
}

async function readDatabase(user: PublicUser) {
  const sql = (await import('./database')).database();
  const [seriesRows, exceptionRows] = await Promise.all([
    sql`SELECT id, item_kind, item_id, item_version, map_flow_id, start_date, time, recurrence, series_end, created_at FROM flow_series WHERE user_id=${user.id} ORDER BY created_at, id`,
    sql`SELECT e.series_id, e.occurrence_date, e.change FROM flow_series_exceptions e JOIN flow_series s ON s.id=e.series_id WHERE s.user_id=${user.id}`,
  ]);
  return {
    series: seriesRows.map(mapSeries).filter((row): row is FlowSeries => row !== null),
    exceptions: exceptionRows.map(mapException).filter((row): row is SeriesException => row !== null),
  };
}

async function ownedDatabase(user: PublicUser, id: string) {
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT id, item_kind, item_id, item_version, map_flow_id, start_date, time, recurrence, series_end, created_at FROM flow_series WHERE id=${id} AND user_id=${user.id} LIMIT 1`;
  return rows[0] ? mapSeries(rows[0]) : null;
}

async function applyDatabase(user: PublicUser, action: SeriesAction) {
  const sql = (await import('./database')).database();
  if (action.action === 'create') {
    checkDraft(action);
    await assertItem(action.itemKind, action.itemId, action.version, false);
    const count = await sql`SELECT count(*)::int AS count FROM flow_series WHERE user_id=${user.id}`;
    if (Number(count[0]?.count ?? 0) >= seriesLimit) throw new FlowSeriesError('You can keep up to 100 series.');
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await sql`INSERT INTO flow_series (id, user_id, item_kind, item_id, item_version, map_flow_id, start_date, time, recurrence, series_end, created_at, updated_at)
      VALUES (${id}, ${user.id}, ${action.itemKind}, ${action.itemId}, ${action.version ?? null}, ${null}, ${action.start}, ${JSON.stringify(action.time)}::jsonb, ${JSON.stringify(action.recurrence)}::jsonb, ${JSON.stringify(action.end)}::jsonb, ${createdAt}, ${createdAt})`;
    return;
  }
  if (action.action === 'update-series') {
    const current = await ownedDatabase(user, action.id);
    if (!current) throw new FlowSeriesError('Series not found.', 404);
    const next = patched(current, action);
    checkDraft(next);
    await assertItem(next.itemKind, next.itemId, next.version, false);
    await sql`UPDATE flow_series SET item_kind=${next.itemKind}, item_id=${next.itemId}, item_version=${next.version ?? null}, start_date=${next.start}, time=${JSON.stringify(next.time)}::jsonb, recurrence=${JSON.stringify(next.recurrence)}::jsonb, series_end=${JSON.stringify(next.end)}::jsonb, updated_at=${new Date().toISOString()} WHERE id=${next.id} AND user_id=${user.id}`;
    return;
  }
  if (action.action === 'delete-series') {
    const current = await ownedDatabase(user, action.id);
    if (!current) throw new FlowSeriesError('Series not found.', 404);
    await sql`DELETE FROM flow_series WHERE id=${action.id} AND user_id=${user.id}`;
    return;
  }
  if (action.action === 'skip-one' || action.action === 'move-one' || action.action === 'restore-one') {
    const series = await ownedDatabase(user, action.seriesId);
    if (!series) throw new FlowSeriesError('Series not found.', 404);
    if (action.action === 'restore-one') {
      await sql`DELETE FROM flow_series_exceptions WHERE series_id=${series.id} AND occurrence_date=${action.date}`;
      return;
    }
    if (!onSchedule(series, action.date)) throw new FlowSeriesError("That date isn't on this series.");
    if (action.action === 'skip-one') {
      const change = JSON.stringify('skip');
      await sql`INSERT INTO flow_series_exceptions (series_id, occurrence_date, change) VALUES (${series.id}, ${action.date}, ${change}::jsonb)
        ON CONFLICT (series_id, occurrence_date) DO UPDATE SET change=EXCLUDED.change`;
      return;
    }
    if (!action.to.date && !action.to.time) throw new FlowSeriesError('Check the series and try again.');
    const parsed = seriesExceptionSchema.safeParse({ seriesId: series.id, date: action.date, change: action.to });
    if (!parsed.success) throw new FlowSeriesError('Check the series and try again.');
    await sql`INSERT INTO flow_series_exceptions (series_id, occurrence_date, change) VALUES (${series.id}, ${action.date}, ${JSON.stringify(action.to)}::jsonb)
      ON CONFLICT (series_id, occurrence_date) DO UPDATE SET change=EXCLUDED.change`;
  }
}

export async function loadFlowSeries(user: PublicUser, useDemo?: boolean) {
  const activeDemo = demo(useDemo);
  return activeDemo ? { series: readMemory(user), exceptions: exceptionsFor(user) } : readDatabase(user);
}

/** Stores a series the follow chose an id for. A Map flow id is set when the member has one. */
export async function saveOwnedSeries(user: PublicUser, series: FlowSeries, useDemo?: boolean) {
  const parsed = flowSeriesSchema.safeParse(series);
  if (!parsed.success) throw new FlowSeriesError('Check the series and try again.');
  const activeDemo = demo(useDemo);
  await assertItem(parsed.data.itemKind, parsed.data.itemId, parsed.data.version, activeDemo);
  if (activeDemo) {
    if (readMemory(user).length >= seriesLimit) throw new FlowSeriesError('You can keep up to 100 series.');
    memory().series.push({ userId: user.id, series: parsed.data });
    return;
  }
  const sql = (await import('./database')).database();
  const count = await sql`SELECT count(*)::int AS count FROM flow_series WHERE user_id=${user.id}`;
  if (Number(count[0]?.count ?? 0) >= seriesLimit) throw new FlowSeriesError('You can keep up to 100 series.');
  await sql`INSERT INTO flow_series (id, user_id, item_kind, item_id, item_version, map_flow_id, start_date, time, recurrence, series_end, created_at, updated_at)
    VALUES (${parsed.data.id}, ${user.id}, ${parsed.data.itemKind}, ${parsed.data.itemId}, ${parsed.data.version ?? null}, ${parsed.data.mapFlowId ?? null}, ${parsed.data.start}, ${JSON.stringify(parsed.data.time)}::jsonb, ${JSON.stringify(parsed.data.recurrence)}::jsonb, ${JSON.stringify(parsed.data.end)}::jsonb, ${parsed.data.createdAt}, ${parsed.data.createdAt})`;
}

/** Stores a series that already belongs to a Map flow. The id is the one the copy chose. */
export async function saveMapSeries(user: PublicUser, series: FlowSeries, useDemo?: boolean) {
  const parsed = flowSeriesSchema.safeParse(series);
  if (!parsed.success || !parsed.data.mapFlowId) throw new FlowSeriesError('Check the series and try again.');
  const activeDemo = demo(useDemo);
  await assertItem(parsed.data.itemKind, parsed.data.itemId, parsed.data.version, activeDemo);
  if (activeDemo) {
    if (readMemory(user).length >= seriesLimit) throw new FlowSeriesError('You can keep up to 100 series.');
    memory().series.push({ userId: user.id, series: parsed.data });
    return;
  }
  const sql = (await import('./database')).database();
  const count = await sql`SELECT count(*)::int AS count FROM flow_series WHERE user_id=${user.id}`;
  if (Number(count[0]?.count ?? 0) >= seriesLimit) throw new FlowSeriesError('You can keep up to 100 series.');
  await sql`INSERT INTO flow_series (id, user_id, item_kind, item_id, item_version, map_flow_id, start_date, time, recurrence, series_end, created_at, updated_at)
    VALUES (${parsed.data.id}, ${user.id}, ${parsed.data.itemKind}, ${parsed.data.itemId}, ${parsed.data.version ?? null}, ${parsed.data.mapFlowId}, ${parsed.data.start}, ${JSON.stringify(parsed.data.time)}::jsonb, ${JSON.stringify(parsed.data.recurrence)}::jsonb, ${JSON.stringify(parsed.data.end)}::jsonb, ${parsed.data.createdAt}, ${parsed.data.createdAt})`;
}

export async function deleteMapSeries(user: PublicUser, mapFlowId: string, useDemo?: boolean) {
  if (demo(useDemo)) {
    const ids = new Set(readMemory(user).filter(series => series.mapFlowId === mapFlowId).map(series => series.id));
    memory().series = memory().series.filter(row => !(row.userId === user.id && row.series.mapFlowId === mapFlowId));
    memory().exceptions = memory().exceptions.filter(row => !ids.has(row.seriesId));
    return;
  }
  const sql = (await import('./database')).database();
  await sql`DELETE FROM flow_series WHERE user_id=${user.id} AND map_flow_id=${mapFlowId}`;
}

export async function readSeriesWindow(user: PublicUser, from: string, to: string, useDemo?: boolean) {
  const span = inclusiveSpan(from, to);
  if (span === null) throw new FlowSeriesError('Check the dates and try again.');
  if (span > seriesRangeDays) throw new FlowSeriesError('Choose a range of 62 days or less.');
  const activeDemo = demo(useDemo);
  const { occurrencesForMapFlows } = await import('./map-flow-store');
  const mapped = await occurrencesForMapFlows(user, from, to, activeDemo);
  const [loaded, completions] = mapped
    ? [null, null]
    : await Promise.all([loadFlowSeries(user, activeDemo), routineCompletions(user.id, activeDemo, from, to)]);
  const found: SeriesOccurrence[] = mapped
    ? mapped.occurrences
    : occurrences(loaded?.series ?? [], loaded?.exceptions ?? [], from, to, completions ?? []);
  const series = mapped ? mapped.series : (loaded?.series ?? []);
  const { applyFollowWindow } = await import('./follow-store');
  return applyFollowWindow(user, { series, occurrences: found }, from, to, activeDemo);
}

export async function changeFlowSeries(user: PublicUser, body: unknown, useDemo?: boolean) {
  const parsed = seriesActionSchema.safeParse(body);
  if (!parsed.success) throw new FlowSeriesError('Check the series and try again.');
  if (demo(useDemo)) await applyMemory(user, parsed.data);
  else await applyDatabase(user, parsed.data);
  return { series: demo(useDemo) ? readMemory(user) : (await readDatabase(user)).series };
}
