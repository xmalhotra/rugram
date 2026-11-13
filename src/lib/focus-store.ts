/**
 * The weekly Focus plan: compute it, keep it, and turn the chosen rows into
 * next week's series. Demo mode uses the in-memory series. Postgres applies
 * every chosen row in one transaction.
 */
import { z } from 'zod';
import { bodyFlow, loggedWeeks, shade, type CardioEntry } from '../../shared/body-flow';
import { exerciseRestClass } from '../../shared/exercise-rest';
import { catalogFlows } from '../../shared/flow-catalog';
import { flowEquipment, goalsForCatalogFlow, goalsFromFocus, type FlowGoal, type FlowLevel, type TrainPlace } from '../../shared/flow-defaults';
import {
  addCalendarDays,
  calendarDateSchema,
  calendarWeekday,
  occurrences,
  type FlowSeries,
  type SeriesException,
  type SeriesTime,
} from '../../shared/flow-series';
import {
  planNextWeek,
  type FocusFlow,
  type FocusPlanView,
  type FocusSuggestion,
} from '../../shared/focus-planner';
import { targetBand } from '../../shared/focus-targets';
import { gymEstimatedMinutes, gymFlowById, gymFlows } from '../../shared/gym-flows';
import { focusLevelFor, memberLevel } from '../../shared/member-level';
import { flows as library } from '../../shared/mobile';
import { mainSetsFor } from '../../shared/series-impact';
import { knownFlowIds } from '../../shared/training';
import { trainingCatalog } from '../../shared/training-seed';
import type { MuscleArea } from '../../shared/muscle-map';
import { cardioFor, loggedSetsFor } from './body-flow-store';
import { hasChanges } from '../../shared/customflows';
import { readCustomflows } from './customflow-store';
import { FlowSeriesError, changeFlowSeries, readSeriesWindow } from './flow-series-store';
import { graduatedFlowCount, readGraduation } from './graduation-store';
import { readPersonalMetrics } from './personal-metric-store';
import { memberSignals } from './member-signals';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';

export class FocusPlanError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const focusActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('apply'), week: weekSchema, ids: z.array(z.string().min(1).max(180)).min(1).max(5) }).strict(),
  z.object({ action: z.literal('undo'), week: weekSchema, id: z.string().min(1).max(180) }).strict(),
]);

type AppliedRecord = {
  id: string;
  seriesIds: string[];
  exceptions: { seriesId: string; date: string; previous: SeriesException['change'] | null }[];
};

type Snapshot = Omit<FocusPlanView, 'appliedIds'>;

type Stored = { userId: string; weekStart: string; items: Snapshot; applied: AppliedRecord[]; createdAt: string };

type Memory = Stored[];

declare global {
  var qramFocusPlans: Memory | undefined;
}

function demo(flag?: boolean) {
  return flag ?? demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramFocusPlans ??= []);
}

function asJson<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function monday(iso: string) {
  return addCalendarDays(iso, 1 - calendarWeekday(iso));
}

function levelOf(value: string): FlowLevel {
  if (value === 'Intermediate' || value === 'Advanced') return value;
  return 'Beginner';
}

function catalogueFlows(): FocusFlow[] {
  const catalog = new Map(catalogFlows.flatMap(entry => (entry.flowId ? [[entry.flowId, entry] as const] : [])));
  return gymFlows.filter(gym => gym.items.length).map(gym => {
    const entry = catalog.get(gym.id);
    const goals: FlowGoal[] = entry?.goals?.length
      ? [...entry.goals]
      : entry
        ? goalsForCatalogFlow(entry)
        : gym.id.startsWith('gym-')
          ? ['strength', 'size']
          : [];
    const ids = gym.items.map(item => item.exerciseId);
    const pureCardio = gym.items.every(item => exerciseRestClass[item.exerciseId] === 'conditioning');
    return {
      id: gym.id,
      title: gym.title,
      itemKind: 'flow' as const,
      level: levelOf(gym.level),
      goals,
      equipment: flowEquipment(ids),
      minutes: gymEstimatedMinutes(gym),
      main: mainSetsFor(gym.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets }))).map(row => ({
        area: row.area,
        sets: row.mainSets,
      })),
      ...(pureCardio ? { cardioMinutes: gymEstimatedMinutes(gym) } : {}),
      live: true,
    };
  });
}

