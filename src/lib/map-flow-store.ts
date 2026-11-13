/**
 * A member's Map flows: five slots, one followed at a time.
 * Demo mode keeps them in memory. Postgres uses map_flows and the tables around it.
 * A backfilled Base keeps the series the member already had. A pattern's calendar
 * comes from dailyFlowOn, so a missed day shifts an in-turn plan and is not skipped.
 */
import { z } from 'zod';
import { addCalendarDays, calendarDateSchema, inclusiveSpan, occurrences, type FlowSeries, type SeriesCompletion, type SeriesOccurrence } from '../../shared/flow-series';
import {
  copyMapFlow,
  dailyFlowOn,
  followedMapFlow,
  freeSlot,
  mapFlowDaySchema,
  mapFlowSchema,
  planFromMapFlow,
  slotProblem,
  type MapFlow,
  type MapFlowItem,
  type MapFlowProgress,
} from '../../shared/map-flow';
import { mapFlowStyleById } from '../../shared/map-flow-styles';
import { mapFlowTemplateById, type MapFlowTemplate } from '../../shared/map-flow-templates';
import { predictBodyFlow, type PredictedArea } from '../../shared/predicted-body-flow';
import { deleteMapSeries, loadFlowSeries, saveMapSeries } from './flow-series-store';
import { demoModeEnabled } from './runtime-config';
import { routineCompletions } from './training-store';
import type { PublicUser } from './types';

export class MapFlowError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const slotSchema = z.number().int().min(1).max(5);

export const mapFlowActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), templateId: z.string().trim().min(1).max(80), slot: slotSchema.optional(), start: calendarDateSchema.optional() }).strict(),
  z.object({ action: z.literal('copy'), mapFlowId: z.string().uuid(), slot: slotSchema.optional(), start: calendarDateSchema.optional() }).strict(),
  z.object({ action: z.literal('rename'), mapFlowId: z.string().uuid(), name: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal('clear'), slot: slotSchema }).strict(),
  z.object({ action: z.literal('follow'), mapFlowId: z.string().uuid(), from: calendarDateSchema }).strict(),
  z.object({ action: z.literal('base'), from: calendarDateSchema }).strict(),
  z.object({ action: z.literal('let-go'), mapFlowId: z.string().uuid(), index: z.number().int().min(0).max(6), on: calendarDateSchema }).strict(),
]);

export type MapFlowAction = z.infer<typeof mapFlowActionSchema>;

export type MapFlowView = MapFlow & {
  styleName: string;
  figure: PredictedArea[];
  items: MapFlowItem[];
  /** Dates a flow on this Map flow was finished. Body flow compares these with plannedByNow. */
  doneDates: string[];
};

export type MapFlowList = {
  slotCount: 5;
  followedId: string | null;
  follows: { mapFlowId: string; from: string }[];
  flows: MapFlowView[];
};

type Memory = {
  flows: { userId: string; flow: MapFlow }[];
  follows: { userId: string; mapFlowId: string; from: string }[];
  items: { userId: string; mapFlowId: string; item: MapFlowItem }[];
};

declare global {
  var qramMapFlows: Memory | undefined;
}

function demo(flag?: boolean) {
  return flag ?? demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramMapFlows ??= { flows: [], follows: [], items: [] });
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
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

function figureFor(flow: MapFlow) {
  const level = flow.sourceKind === 'template' && flow.sourceId ? mapFlowTemplateById(flow.sourceId)?.level ?? 'Beginner' : 'Beginner';
  return predictBodyFlow(planFromMapFlow(flow), { level });
}

function view(flow: MapFlow, items: MapFlowItem[], completions: SeriesCompletion[]): MapFlowView {
  return {
    ...flow,
    styleName: mapFlowStyleById(flow.styleId)?.name ?? flow.styleId,
    figure: figureFor(flow),
    items,
    doneDates: [...progressFor(flow, completions).doneDates].sort(),
  };
}

function datesFrom(from: string, to: string) {
  const span = inclusiveSpan(from, to);
  if (span == null) return [];
  return Array.from({ length: span }, (_, index) => addCalendarDays(from, index));
}

