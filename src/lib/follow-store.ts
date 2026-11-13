/**
 * A trial of someone else's flow.
 * Demo mode keeps the record in memory. Postgres uses flow_follows.
 * The member's series is paused by the record. It is never deleted.
 * Each finished session of the snapshot counts down. At zero, a return
 * lifts the pause and the weekly review says so. Keep writes their Custom flow.
 */
import { z } from 'zod';
import { calendarDateSchema, flowSeriesSchema, type FlowSeries, type SeriesOccurrence } from '../../shared/flow-series';
import {
  applyFollowOccurrences,
  defaultFollowAfter,
  defaultFollowSessions,
  followPlan,
  followShowsOn,
  keptCustomflow,
  nextFollowState,
  publicSnapshot,
  reviewLinesFor,
  sessionsLeft,
  stoppedFollow,
  suggestReplacement,
  type FollowRecord,
  type FollowThen,
  type TheirFlow,
} from '../../shared/follow';
import { hasChanges } from '../../shared/customflows';
import type { Customflow } from '../../shared/customflows';
import { followedMapFlow } from '../../shared/map-flow';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';

export class FollowError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const theirFlowSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    fromName: z.string().trim().min(1).max(40),
    kind: z.enum(['custom', 'daily', 'map']),
    source: z
      .object({
        kind: z.enum(['qram-flow', 'qram-session', 'community-flow']),
        id: z.string().trim().min(1).max(160),
        version: z.number().int().min(1).nullable(),
      })
      .strict()
      .optional(),
    items: z
      .array(
        z
          .object({
            exerciseId: z.string().trim().min(1).max(120),
            sets: z.number().int().min(1).max(20),
            repsMin: z.number().optional(),
            repsMax: z.number().optional(),
          })
          .passthrough(),
      )
      .max(60)
      .optional(),
    changes: z
      .object({
        order: z.array(z.string().min(1).max(160)).max(60).optional(),
        swaps: z.record(z.string().min(1).max(160), z.string().min(1).max(160)).optional(),
        removed: z.array(z.string().min(1).max(160)).max(60).optional(),
      })
      .optional(),
    map: z.unknown().optional(),
  })
  .passthrough();

const whereSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('replace'), flowId: z.string().trim().min(1).max(120) }).strict(),
  z.object({ kind: z.literal('add'), date: calendarDateSchema }).strict(),
]);

export const followActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('start'),
      theirFlow: theirFlowSchema,
      where: whereSchema.optional(),
      sessions: z.union([z.literal(1), z.literal(4), z.null()]).optional(),
      after: z.enum(['return', 'keep']).optional(),
      today: calendarDateSchema,
      replaceSlot: z.number().int().min(1).max(5).optional(),
      confirmBase: z.boolean().optional(),
    })
    .strict(),
  z.object({ action: z.literal('stop'), id: z.string().uuid() }).strict(),
]);

export type FollowAction = z.infer<typeof followActionSchema>;

export type FollowView = {
  id: string;
  status: FollowRecord['status'];
  where: FollowRecord['where'];
  sessionsTotal: FollowRecord['sessionsTotal'];
  sessionsLeft: number | null;
  after: FollowThen;
  fromName: string;
  title: string;
  ownTitle: string;
  startedOn: string;
  dates: string[];
  pausedSeriesId: string | null;
  replacementSeriesId: string;
  replacedFlowId: string | null;
  source: FollowRecord['source'];
  items: FollowRecord['items'];
  reviewLine: string | null;
  showsOn: string[];
};

type Stored = FollowRecord & { userId: string };

declare global {
  var qramFlowFollows: Stored[] | undefined;
}

function demo(flag?: boolean) {
  return flag ?? demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramFlowFollows ??= []);
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

function viewOf(follow: FollowRecord): FollowView {
  const showsOn = follow.dates.filter(date => followShowsOn(follow, date));
  return {
    id: follow.id,
    status: follow.status,
    where: follow.where,
    sessionsTotal: follow.sessionsTotal,
    sessionsLeft: sessionsLeft(follow),
    after: follow.after,
    fromName: follow.fromName,
    title: follow.title,
    ownTitle: follow.ownTitle,
    startedOn: follow.startedOn,
    dates: follow.dates,
    pausedSeriesId: follow.pausedSeriesId,
    replacementSeriesId: follow.replacementSeriesId,
    replacedFlowId: follow.replacedFlowId,
    source: follow.source,
    items: follow.items,
    reviewLine: follow.reviewLine,
    showsOn: follow.status === 'active' || follow.status === 'kept' ? showsOn : follow.finishedDates,
  };
}