function titleFor(kind: string, id: string, known: readonly FocusFlow[]) {
  const found = known.find(flow => flow.id === id)?.title ?? gymFlowById(id)?.title ?? library.find(flow => flow.id === id)?.title;
  if (found) return found;
  if (kind === 'session') return trainingCatalog().sessions.find(session => session.id === id)?.title ?? 'Session';
  return 'Flow';
}

function knownItem(kind: 'flow' | 'session', id: string) {
  if (kind === 'flow') return Boolean(gymFlowById(id) || knownFlowIds().has(id));
  return trainingCatalog().sessions.some(session => session.id === id);
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const row = value as Snapshot;
  return Array.isArray(row.suggestions) && Array.isArray(row.next) && Array.isArray(row.areas) && typeof row.weekStart === 'string';
}

function isApplied(value: unknown): value is AppliedRecord[] {
  return Array.isArray(value) && value.every(row => row && typeof row === 'object' && typeof (row as AppliedRecord).id === 'string');
}

function readMemory(userId: string, weekStart: string) {
  return memory().find(row => row.userId === userId && row.weekStart === weekStart) ?? null;
}

function writeMemory(row: Stored) {
  const list = memory().filter(item => !(item.userId === row.userId && item.weekStart === row.weekStart));
  list.push(row);
  globalThis.qramFocusPlans = list;
}