function progressFor(flow: MapFlow, completions: SeriesCompletion[]): MapFlowProgress {
  const ids = new Set(flow.days.flatMap(day => day.flows.map(item => `${item.kind}:${item.id}`)));
  const doneDates = [
    ...new Set(
      completions.filter(item => ids.has(`${item.itemKind}:${item.itemId}`)).map(item => item.date),
    ),
  ];
  return { doneDates, letGo: flow.released };
}

function earliestDate(flows: MapFlow[], follows: { from: string }[], from: string) {
  const dates = [from, ...follows.map(follow => follow.from), ...flows.map(flow => flow.createdAt.slice(0, 10))];
  return dates.filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort()[0] ?? from;
}

/** A finish from before the Map flow was saved still counts. Missed areas compare against that history. */
const completionHistoryFrom = '2000-01-01';

function fromTemplate(template: MapFlowTemplate, slot: number, start: string) {
  const copied = copyMapFlow(
    {
      id: template.id,
      name: template.name,
      styleId: template.styleId,
      purposeIds: template.purposeIds,
      repeat: template.repeat,
      days: template.days,
    },
    slot,
    start,
  );
  return {
    mapFlow: mapFlowSchema.parse({ ...copied.mapFlow, sourceKind: 'template', sourceId: template.id }),
    series: copied.series,
    items: copied.items,
  };
}

async function readDemo(user: PublicUser) {
  return {
    flows: memory()
      .flows.filter(row => row.userId === user.id)
      .map(row => row.flow)
      .sort((a, b) => a.slot - b.slot),
    follows: memory()
      .follows.filter(row => row.userId === user.id)
      .map(row => ({ mapFlowId: row.mapFlowId, from: row.from }))
      .sort((a, b) => a.from.localeCompare(b.from)),
    items: memory().items.filter(row => row.userId === user.id),
  };
}

function assemble(row: Record<string, unknown>, dayRows: Record<string, unknown>[]): MapFlow | null {
  const days = dayRows
    .slice()
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map(day => ({
      name: String(day.name),
      effort: day.effort,
      flows: asJson(day.flows),
      items: asJson(day.items),
    }));
  const parsed = mapFlowSchema.safeParse({
    id: String(row.id),
    slot: Number(row.slot),
    name: String(row.name),
    styleId: String(row.style),
    purposeIds: asJson(row.purposes),
    repeat: row.repeat,
    sourceKind: row.source_kind,
    ...(row.source_id == null ? {} : { sourceId: String(row.source_id) }),
    days,
    released: asJson(row.released),
    createdAt: asInstant(row.created_at),
    updatedAt: asInstant(row.updated_at),
  });
  return parsed.success ? parsed.data : null;
}

async function readPostgres(user: PublicUser) {
  const sql = (await import('./database')).database();
  const [flowRows, dayRows, followRows, itemRows] = await Promise.all([
    sql`SELECT id, slot, name, style, purposes, repeat, source_kind, source_id, released, created_at, updated_at FROM map_flows WHERE user_id=${user.id} ORDER BY slot`,
    sql`SELECT d.map_flow_id, d.position, d.name, d.effort, d.flows, d.items FROM map_flow_days d JOIN map_flows m ON m.id=d.map_flow_id WHERE m.user_id=${user.id} ORDER BY d.position`,
    sql`SELECT map_flow_id, from_date FROM map_flow_follows WHERE user_id=${user.id} ORDER BY from_date`,
    sql`SELECT id, map_flow_id, item_id, name, checkpoint, times_per_day FROM member_daily_items WHERE user_id=${user.id} ORDER BY created_at, id`,
  ]);
  const daysByFlow = new Map<string, Record<string, unknown>[]>();
  for (const day of dayRows) {
    const id = String(day.map_flow_id);
    const list = daysByFlow.get(id) ?? [];
    list.push(day);
    daysByFlow.set(id, list);
  }
  return {
    flows: flowRows.map(row => assemble(row, daysByFlow.get(String(row.id)) ?? [])).filter((flow): flow is MapFlow => flow !== null),
    follows: followRows.map(row => ({ mapFlowId: String(row.map_flow_id), from: asDate(row.from_date) })),
    items: itemRows.map(row => ({
      userId: user.id,
      mapFlowId: String(row.map_flow_id),
      item: {
        id: String(row.id),
        itemId: String(row.item_id),
        name: String(row.name),
        checkpoint: String(row.checkpoint),
        timesPerDay: Number(row.times_per_day),
      } as MapFlowItem,
    })),
  };
}