function rowOf(row: Record<string, unknown>): FollowRecord | null {
  const sourceKind = String(row.source_kind);
  if (sourceKind !== 'qram-flow' && sourceKind !== 'qram-session' && sourceKind !== 'community-flow') return null;
  const place = String(row.place);
  if (place !== 'replace' && place !== 'add') return null;
  const after = String(row.after);
  if (after !== 'return' && after !== 'keep') return null;
  const status = String(row.status);
  if (status !== 'active' && status !== 'returned' && status !== 'kept' && status !== 'stopped') return null;
  const sessions = row.sessions_total == null ? null : Number(row.sessions_total);
  if (sessions !== null && sessions !== 1 && sessions !== 4) return null;
  return {
    id: String(row.id),
    pausedSeriesId: row.paused_series_id == null ? null : String(row.paused_series_id),
    replacementSeriesId: String(row.replacement_series_id),
    replacedFlowId: row.replaced_flow_id == null ? null : String(row.replaced_flow_id),
    sessionsTotal: sessions,
    after,
    where: place,
    fromName: String(row.from_name),
    title: String(row.title),
    ownTitle: String(row.own_title),
    startedOn: asDate(row.started_on),
    dates: asJson(row.dates) as string[],
    status,
    source: {
      kind: sourceKind,
      id: String(row.source_id),
      version: row.source_version == null ? null : Number(row.source_version),
    },
    items: asJson(row.items) as FollowRecord['items'],
    changes: asJson(row.changes) as FollowRecord['changes'],
    finishedDates: asJson(row.finished_dates) as string[],
    reviewLine: row.review_line == null ? null : String(row.review_line),
    adopted: Boolean(row.adopted),
    recurrence: asJson(row.recurrence) as FollowRecord['recurrence'],
    time: asJson(row.time) as FollowRecord['time'],
  };
}