async function readDatabase(userId: string, weekStart: string): Promise<Stored | null> {
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT items, applied, created_at FROM focus_suggestions WHERE user_id=${userId} AND week_start=${weekStart} LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  const items = asJson<unknown>(row.items);
  const applied = asJson<unknown>(row.applied);
  if (!isSnapshot(items)) return null;
  return {
    userId,
    weekStart,
    items,
    applied: isApplied(applied) ? applied : [],
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

async function memberGoals(user: PublicUser, useDemo: boolean): Promise<FlowGoal[]> {
  if (useDemo) {
    const state = (globalThis as { betterHabitsMobileState?: { profiles: Record<string, { focusId?: string }> } }).betterHabitsMobileState;
    const id = state?.profiles[user.id]?.focusId;
    return id ? goalsFromFocus([id]) : [];
  }
  const { getProfile } = await import('./mobile/profile');
  const profile = await getProfile(user);
  return profile.focusId ? goalsFromFocus([profile.focusId]) : [];
}

async function build(user: PublicUser, today: string, useDemo: boolean): Promise<Snapshot> {
  const weekStart = monday(today);
  const weekEnd = addCalendarDays(weekStart, 6);
  const nextStart = addCalendarDays(weekStart, 7);
  const nextEnd = addCalendarDays(nextStart, 6);
  const historyFrom = addCalendarDays(weekStart, -28);
  const [window, historySets, weekSets, weekCardio, metrics, goals, graduated, custom, signals] = await Promise.all([
    readSeriesWindow(user, historyFrom, nextEnd, useDemo),
    loggedSetsFor(user.id, '2000-01-01', today, useDemo),
    loggedSetsFor(user.id, weekStart, weekEnd, useDemo),
    cardioFor(user.id, weekStart, weekEnd, useDemo),
    readPersonalMetrics(user),
    memberGoals(user, useDemo),
    graduatedFlowCount(user, useDemo),
    readCustomflows(user),
    memberSignals(user.id, useDemo),
  ]);
  const level = memberLevel({
    loggedWeeks: loggedWeeks(historySets),
    lifts: signals?.lifts ?? {},
    bodyKg: signals?.bodyKg,
    lifestyle: signals?.lifestyle,
    graduatedFlows: graduated,
  }).level;
  const flows = catalogueFlows();
  const known = new Set(flows.map(flow => flow.id));
  for (const series of window.series) {
    if (known.has(series.itemId)) continue;
    const title = titleFor(series.itemKind, series.itemId, flows);
    const cardio = /\b(run|running|walk|cycle|swim)\b/i.test(title);
    flows.push({
      id: series.itemId,
      title,
      itemKind: series.itemKind === 'session' ? 'session' : 'flow',
      level,
      goals: [],
      equipment: 'bodyweight',
      minutes: 30,
      main: [],
      ...(cardio ? { cardioMinutes: 30 } : {}),
      live: cardio,
    });
    known.add(series.itemId);
  }
  const flowIds = [...new Set(window.series.filter(series => series.itemKind === 'flow').map(series => series.itemId))];
  const graduations = [];
  for (const flowId of flowIds) {
    const result = await readGraduation(user, flowId, useDemo);
    if (result.ready && result.next) graduations.push({ flowId, nextId: result.next.flowId, nextTitle: result.next.title });
  }
  const place = metrics['gym.place']?.place as TrainPlace | undefined;
  const minutes = metrics['gym.minutes']?.minutes;
  const priorities = metrics['gym.priorities']?.areas as MuscleArea[] | undefined;
  const customIds = Object.values(custom)
    .filter(row => row.source.kind === 'qram-flow' && hasChanges(row.changes))
    .map(row => row.source.id);
  const map = bodyFlow(weekSets, weekCardio as CardioEntry[], { from: weekStart, to: weekEnd });
  const band = focusLevelFor(level);
  const suggestions = planNextWeek({
    weekStart,
    today,
    bodyFlow: { areas: map.areas, cardioMinutes: map.cardioMinutes },
    series: window.series,
    occurrences: window.occurrences,
    completions: window.occurrences
      .filter(row => row.status === 'done')
      .map(row => ({ itemKind: row.itemKind, itemId: row.itemId, date: row.date })),
    graduations,
    member: {
      level,
      ...(place ? { place } : {}),
      ...(minutes ? { minutes } : {}),
      ...(goals.length ? { goals } : {}),
      ...(priorities?.length ? { priorities } : {}),
    },
    flows,
    customIds,
    timedSeriesIds: window.series.filter(series => series.time.at).map(series => series.id),
  });
  const thisWeek = window.occurrences.filter(row => row.date >= weekStart && row.date <= weekEnd);
  const next = window.occurrences
    .filter(row => row.date >= nextStart && row.date <= nextEnd)
    .map(row => ({ date: row.date, title: titleFor(row.itemKind, row.itemId, flows), seriesId: row.seriesId, original: row.original }));
  return {
    weekStart,
    nextWeekStart: nextStart,
    today,
    done: thisWeek.filter(row => row.status === 'done').length,
    planned: thisWeek.length,
    plannedDays: thisWeek.map(row => ({ date: row.date, title: titleFor(row.itemKind, row.itemId, flows), done: row.status === 'done' })),
    areas: map.areas.map(area => ({ area: area.area, shade: shade(area.sets, targetBand(area.area, band), map.weeks) })),
    suggestions,
    next,
  };
}

function viewOf(snapshot: Snapshot, applied: AppliedRecord[]): FocusPlanView {
  return { ...snapshot, appliedIds: applied.map(row => row.id) };
}

async function load(user: PublicUser, today: string, useDemo: boolean) {
  if (!calendarDateSchema.safeParse(today).success) throw new FocusPlanError('Check the date.');
  const weekStart = monday(today);
  const stored = useDemo ? readMemory(user.id, weekStart) : await readDatabase(user.id, weekStart);
  if (stored && stored.applied.length) return stored;
  const items = await build(user, today, useDemo);
  const row: Stored = {
    userId: user.id,
    weekStart,
    items,
    applied: [],
    createdAt: stored?.createdAt ?? new Date().toISOString(),
  };
  if (useDemo) writeMemory(row);
  else await saveDatabase(row);
  return row;
}

async function saveDatabase(row: Stored) {
  const sql = (await import('./database')).database();
  await sql`INSERT INTO focus_suggestions (user_id, week_start, items, applied, created_at)
    VALUES (${row.userId}, ${row.weekStart}, ${JSON.stringify(row.items)}::jsonb, ${JSON.stringify(row.applied)}::jsonb, ${row.createdAt})
    ON CONFLICT (user_id, week_start) DO UPDATE SET items=EXCLUDED.items, applied=EXCLUDED.applied`;
}

function requireSuggestion(row: Stored, id: string) {
  const suggestion = row.items.suggestions.find(item => item.id === id);
  if (!suggestion) throw new FocusPlanError('That suggestion is no longer in this week.');
  return suggestion;
}

function previousOf(seriesId: string, date: string): SeriesException['change'] | null {
  const found = globalThis.qramFlowSeries?.exceptions.find(row => row.seriesId === seriesId && row.date === date);
  return found ? found.change : null;
}

async function previousDatabase(seriesId: string, date: string): Promise<SeriesException['change'] | null> {
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT change FROM flow_series_exceptions WHERE series_id=${seriesId} AND occurrence_date=${date} LIMIT 1`;
  return rows[0] ? asJson<SeriesException['change']>(rows[0].change) : null;
}

function onSchedule(series: FlowSeries, date: string) {
  return occurrences([series], [], date, date).length > 0;
}

async function seriesList(user: PublicUser, useDemo: boolean) {
  const loaded = await readSeriesWindow(user, '2026-01-05', '2026-01-05', useDemo);
  return loaded.series;
}

async function owned(user: PublicUser, seriesId: string, useDemo: boolean) {
  return (await seriesList(user, useDemo)).find(series => series.id === seriesId) ?? null;
}

async function createOnce(user: PublicUser, draft: { itemKind: 'flow' | 'session'; itemId: string; date: string; time: SeriesTime }, useDemo: boolean) {
  if (!knownItem(draft.itemKind, draft.itemId)) throw new FocusPlanError('Unknown flow.');
  const before = new Set((await readSeriesWindow(user, draft.date, draft.date, useDemo)).series.map(series => series.id));
  await changeFlowSeries(
    user,
    {
      action: 'create',
      itemKind: draft.itemKind,
      itemId: draft.itemId,
      start: draft.date,
      time: draft.time,
      recurrence: { kind: 'once' },
      end: { kind: 'never' },
    },
    useDemo,
  );
  const created = (await readSeriesWindow(user, draft.date, draft.date, useDemo)).series.find(series => !before.has(series.id));
  if (!created) throw new FocusPlanError('Could not add that session.');
  return created.id;
}

async function applyDemo(user: PublicUser, row: Stored, ids: string[], useDemo: boolean) {
  const done: AppliedRecord[] = [];
  try {
    for (const id of ids) {
      if (row.applied.some(item => item.id === id)) throw new FocusPlanError('Already applied.');
      const suggestion = requireSuggestion(row, id);
      const record = await runDemo(user, suggestion, useDemo);
      done.push(record);
    }
  } catch (error) {
    for (const record of [...done].reverse()) await undoRecord(user, record, useDemo);
    throw error;
  }
  row.applied = [...row.applied, ...done];
  if (useDemo) writeMemory(row);
  return row;
}

async function runDemo(user: PublicUser, suggestion: FocusSuggestion, useDemo: boolean): Promise<AppliedRecord> {
  const change = suggestion.change;
  if (change.type === 'keep') return { id: suggestion.id, seriesIds: [], exceptions: [] };
  if (change.type === 'once') {
    const id = await createOnce(user, change, useDemo);
    return { id: suggestion.id, seriesIds: [id], exceptions: [] };
  }
  if (change.type === 'move') {
    const series = await owned(user, change.seriesId, useDemo);
    if (!series) throw new FocusPlanError('Series not found.', 404);
    if (!onSchedule(series, change.from)) throw new FocusPlanError("That date isn't on this series.");
    const previous = useDemo ? previousOf(change.seriesId, change.from) : await previousDatabase(change.seriesId, change.from);
    await changeFlowSeries(user, { action: 'move-one', seriesId: change.seriesId, date: change.from, to: { date: change.to } }, useDemo);
    return { id: suggestion.id, seriesIds: [], exceptions: [{ seriesId: change.seriesId, date: change.from, previous }] };
  }
  const series = await owned(user, change.seriesId, useDemo);
  if (!series) throw new FocusPlanError('Series not found.', 404);
  if (!onSchedule(series, change.from)) throw new FocusPlanError("That date isn't on this series.");
  const previous = useDemo ? previousOf(change.seriesId, change.from) : await previousDatabase(change.seriesId, change.from);
  const created = await createOnce(
    user,
    { itemKind: change.itemKind, itemId: change.itemId, date: change.date, time: change.time },
    useDemo,
  );
  try {
    await changeFlowSeries(user, { action: 'skip-one', seriesId: change.seriesId, date: change.from }, useDemo);
  } catch (error) {
    await changeFlowSeries(user, { action: 'delete-series', id: created }, useDemo).catch(() => undefined);
    throw error;
  }
  return { id: suggestion.id, seriesIds: [created], exceptions: [{ seriesId: change.seriesId, date: change.from, previous }] };
}

async function undoRecord(user: PublicUser, record: AppliedRecord, useDemo: boolean) {
  const window = await readSeriesWindow(user, '2026-01-05', '2026-01-11', useDemo);
  for (const id of record.seriesIds) {
    const series = window.series.find(item => item.id === id) ?? (await owned(user, id, useDemo));
    if (!series) continue;
    if (series.recurrence.kind !== 'once') throw new FocusPlanError('That session was edited, so it stays.');
    try {
      await changeFlowSeries(user, { action: 'delete-series', id }, useDemo);
    } catch (error) {
      if (!(error instanceof FlowSeriesError) || error.status !== 404) throw error;
    }
  }
  for (const exception of record.exceptions) {
    const series = await owned(user, exception.seriesId, useDemo);
    if (!series) continue;
    if (exception.previous == null) {
      await changeFlowSeries(user, { action: 'restore-one', seriesId: exception.seriesId, date: exception.date }, useDemo);
    } else if (exception.previous === 'skip') {
      await changeFlowSeries(user, { action: 'skip-one', seriesId: exception.seriesId, date: exception.date }, useDemo);
    } else {
      await changeFlowSeries(user, { action: 'move-one', seriesId: exception.seriesId, date: exception.date, to: exception.previous }, useDemo);
    }
  }
}

async function applyDatabase(user: PublicUser, row: Stored, ids: string[]) {
  const sql = (await import('./database')).database();
  const queries = [];
  const records: AppliedRecord[] = [];
  const existing = await sql`SELECT count(*)::int AS count FROM flow_series WHERE user_id=${user.id}`;
  let count = Number(existing[0]?.count ?? 0);
  for (const id of ids) {
    if (row.applied.some(item => item.id === id)) throw new FocusPlanError('Already applied.');
    const suggestion = requireSuggestion(row, id);
    const change = suggestion.change;
    const record: AppliedRecord = { id, seriesIds: [], exceptions: [] };
    if (change.type === 'once' || change.type === 'replace') {
      if (!knownItem(change.itemKind, change.itemId)) throw new FocusPlanError('Unknown flow.');
      if (count >= 100) throw new FocusPlanError('You can keep up to 100 series.');
      const seriesId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      queries.push(
        sql`INSERT INTO flow_series (id, user_id, item_kind, item_id, item_version, start_date, time, recurrence, series_end, created_at, updated_at)
          VALUES (${seriesId}, ${user.id}, ${change.itemKind}, ${change.itemId}, ${null}, ${change.date}, ${JSON.stringify(change.time)}::jsonb, ${JSON.stringify({ kind: 'once' })}::jsonb, ${JSON.stringify({ kind: 'never' })}::jsonb, ${createdAt}, ${createdAt})`,
      );
      record.seriesIds.push(seriesId);
      count += 1;
    }
    if (change.type === 'move' || change.type === 'replace') {
      const series = await owned(user, change.seriesId, false);
      if (!series || series.id !== change.seriesId) throw new FocusPlanError('Series not found.', 404);
      if (!onSchedule(series, change.from)) throw new FocusPlanError("That date isn't on this series.");
      const previous = await previousDatabase(change.seriesId, change.from);
      const payload = change.type === 'move' ? { date: change.to } : 'skip';
      queries.push(
        sql`INSERT INTO flow_series_exceptions (series_id, occurrence_date, change) VALUES (${change.seriesId}, ${change.from}, ${JSON.stringify(payload)}::jsonb)
          ON CONFLICT (series_id, occurrence_date) DO UPDATE SET change=EXCLUDED.change`,
      );
      record.exceptions.push({ seriesId: change.seriesId, date: change.from, previous });
    }
    records.push(record);
  }
  const applied = [...row.applied, ...records];
  queries.push(
    sql`INSERT INTO focus_suggestions (user_id, week_start, items, applied, created_at)
      VALUES (${row.userId}, ${row.weekStart}, ${JSON.stringify(row.items)}::jsonb, ${JSON.stringify(applied)}::jsonb, ${row.createdAt})
      ON CONFLICT (user_id, week_start) DO UPDATE SET applied=EXCLUDED.applied`,
  );
  await sql.transaction(queries);
  row.applied = applied;
  return row;
}

async function undoDatabase(user: PublicUser, row: Stored, record: AppliedRecord) {
  const sql = (await import('./database')).database();
  const queries = [];
  for (const id of record.seriesIds) {
    const rows = await sql`SELECT recurrence FROM flow_series WHERE id=${id} AND user_id=${user.id} LIMIT 1`;
    if (!rows[0]) continue;
    const recurrence = asJson<{ kind?: string }>(rows[0].recurrence);
    if (recurrence.kind !== 'once') throw new FocusPlanError('That session was edited, so it stays.');
    queries.push(sql`DELETE FROM flow_series WHERE id=${id} AND user_id=${user.id}`);
  }
  for (const exception of record.exceptions) {
    if (exception.previous == null) {
      queries.push(sql`DELETE FROM flow_series_exceptions WHERE series_id=${exception.seriesId} AND occurrence_date=${exception.date}`);
    } else {
      queries.push(
        sql`INSERT INTO flow_series_exceptions (series_id, occurrence_date, change) VALUES (${exception.seriesId}, ${exception.date}, ${JSON.stringify(exception.previous)}::jsonb)
          ON CONFLICT (series_id, occurrence_date) DO UPDATE SET change=EXCLUDED.change`,
      );
    }
  }
  const applied = row.applied.filter(item => item.id !== record.id);
  queries.push(
    sql`UPDATE focus_suggestions SET applied=${JSON.stringify(applied)}::jsonb WHERE user_id=${row.userId} AND week_start=${row.weekStart}`,
  );
  await sql.transaction(queries);
  row.applied = applied;
  return row;
}

export async function readFocusPlan(user: PublicUser, week: string, useDemo?: boolean) {
  const active = demo(useDemo);
  const row = await load(user, week, active);
  return viewOf(row.items, row.applied);
}

export async function changeFocusPlan(user: PublicUser, body: unknown, useDemo?: boolean) {
  const parsed = focusActionSchema.safeParse(body);
  if (!parsed.success) throw new FocusPlanError('Check the request and try again.');
  if (!calendarDateSchema.safeParse(parsed.data.week).success) throw new FocusPlanError('Check the date.');
  const action = parsed.data;
  const active = demo(useDemo);
  const row = await load(user, action.week, active);
  if (action.action === 'undo') {
    const record = row.applied.find(item => item.id === action.id);
    if (!record) throw new FocusPlanError('That suggestion is not applied.');
    const next = active ? await undoAndSave(user, row, record, active) : await undoDatabase(user, row, record);
    return viewOf(next.items, next.applied);
  }
  const ids = [...new Set(action.ids)];
  const next = active ? await applyDemo(user, row, ids, active) : await applyDatabase(user, row, ids);
  return viewOf(next.items, next.applied);
}

async function undoAndSave(user: PublicUser, row: Stored, record: AppliedRecord, useDemo: boolean) {
  await undoRecord(user, record, useDemo);
  row.applied = row.applied.filter(item => item.id !== record.id);
  writeMemory(row);
  return row;
}