async function loadState(user: PublicUser, useDemo: boolean) {
  return useDemo ? readDemo(user) : readPostgres(user);
}

function backfillDay(series: FlowSeries, index: number) {
  return mapFlowDaySchema.parse({
    name: index === 0 ? 'Day' : `Day ${index + 1}`,
    effort: 'full',
    flows: [{ kind: series.itemKind, id: series.itemId, ...(series.version != null ? { version: series.version } : {}) }],
    items: [],
  });
}

async function ensureBase(user: PublicUser, useDemo: boolean) {
  const loaded = await loadFlowSeries(user, useDemo);
  if (useDemo) {
    const mine = memory().flows.filter(row => row.userId === user.id);
    if (!mine.length) {
      if (!loaded.series.length) return;
      const now = new Date().toISOString();
      const flow = mapFlowSchema.parse({
        id: crypto.randomUUID(),
        slot: 1,
        name: 'Base',
        styleId: 'member',
        purposeIds: [],
        repeat: 'in-turn',
        sourceKind: 'backfill',
        days: loaded.series.map(backfillDay),
        released: [],
        createdAt: now,
        updatedAt: now,
      });
      memory().flows.push({ userId: user.id, flow });
      for (const series of loaded.series) series.mapFlowId = flow.id;
      return;
    }
    const base = mine.find(row => row.flow.slot === 1);
    if (!base) return;
    for (const series of loaded.series) {
      if (series.mapFlowId) continue;
      series.mapFlowId = base.flow.id;
      if (base.flow.sourceKind !== 'backfill') continue;
      base.flow.days.push(backfillDay(series, base.flow.days.length));
      base.flow.updatedAt = new Date().toISOString();
    }
    return;
  }
  const sql = (await import('./database')).database();
  const existing = await sql`SELECT id, slot, source_kind FROM map_flows WHERE user_id=${user.id} ORDER BY slot`;
  if (!existing.length) {
    const seriesRows = await sql`SELECT id, item_kind, item_id, item_version FROM flow_series WHERE user_id=${user.id} ORDER BY created_at, id`;
    if (!seriesRows.length) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const days = seriesRows.map((row, index) =>
      backfillDay(
        {
          id: String(row.id),
          itemKind: row.item_kind as FlowSeries['itemKind'],
          itemId: String(row.item_id),
          ...(row.item_version == null ? {} : { version: Number(row.item_version) }),
          start: now.slice(0, 10),
          time: { checkpoint: 'Morning' },
          recurrence: { kind: 'once' },
          end: { kind: 'never' },
          createdAt: now,
        },
        index,
      ),
    );
    const queries = [
      sql`INSERT INTO map_flows (id, user_id, slot, name, style, purposes, repeat, source_kind, source_id, released, created_at, updated_at)
        VALUES (${id}, ${user.id}, ${1}, ${'Base'}, ${'member'}, ${'[]'}::jsonb, ${'in-turn'}, ${'backfill'}, ${null}, ${'[]'}::jsonb, ${now}, ${now})`,
      ...days.map(
        (day, index) =>
          sql`INSERT INTO map_flow_days (map_flow_id, position, name, effort, flows, items)
            VALUES (${id}, ${index}, ${day.name}, ${day.effort}, ${JSON.stringify(day.flows)}::jsonb, ${'[]'}::jsonb)`,
      ),
      sql`UPDATE flow_series SET map_flow_id=${id} WHERE user_id=${user.id} AND map_flow_id IS NULL`,
    ];
    await sql.transaction(queries);
    return;
  }
  const base = existing.find(row => Number(row.slot) === 1);
  if (!base) return;
  await sql`UPDATE flow_series SET map_flow_id=${String(base.id)} WHERE user_id=${user.id} AND map_flow_id IS NULL`;
}

function listFrom(state: Awaited<ReturnType<typeof loadState>>, date: string, completions: SeriesCompletion[]): MapFlowList {
  const followed = followedMapFlow(state.flows, state.follows, date);
  return {
    slotCount: 5,
    followedId: followed?.flow.id ?? null,
    follows: state.follows,
    flows: state.flows.map(flow => view(flow, state.items.filter(item => item.mapFlowId === flow.id).map(item => item.item), completions)),
  };
}