async function readRows(user: PublicUser, useDemo: boolean): Promise<Stored[]> {
  if (useDemo) return memory().filter(row => row.userId === user.id);
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT id, paused_series_id, replacement_series_id, replaced_flow_id, sessions_total, after, place, from_name, title, own_title, started_on, dates, status, source_kind, source_id, source_version, items, changes, finished_dates, review_line, adopted, recurrence, time FROM flow_follows WHERE user_id=${user.id} ORDER BY created_at, id`;
  return rows.flatMap(row => {
    const follow = rowOf(row);
    return follow ? [{ userId: user.id, ...follow }] : [];
  });
}

async function writeRow(row: Stored, useDemo: boolean) {
  if (useDemo) {
    const list = memory();
    const index = list.findIndex(item => item.id === row.id);
    if (index >= 0) list[index] = row;
    else list.push(row);
    return;
  }
  const sql = (await import('./database')).database();
  const now = new Date().toISOString();
  await sql`INSERT INTO flow_follows (id, user_id, paused_series_id, replacement_series_id, replaced_flow_id, sessions_total, after, place, from_name, title, own_title, started_on, dates, status, source_kind, source_id, source_version, items, changes, finished_dates, review_line, adopted, recurrence, time, created_at, updated_at)
    VALUES (${row.id}, ${row.userId}, ${row.pausedSeriesId}, ${row.replacementSeriesId}, ${row.replacedFlowId}, ${row.sessionsTotal}, ${row.after}, ${row.where}, ${row.fromName}, ${row.title}, ${row.ownTitle}, ${row.startedOn}, ${JSON.stringify(row.dates)}::jsonb, ${row.status}, ${row.source.kind}, ${row.source.id}, ${row.source.version}, ${JSON.stringify(row.items)}::jsonb, ${JSON.stringify(row.changes)}::jsonb, ${JSON.stringify(row.finishedDates)}::jsonb, ${row.reviewLine}, ${row.adopted}, ${JSON.stringify(row.recurrence)}::jsonb, ${JSON.stringify(row.time)}::jsonb, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, finished_dates=EXCLUDED.finished_dates, review_line=EXCLUDED.review_line, adopted=EXCLUDED.adopted, sessions_total=EXCLUDED.sessions_total, updated_at=EXCLUDED.updated_at`;
}

function theirFrom(raw: z.infer<typeof theirFlowSchema>): TheirFlow {
  const snapshot = publicSnapshot({
    title: raw.title,
    fromName: raw.fromName,
    kind: raw.kind,
    source: raw.source,
    items: raw.items,
    changes: raw.changes,
  });
  return {
    ...snapshot,
    kind: raw.kind,
    ...(raw.map && typeof raw.map === 'object' ? { map: raw.map as TheirFlow['map'] } : {}),
  };
}

async function adopt(user: PublicUser, follow: FollowRecord, useDemo: boolean) {
  const made = keptCustomflow(follow, new Date().toISOString());
  if (!made) return { ...follow, adopted: true };
  const { saveAttributedCustomflow } = await import('./customflow-store');
  await saveAttributedCustomflow(user, made, Date.now(), useDemo);
  return { ...follow, adopted: true };
}

/** Counts finished sessions and lifts a finished trial. */
export async function settleFlowFollows(user: PublicUser, useDemo?: boolean, today?: string) {
  const activeDemo = demo(useDemo);
  const rows = await readRows(user, activeDemo);
  if (!rows.length) return rows;
  const { routineCompletions } = await import('./training-store');
  const from = rows.map(row => row.startedOn).sort()[0] ?? '2000-01-01';
  const to = today ?? new Date().toISOString().slice(0, 10);
  const horizon = to < '2099-01-01' ? '2099-01-01' : to;
  const completions = await routineCompletions(user.id, activeDemo, from, horizon);
  for (const row of rows) {
    if (row.status !== 'active') continue;
    const kind = row.source.kind === 'qram-session' ? 'session' : row.source.kind === 'community-flow' ? 'community' : 'flow';
    const finished = completions.filter(item => item.itemKind === kind && item.itemId === row.source.id).map(item => item.date);
    let next = nextFollowState(row, finished);
    if (next.status === 'kept' && !next.adopted) next = await adopt(user, next, activeDemo);
    if (next !== row) await writeRow({ ...next, userId: user.id }, activeDemo);
  }
  return readRows(user, activeDemo);
}

export async function readFlowFollows(user: PublicUser, today: string, useDemo?: boolean) {
  const activeDemo = demo(useDemo);
  const rows = await settleFlowFollows(user, activeDemo, today);
  const follows = rows.map(row => {
    const { userId, ...follow } = row;
    void userId;
    return follow;
  });
  return { follows: follows.map(follow => viewOf(follow)), reviewLines: reviewLinesFor(follows, today) };
}

export async function startFlowFollow(user: PublicUser, body: unknown, useDemo?: boolean) {
  const parsed = followActionSchema.safeParse(body);
  if (!parsed.success || parsed.data.action !== 'start') throw new FollowError('Check the flow and try again.');
  const activeDemo = demo(useDemo);
  const action = parsed.data;
  const their = theirFrom(action.theirFlow);
  const { listMapFlows, placeSharedMap } = await import('./map-flow-store');
  if (their.kind === 'map') {
    const listed = await listMapFlows(user, activeDemo, action.today);
    const plan = followPlan({
      theirFlow: their,
      myMapFlow: null,
      where: { kind: 'add', date: action.today },
      sessions: 1,
      after: 'return',
      today: action.today,
      slots: listed.flows,
      replaceSlot: action.replaceSlot,
      confirmBase: action.confirmBase,
    });
    if (plan.kind !== 'map') throw new FollowError('Check the Map flow and try again.');
    if (plan.problem || plan.slot == null) throw new FollowError(plan.problem ?? 'All five slots are in use. Choose one to replace.');
    const placed = await placeSharedMap(user, plan.source, activeDemo, action.today, plan.slot, action.confirmBase);
    const follows = await readFlowFollows(user, action.today, activeDemo);
    return { ...follows, placedSlot: placed.flows.find(flow => flow.slot === plan.slot)?.slot ?? plan.slot };
  }
  const listed = await listMapFlows(user, activeDemo, action.today);
  const current = followedMapFlow(listed.flows, listed.follows, action.today);
  const suggestion = suggestReplacement(their, current?.flow ?? null, action.today);
  const where = action.where ?? suggestion.where;
  const plan = followPlan({
    theirFlow: their,
    myMapFlow: current?.flow ?? null,
    where,
    sessions: action.sessions === undefined ? defaultFollowSessions : action.sessions,
    after: action.after ?? defaultFollowAfter,
    today: action.today,
    slots: listed.flows,
  });
  if (plan.kind !== 'series') throw new FollowError('Check the flow and try again.');
  if (plan.problem) throw new FollowError(plan.problem);
  const { loadFlowSeries, saveOwnedSeries } = await import('./flow-series-store');
  const loaded = await loadFlowSeries(user, activeDemo);
  const paused = plan.pause ? loaded.series.find(series => series.itemId === plan.pause?.flowId && (!current || series.mapFlowId === current.flow.id)) ?? loaded.series.find(series => series.itemId === plan.pause?.flowId) : null;
  if (plan.pause && !paused) throw new FollowError('That flow is not on your Daily flow.');
  const now = new Date().toISOString();
  const seriesId = crypto.randomUUID();
  const time = paused?.time ?? plan.create.time;
  const series: FlowSeries = flowSeriesSchema.parse({
    id: seriesId,
    itemKind: plan.create.itemKind,
    itemId: plan.create.itemId,
    ...(plan.create.version != null ? { version: plan.create.version } : {}),
    ...(current ? { mapFlowId: current.flow.id } : {}),
    start: plan.create.start,
    time,
    recurrence: plan.create.recurrence,
    end: plan.create.end,
    createdAt: now,
  });
  await saveOwnedSeries(user, series, activeDemo);
  const follow: Stored = {
    userId: user.id,
    id: crypto.randomUUID(),
    pausedSeriesId: paused?.id ?? null,
    replacementSeriesId: series.id,
    replacedFlowId: plan.pause?.flowId ?? null,
    sessionsTotal: plan.sessions,
    after: plan.after,
    where: plan.where.kind,
    fromName: plan.snapshot.fromName,
    title: plan.snapshot.title,
    ownTitle: plan.ownTitle,
    startedOn: action.today,
    dates: plan.dates,
    status: 'active',
    source: plan.snapshot.source,
    items: plan.snapshot.items,
    changes: plan.snapshot.changes,
    finishedDates: [],
    reviewLine: null,
    adopted: false,
    recurrence: plan.create.recurrence,
    time,
  };
  await writeRow(follow, activeDemo);
  const follows = await readFlowFollows(user, action.today, activeDemo);
  return { ...follows, placedSlot: null as number | null };
}

export async function stopFlowFollow(user: PublicUser, id: string, useDemo?: boolean, today?: string) {
  const activeDemo = demo(useDemo);
  const day = today ?? new Date().toISOString().slice(0, 10);
  await settleFlowFollows(user, activeDemo, day);
  const rows = await readRows(user, activeDemo);
  const found = rows.find(row => row.id === id);
  if (!found) throw new FollowError('That follow is not on your Daily flow.', 404);
  if (found.status === 'active') await writeRow({ ...stoppedFollow(found), userId: user.id }, activeDemo);
  return readFlowFollows(user, day, activeDemo);
}

export async function changeFlowFollow(user: PublicUser, body: unknown, useDemo?: boolean) {
  const parsed = followActionSchema.safeParse(body);
  if (!parsed.success) throw new FollowError('Check the flow and try again.');
  if (parsed.data.action === 'stop') return stopFlowFollow(user, parsed.data.id, useDemo);
  return startFlowFollow(user, parsed.data, useDemo);
}

/** While a trial is active and the member has not changed it, the run uses the snapshot. */
export async function followRunChanges(user: PublicUser, sourceId: string, useDemo?: boolean): Promise<Customflow | null> {
  const rows = await readRows(user, demo(useDemo));
  const follow = rows.find(row => row.status === 'active' && !row.adopted && row.source.id === sourceId && hasChanges(row.changes));
  if (!follow) return null;
  return {
    source: follow.source,
    changes: follow.changes,
    fromName: follow.fromName,
    createdAt: follow.startedOn,
    updatedAt: follow.startedOn,
  };
}

/** An edit during a trial makes the snapshot the member's Custom flow and keeps the owner's name. */
export async function attributeFollowEdit(user: PublicUser, sourceId: string, useDemo?: boolean) {
  const activeDemo = demo(useDemo);
  const rows = await readRows(user, activeDemo);
  const follow = rows.find(row => row.status === 'active' && row.source.id === sourceId);
  if (!follow || follow.adopted) return;
  const { readCustomflows, saveAttributedCustomflow } = await import('./customflow-store');
  const flows = await readCustomflows(user);
  const own = Object.values(flows).find(item => item.source.id === sourceId);
  if (own) await saveAttributedCustomflow(user, { ...own, fromName: follow.fromName });
  await writeRow({ ...follow, adopted: true, userId: user.id }, activeDemo);
}

/** Hides the replacement series and shows the snapshot on the paused days. */
export async function applyFollowWindow(
  user: PublicUser,
  window: { series: FlowSeries[]; occurrences: SeriesOccurrence[] },
  from: string,
  to: string,
  useDemo?: boolean,
) {
  const activeDemo = demo(useDemo);
  const rows = await settleFlowFollows(user, activeDemo, to);
  if (!rows.length) return window;
  const follows = rows.map(row => {
    const { userId, ...follow } = row;
    void userId;
    return follow;
  });
  const { routineCompletions } = await import('./training-store');
  const completions = await routineCompletions(user.id, activeDemo, from, to);
  return { series: window.series, occurrences: applyFollowOccurrences(window.occurrences, follows, completions, from, to) };
}