async function persistNew(user: PublicUser, made: ReturnType<typeof copyMapFlow>, useDemo: boolean) {
  if (useDemo) {
    memory().flows.push({ userId: user.id, flow: made.mapFlow });
    for (const series of made.series) await saveMapSeries(user, series, true);
    for (const item of made.items) memory().items.push({ userId: user.id, mapFlowId: made.mapFlow.id, item });
    return;
  }
  const sql = (await import('./database')).database();
  const flow = made.mapFlow;
  await sql.transaction([
    sql`INSERT INTO map_flows (id, user_id, slot, name, style, purposes, repeat, source_kind, source_id, released, created_at, updated_at)
      VALUES (${flow.id}, ${user.id}, ${flow.slot}, ${flow.name}, ${flow.styleId}, ${JSON.stringify(flow.purposeIds)}::jsonb, ${flow.repeat}, ${flow.sourceKind}, ${flow.sourceId ?? null}, ${'[]'}::jsonb, ${flow.createdAt}, ${flow.updatedAt})`,
    ...flow.days.map(
      (day, index) =>
        sql`INSERT INTO map_flow_days (map_flow_id, position, name, effort, flows, items)
          VALUES (${flow.id}, ${index}, ${day.name}, ${day.effort}, ${JSON.stringify(day.flows)}::jsonb, ${JSON.stringify(day.items)}::jsonb)`,
    ),
    ...made.series.map(
      series =>
        sql`INSERT INTO flow_series (id, user_id, item_kind, item_id, item_version, map_flow_id, start_date, time, recurrence, series_end, created_at, updated_at)
          VALUES (${series.id}, ${user.id}, ${series.itemKind}, ${series.itemId}, ${series.version ?? null}, ${flow.id}, ${series.start}, ${JSON.stringify(series.time)}::jsonb, ${JSON.stringify(series.recurrence)}::jsonb, ${JSON.stringify(series.end)}::jsonb, ${series.createdAt}, ${series.createdAt})`,
    ),
    ...made.items.map(
      item =>
        sql`INSERT INTO member_daily_items (id, user_id, map_flow_id, item_id, name, checkpoint, times_per_day)
          VALUES (${item.id}, ${user.id}, ${flow.id}, ${item.itemId}, ${item.name}, ${item.checkpoint}, ${item.timesPerDay})`,
    ),
  ]);
}

async function setFollow(user: PublicUser, mapFlowId: string, from: string, useDemo: boolean) {
  if (useDemo) {
    memory().follows = memory().follows.filter(row => !(row.userId === user.id && row.from === from));
    memory().follows.push({ userId: user.id, mapFlowId, from });
    return;
  }
  const sql = (await import('./database')).database();
  await sql`INSERT INTO map_flow_follows (user_id, map_flow_id, from_date) VALUES (${user.id}, ${mapFlowId}, ${from})
    ON CONFLICT (user_id, from_date) DO UPDATE SET map_flow_id=EXCLUDED.map_flow_id`;
}

/** A shared Map flow lands in a free slot, or replaces one the member chose. Weights and logs are already gone. */
export async function placeSharedMap(
  user: PublicUser,
  source: Parameters<typeof copyMapFlow>[0],
  useDemo?: boolean,
  start?: string,
  slot?: number,
  confirmBase?: boolean,
) {
  const activeDemo = demo(useDemo);
  await ensureBase(user, activeDemo);
  let state = await loadState(user, activeDemo);
  const chosen = slot ?? freeSlot(state.flows);
  if (chosen == null) throw new MapFlowError('All five slots are in use. Choose one to replace.');
  const occupying = state.flows.find(flow => flow.slot === chosen);
  if (occupying) {
    if (chosen === 1 && !confirmBase) throw new MapFlowError('Slot 1 is the Map flow on Today. Replacing it changes what you follow.');
    await deleteMapSeries(user, occupying.id, activeDemo);
    if (activeDemo) {
      memory().flows = memory().flows.filter(row => !(row.userId === user.id && row.flow.id === occupying.id));
      memory().follows = memory().follows.filter(row => !(row.userId === user.id && row.mapFlowId === occupying.id));
      memory().items = memory().items.filter(row => !(row.userId === user.id && row.mapFlowId === occupying.id));
    } else {
      const sql = (await import('./database')).database();
      await sql`DELETE FROM map_flows WHERE id=${occupying.id} AND user_id=${user.id}`;
    }
    state = await loadState(user, activeDemo);
  }
  const problem = slotProblem(state.flows, chosen, 'use');
  if (problem) throw new MapFlowError(problem);
  let made: ReturnType<typeof copyMapFlow>;
  try {
    made = copyMapFlow(source, chosen, start);
  } catch (error) {
    throw new MapFlowError(error instanceof Error ? error.message : 'Check the Map flow and try again.');
  }
  await persistNew(user, made, activeDemo);
  return listMapFlows(user, activeDemo, start ?? utcDay());
}

export async function listMapFlows(user: PublicUser, useDemo?: boolean, date = utcDay()) {
  const activeDemo = demo(useDemo);
  await ensureBase(user, activeDemo);
  const state = await loadState(user, activeDemo);
  const completions = state.flows.length
    ? await routineCompletions(user.id, activeDemo, completionHistoryFrom, date)
    : [];
  return listFrom(state, date, completions);
}

export async function changeMapFlow(user: PublicUser, body: unknown, useDemo?: boolean, date = utcDay()) {
  const parsed = mapFlowActionSchema.safeParse(body);
  if (!parsed.success) throw new MapFlowError('Check the Map flow and try again.');
  const activeDemo = demo(useDemo);
  await ensureBase(user, activeDemo);
  const action = parsed.data;
  const state = await loadState(user, activeDemo);
  if (action.action === 'create' || action.action === 'copy') {
    const slot = action.slot ?? freeSlot(state.flows);
    if (slot == null) throw new MapFlowError('All five slots are in use.');
    const problem = slotProblem(state.flows, slot, 'use');
    if (problem) throw new MapFlowError(problem);
    const start = action.start ?? utcDay();
    const made =
      action.action === 'create'
        ? fromTemplate(requireTemplate(action.templateId), slot, start)
        : copyOwned(state.flows, action.mapFlowId, slot, start);
    await persistNew(user, made, activeDemo);
  } else if (action.action === 'rename') {
    const flow = requireOwned(state.flows, action.mapFlowId);
    flow.name = action.name;
    flow.updatedAt = new Date().toISOString();
    if (!activeDemo) {
      const sql = (await import('./database')).database();
      await sql`UPDATE map_flows SET name=${flow.name}, updated_at=${flow.updatedAt} WHERE id=${flow.id} AND user_id=${user.id}`;
    }
  } else if (action.action === 'clear') {
    const problem = slotProblem(state.flows, action.slot, 'clear');
    if (problem) throw new MapFlowError(problem);
    const flow = state.flows.find(item => item.slot === action.slot);
    if (!flow) throw new MapFlowError('That slot is empty.');
    await deleteMapSeries(user, flow.id, activeDemo);
    if (activeDemo) {
      memory().flows = memory().flows.filter(row => !(row.userId === user.id && row.flow.id === flow.id));
      memory().follows = memory().follows.filter(row => !(row.userId === user.id && row.mapFlowId === flow.id));
      memory().items = memory().items.filter(row => !(row.userId === user.id && row.mapFlowId === flow.id));
    } else {
      const sql = (await import('./database')).database();
      await sql`DELETE FROM map_flows WHERE id=${flow.id} AND user_id=${user.id}`;
    }
  } else if (action.action === 'follow') {
    requireOwned(state.flows, action.mapFlowId);
    await setFollow(user, action.mapFlowId, action.from, activeDemo);
  } else if (action.action === 'base') {
    const base = state.flows.find(flow => flow.slot === 1);
    if (!base) throw new MapFlowError('Base is missing.');
    await setFollow(user, base.id, action.from, activeDemo);
  } else {
    const flow = requireOwned(state.flows, action.mapFlowId);
    if (flow.repeat !== 'weekdays') throw new MapFlowError('Only a weekday pattern can let a day go.');
    if (flow.released.some(item => item.index === action.index && item.on === action.on)) {
      return listMapFlows(user, activeDemo, date);
    }
    flow.released = [...flow.released, { index: action.index, on: action.on }];
    flow.updatedAt = new Date().toISOString();
    if (!activeDemo) {
      const sql = (await import('./database')).database();
      await sql`UPDATE map_flows SET released=${JSON.stringify(flow.released)}::jsonb, updated_at=${flow.updatedAt} WHERE id=${flow.id} AND user_id=${user.id}`;
    }
  }
  return listMapFlows(user, activeDemo, date);
}

function requireTemplate(id: string) {
  const template = mapFlowTemplateById(id);
  if (!template) throw new MapFlowError('That Map flow is not ready.');
  return template;
}

function requireOwned(flows: MapFlow[], id: string) {
  const flow = flows.find(item => item.id === id);
  if (!flow) throw new MapFlowError('Map flow not found.', 404);
  return flow;
}

function copyOwned(flows: MapFlow[], id: string, slot: number, start: string) {
  const source = requireOwned(flows, id);
  try {
    return copyMapFlow(source, slot, start);
  } catch (error) {
    throw new MapFlowError(error instanceof Error ? error.message : 'Check the Map flow and try again.');
  }
}

function occurrenceFor(series: FlowSeries, date: string, completions: SeriesCompletion[]): SeriesOccurrence {
  const done = completions.some(item => item.itemKind === series.itemKind && item.itemId === series.itemId && item.date === date);
  return {
    seriesId: series.id,
    itemKind: series.itemKind,
    itemId: series.itemId,
    ...(series.version != null ? { version: series.version } : {}),
    date,
    time: series.time,
    original: date,
    moved: false,
    status: done ? 'done' : 'open',
  };
}

/**
 * The calendar for each date is the Daily flow of the Map flow followed on that date.
 * A backfilled Base still uses the series the member already had.
 * Past dates keep the follow that was in force then.
 */
export async function occurrencesForMapFlows(user: PublicUser, from: string, to: string, useDemo?: boolean) {
  const activeDemo = demo(useDemo);
  await ensureBase(user, activeDemo);
  const [fresh, state] = await Promise.all([loadFlowSeries(user, activeDemo), loadState(user, activeDemo)]);
  if (!state.flows.length) return null;
  const completions = await routineCompletions(user.id, activeDemo, earliestDate(state.flows, state.follows, from), to);
  const days = datesFrom(from, to);
  const followedOn = days.map(date => ({ date, followed: followedMapFlow(state.flows, state.follows, date) }));
  const pattern = followedOn.filter(row => row.followed && row.followed.flow.sourceKind !== 'backfill');
  if (!pattern.length) {
    const base = followedOn.find(row => row.followed?.flow.sourceKind === 'backfill')?.followed?.flow;
    const owned = base ? fresh.series.filter(series => series.mapFlowId === base.id) : fresh.series;
    return { series: fresh.series, occurrences: occurrences(owned, fresh.exceptions, from, to, completions) };
  }
  const backfillDates = new Set(followedOn.filter(row => row.followed?.flow.sourceKind === 'backfill').map(row => row.date));
  const rows: SeriesOccurrence[] = [];
  if (backfillDates.size) {
    const backfillId = followedOn.find(row => row.followed?.flow.sourceKind === 'backfill')?.followed?.flow.id;
    const owned = fresh.series.filter(series => series.mapFlowId === backfillId);
    for (const row of occurrences(owned, fresh.exceptions, from, to, completions)) {
      if (backfillDates.has(row.date)) rows.push(row);
    }
  }
  for (const row of pattern) {
    const followed = row.followed;
    if (!followed) continue;
    const placed = dailyFlowOn(followed.flow, followed.from, progressFor(followed.flow, completions), row.date);
    if (!placed) continue;
    for (const ref of placed.flows) {
      const series = fresh.series.find(item => item.mapFlowId === followed.flow.id && item.itemKind === ref.kind && item.itemId === ref.id);
      if (series) rows.push(occurrenceFor(series, row.date, completions));
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.seriesId.localeCompare(b.seriesId) || a.itemId.localeCompare(b.itemId));
  return { series: fresh.series, occurrences: rows };
}
