import { bodyFlow, dayZero, gaps, jointShade, loggedWeeks, shade, type CardioEntry, type LoggedSet } from '../../shared/body-flow';
import { localDay, memberOffsetMinutes } from './local-day';
import { focusLevelFor, memberLevel } from '../../shared/member-level';
import { memberSignals } from './member-signals';
import { cardioMinutesPerWeekTarget, targetBand } from '../../shared/focus-targets';
import { jointTargets } from '../../shared/joint-map';
import { exercise } from '../../shared/exercises';
import { gymExerciseId, gymFlowItem } from '../../shared/gym-flows';
import { muscleAreas } from '../../shared/muscle-map';
import { trainingCatalog } from '../../shared/training-seed';
import { graduatedFlowCount } from './graduation-store';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';

type BodyFlowRange = 'week' | 'month' | 'start';
type TrainingLogRow = { id: string; sessionId: string; planDate: string; status: 'done' | 'skipped' };
type TrainingSetRow = { logId: string; blockId: string; values: Record<string, unknown> };
type TrainingSessionRow = { id: string; typeId: string; blocks: { id: string; exerciseId?: string }[] };
type TrainingTypeRow = { id: string; blockFields: { key: string; input: string }[] };
type RunExerciseSetRow = {
  runId: string;
  exerciseId: string;
  status: 'done' | 'skipped';
  loggedAt: string;
  durationSeconds: number | null;
};
type FlowRunCard = {
  cardId: string;
  sourceFlowId: string;
  title: string;
  targetSeconds: number;
  status: 'pending' | 'done' | 'skipped';
  seconds: number | null;
};
type FlowRunRow = {
  id: string;
  flowId: string;
  title: string;
  status: 'running' | 'finished' | 'posted' | 'abandoned';
  updatedAt: string;
  cards: FlowRunCard[];
};

const cardioKeyword = /\b(run|running|walk|walking|cycle|cycling|swim|swimming)\b/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class BodyFlowError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function demo(flag?: boolean) {
  return flag ?? demoModeEnabled(process.env);
}

function asJson<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function asDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function isSkipped(values: Record<string, unknown>) {
  return values._skip === true;
}

function parseDate(value: string) {
  if (!datePattern.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) ? time : null;
}

function addDays(date: string, days: number) {
  const at = parseDate(date);
  if (at == null) return date;
  return new Date(at + days * 86400000).toISOString().slice(0, 10);
}

function monday(date: string) {
  const at = parseDate(date);
  if (at == null) return date;
  const day = new Date(at).getUTCDay();
  const weekday = day === 0 ? 7 : day;
  return addDays(date, 1 - weekday);
}

function monthStart(date: string) {
  const [year, month] = date.split('-');
  if (!year || !month) return date;
  return `${year}-${month}-01`;
}

function isCardioExercise(exerciseId: string) {
  const row = exercise(exerciseId);
  if (!row) return false;
  return (
    row.equipment === 'cardio' ||
    row.equipment === 'bike' ||
    row.equipment === 'treadmill' ||
    row.equipment === 'erg' ||
    row.station === 'running' ||
    row.station === 'bike' ||
    row.station === 'treadmill' ||
    row.station === 'rower'
  );
}

function isCardioType(type: TrainingTypeRow | undefined) {
  if (!type) return false;
  const hasDuration = type.blockFields.some(field => field.input === 'duration');
  const hasDistance = type.blockFields.some(field => field.input === 'distance');
  return hasDuration && hasDistance;
}

function flowCards(state: unknown): FlowRunCard[] {
  if (!state || typeof state !== 'object') return [];
  const cards = (state as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) return [];
  return cards
    .map(card => {
      if (!card || typeof card !== 'object') return null;
      const row = card as Record<string, unknown>;
      const status = row.status;
      if (status !== 'pending' && status !== 'done' && status !== 'skipped') return null;
      return {
        cardId: String(row.cardId ?? ''),
        sourceFlowId: String(row.sourceFlowId ?? ''),
        title: String(row.title ?? ''),
        targetSeconds: Number(row.targetSeconds ?? 0),
        status,
        seconds: row.seconds == null ? null : Number(row.seconds),
      } as FlowRunCard;
    })
    .filter((card): card is FlowRunCard => card !== null && Boolean(card.cardId));
}

function flowLooksCardio(run: FlowRunRow) {
  if (cardioKeyword.test(run.flowId) || cardioKeyword.test(run.title)) return true;
  for (const card of run.cards) {
    if (cardioKeyword.test(card.sourceFlowId) || cardioKeyword.test(card.title)) return true;
    const exerciseId = gymExerciseId(card.cardId);
    if (exerciseId && isCardioExercise(exerciseId)) return true;
  }
  return false;
}

async function trainingRows(userId: string, from: string, to: string, useDemo: boolean) {
  if (useDemo) {
    const seeded = trainingCatalog();
    const state = (globalThis as { qramTraining?: { logs?: unknown[]; sets?: unknown[]; sessions?: unknown[]; types?: unknown[] } }).qramTraining;
    const owned = (state?.logs ?? [])
      .map(row => row as Record<string, unknown>)
      .map(
        row =>
          ({
            id: String(row.id),
            userId: String(row.userId),
            sessionId: String(row.sessionId),
            planDate: String(row.planDate),
            status: row.status === 'skipped' ? 'skipped' : 'done',
          }) as TrainingLogRow & { userId: string },
      )
      .filter(row => row.userId === userId && inRange(row.planDate, from, to))
      .map(row => ({ id: row.id, sessionId: row.sessionId, planDate: row.planDate, status: row.status }));
    const byLog = new Set(owned.map(row => row.id));
    const sets = (state?.sets ?? [])
      .map(row => row as Record<string, unknown>)
      .map(
        row =>
          ({
            logId: String(row.logId),
            blockId: String(row.blockId),
            values: row.values && typeof row.values === 'object' ? (row.values as Record<string, unknown>) : {},
          }) as TrainingSetRow,
      )
      .filter(row => byLog.has(row.logId));
    const sessions = new Map<string, TrainingSessionRow>(
      (state?.sessions ?? seeded.sessions)
        .map(row => row as { id: string; typeId: string; blocks: { id: string; exerciseId?: string }[] })
        .map(row => [row.id, { id: row.id, typeId: row.typeId, blocks: row.blocks.map(block => ({ id: block.id, exerciseId: block.exerciseId })) }]),
    );
    const types = new Map<string, TrainingTypeRow>(
      (state?.types ?? seeded.types)
        .map(row => row as { id: string; blockFields: { key: string; input: string }[] })
        .map(row => [row.id, { id: row.id, blockFields: row.blockFields.map(field => ({ key: field.key, input: field.input })) }]),
    );
    return { logs: owned, sets, sessions, types };
  }
  const { database } = await import('./database');
  const sql = database();
  const logs = (await sql`SELECT id, session_id, plan_date, status FROM training_logs
      WHERE user_id=${userId} AND plan_date BETWEEN ${from} AND ${to}`) as Record<string, unknown>[];
  const logRows: TrainingLogRow[] = logs.map(row => ({
    id: String(row.id),
    sessionId: String(row.session_id),
    planDate: asDate(row.plan_date),
    status: row.status === 'skipped' ? 'skipped' : 'done',
  }));
  const logIds = [...new Set(logRows.map(row => row.id))];
  const setsRows = logIds.length
    ? ((await sql`SELECT log_id, block_id, values FROM training_log_sets WHERE log_id=ANY(${logIds}::text[])`) as Record<string, unknown>[])
    : [];
  const setRows: TrainingSetRow[] = setsRows.map(row => ({
    logId: String(row.log_id),
    blockId: String(row.block_id),
    values: asJson<Record<string, unknown>>(row.values),
  }));
  const sessionIds = [...new Set(logRows.map(row => row.sessionId))];
  const sessionsRows = sessionIds.length
    ? ((await sql`SELECT id, type_id, blocks FROM training_sessions WHERE id=ANY(${sessionIds}::text[])`) as Record<string, unknown>[])
    : [];
  const sessionMap = new Map<string, TrainingSessionRow>(
    sessionsRows.map(row => [
      String(row.id),
      {
        id: String(row.id),
        typeId: String(row.type_id),
        blocks: asJson<{ id: string; exerciseId?: string }[]>(row.blocks).map(block => ({ id: String(block.id), ...(block.exerciseId ? { exerciseId: String(block.exerciseId) } : {}) })),
      },
    ]),
  );
  const typeIds = [...new Set([...sessionMap.values()].map(row => row.typeId))];
  const typeRows = typeIds.length
    ? ((await sql`SELECT id, block_fields FROM training_types WHERE id=ANY(${typeIds}::text[])`) as Record<string, unknown>[])
    : [];
  const typeMap = new Map<string, TrainingTypeRow>(
    typeRows.map(row => [
      String(row.id),
      {
        id: String(row.id),
        blockFields: asJson<{ key: string; input: string }[]>(row.block_fields).map(field => ({ key: String(field.key), input: String(field.input) })),
      },
    ]),
  );
  return { logs: logRows, sets: setRows, sessions: sessionMap, types: typeMap };
}

async function runSetRows(userId: string, from: string, to: string, useDemo: boolean): Promise<RunExerciseSetRow[]> {
  const offset = await memberOffsetMinutes(userId, useDemo);
  if (useDemo) {
    const rows = (globalThis as { qramExerciseLogs?: unknown[] }).qramExerciseLogs ?? [];
    return rows
      .map(row => row as Record<string, unknown>)
      .filter(row => String(row.userId) === userId && row.runId != null)
      .map(row => {
        const status: RunExerciseSetRow['status'] =
          row.detail && typeof row.detail === 'object' && (row.detail as Record<string, unknown>).status === 'skipped'
            ? 'skipped'
            : 'done';
        return {
          runId: String(row.runId),
          exerciseId: String(row.exerciseId),
          status,
          loggedAt: String(row.loggedAt),
          durationSeconds: row.durationSeconds == null ? null : Number(row.durationSeconds),
        };
      })
      .filter(row => inRange(localDay(row.loggedAt, offset), from, to));
  }
  const { database } = await import('./database');
  const rows = (await database()`SELECT run_id, exercise_id, status, logged_at, duration_seconds
      FROM exercise_logs
      WHERE user_id=${userId} AND run_id IS NOT NULL
        AND ((logged_at AT TIME ZONE 'UTC') + make_interval(mins => ${offset}))::date BETWEEN ${from} AND ${to}`) as Record<string, unknown>[];
  return rows.map(row => ({
    runId: String(row.run_id),
    exerciseId: String(row.exercise_id),
    status: row.status === 'skipped' ? 'skipped' : 'done',
    loggedAt: new Date(String(row.logged_at)).toISOString(),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
  }));
}

async function flowRunRows(userId: string, from: string, to: string, useDemo: boolean): Promise<FlowRunRow[]> {
  const offset = await memberOffsetMinutes(userId, useDemo);
  if (useDemo) {
    const rows = (globalThis as { qramFlowRuns?: { runs: unknown[] } }).qramFlowRuns?.runs ?? [];
    return rows
      .map(row => row as Record<string, unknown>)
      .filter(row => String(row.userId) === userId)
      .filter(row => {
        const status = String(row.status);
        return status === 'finished' || status === 'posted';
      })
      .map(row => ({
        id: String(row.id),
        flowId: String(row.flowId),
        title: String(row.title ?? ''),
        status: String(row.status) as FlowRunRow['status'],
        updatedAt: String(row.updatedAt),
        cards: flowCards(row.state),
      }))
      .filter(run => inRange(localDay(run.updatedAt, offset), from, to));
  }
  const { database } = await import('./database');
  const rows = (await database()`SELECT id, flow_id, title, status, updated_at, state
      FROM flow_runs
      WHERE user_id=${userId}
        AND status IN ('finished', 'posted')
        AND ((updated_at AT TIME ZONE 'UTC') + make_interval(mins => ${offset}))::date BETWEEN ${from} AND ${to}`) as Record<string, unknown>[];
  return rows.map(row => ({
    id: String(row.id),
    flowId: String(row.flow_id),
    title: String(row.title ?? ''),
    status: row.status === 'posted' ? 'posted' : 'finished',
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    cards: flowCards(asJson(row.state)),
  }));
}

function distanceMinutes(values: Record<string, unknown>, keys: string[]) {
  let minutes = 0;
  for (const key of keys) {
    const value = values[key];
    if (typeof value !== 'number' || value <= 0) continue;
    // Approximation when only distance is logged: 10 min per kilometer (100 m/min).
    // This keeps cardio visible while avoiding overly aggressive assumptions.
    minutes += value / 100;
  }
  return minutes;
}

async function trainingDerived(userId: string, from: string, to: string, useDemo: boolean) {
  const rows = await trainingRows(userId, from, to, useDemo);
  const byLog = new Map<string, TrainingSetRow[]>();
  for (const set of rows.sets) {
    const list = byLog.get(set.logId) ?? [];
    list.push(set);
    byLog.set(set.logId, list);
  }
  const sets: LoggedSet[] = [];
  const cardio: CardioEntry[] = [];
  for (const log of rows.logs) {
    const session = rows.sessions.get(log.sessionId);
    if (!session || log.status !== 'done') continue;
    const type = rows.types.get(session.typeId);
    const durationKeys = (type?.blockFields ?? []).filter(field => field.input === 'duration').map(field => field.key);
    const distanceKeys = (type?.blockFields ?? []).filter(field => field.input === 'distance').map(field => field.key);
    const byBlock = new Map(session.blocks.map(block => [block.id, block]));
    for (const row of byLog.get(log.id) ?? []) {
      const block = byBlock.get(row.blockId);
      if (!block) continue;
      const skipped = isSkipped(row.values);
      if (block.exerciseId) sets.push({ date: log.planDate, exerciseId: block.exerciseId, skipped });
      if (skipped) continue;
      const cardioBlock = block.exerciseId ? isCardioExercise(block.exerciseId) : isCardioType(type);
      if (!cardioBlock) continue;
      const durationSeconds = durationKeys.reduce((sum, key) => {
        const value = row.values[key];
        return sum + (typeof value === 'number' && value > 0 ? value : 0);
      }, 0);
      if (durationSeconds > 0) {
        cardio.push({ date: log.planDate, minutes: durationSeconds / 60 });
        continue;
      }
      const minutes = distanceMinutes(row.values, distanceKeys);
      if (minutes > 0) cardio.push({ date: log.planDate, minutes });
    }
  }
  return { sets, cardio };
}

function fallbackFlowRunSets(runs: FlowRunRow[], runSetRowsForRange: RunExerciseSetRow[], offset: number) {
  // A run that logged any sets is counted from those rows alone. Doing fewer than the
  // plan must not invent the missing ones. Only a run with no set rows at all, from
  // before sets were stored, falls back to the plan so old work still shows.
  const runsWithLogs = new Set(runSetRowsForRange.map(row => row.runId));
  const added: LoggedSet[] = [];
  for (const run of runs) {
    if (runsWithLogs.has(run.id)) continue;
    const date = localDay(run.updatedAt, offset);
    for (const card of run.cards) {
      if (card.status !== 'done') continue;
      const exerciseId = gymExerciseId(card.cardId);
      if (!exerciseId) continue;
      const planned = gymFlowItem(run.flowId, exerciseId)?.sets;
      if (!planned) continue;
      for (let index = 0; index < planned; index += 1) added.push({ date, exerciseId });
    }
  }
  return added;
}

export async function loggedSetsFor(userId: string, from: string, to: string, useDemo?: boolean): Promise<LoggedSet[]> {
  const activeDemo = demo(useDemo);
  const [{ sets: trainingSets }, runRows, runSetRowsForRange] = await Promise.all([
    trainingDerived(userId, from, to, activeDemo),
    flowRunRows(userId, from, to, activeDemo),
    runSetRows(userId, from, to, activeDemo),
  ]);
  const offset = await memberOffsetMinutes(userId, activeDemo);
  const runSetLogs: LoggedSet[] = runSetRowsForRange.map(row => ({
    date: localDay(row.loggedAt, offset),
    exerciseId: row.exerciseId,
    skipped: row.status === 'skipped',
  }));
  const fallback = fallbackFlowRunSets(runRows, runSetRowsForRange, offset);
  return [...trainingSets, ...runSetLogs, ...fallback];
}

export async function cardioFor(userId: string, from: string, to: string, useDemo?: boolean): Promise<CardioEntry[]> {
  const activeDemo = demo(useDemo);
  const [{ cardio: trainingCardio }, runRows, runSetRowsForRange] = await Promise.all([
    trainingDerived(userId, from, to, activeDemo),
    flowRunRows(userId, from, to, activeDemo),
    runSetRows(userId, from, to, activeDemo),
  ]);
  const offset = await memberOffsetMinutes(userId, activeDemo);
  const runSetCardio: CardioEntry[] = [];
  const runWithDuration = new Set<string>();
  for (const row of runSetRowsForRange) {
    if (row.status === 'skipped' || !isCardioExercise(row.exerciseId) || row.durationSeconds == null || row.durationSeconds <= 0) continue;
    runWithDuration.add(row.runId);
    runSetCardio.push({ date: localDay(row.loggedAt, offset), minutes: row.durationSeconds / 60 });
  }
  const runCardio: CardioEntry[] = [];
  for (const run of runRows) {
    if (!flowLooksCardio(run) || runWithDuration.has(run.id)) continue;
    const seconds = run.cards
      .filter(card => card.status === 'done')
      .reduce((sum, card) => {
        const value = card.seconds ?? (card.targetSeconds > 0 ? card.targetSeconds : 0);
        return sum + (Number.isFinite(value) && value > 0 ? value : 0);
      }, 0);
    if (seconds > 0) runCardio.push({ date: localDay(run.updatedAt, offset), minutes: seconds / 60 });
  }
  return [...trainingCardio, ...runSetCardio, ...runCardio];
}

function ensureDate(date: string) {
  if (!parseDate(date)) throw new BodyFlowError('Check the request and try again.');
  return date;
}

function ensureRange(input: string | null): BodyFlowRange {
  if (input === 'week' || input === 'month' || input === 'start') return input;
  throw new BodyFlowError('Check the request and try again.');
}

function historyStart() {
  return '1970-01-01';
}

export async function bodyFlowGet(
  url: string,
  deps: { user: PublicUser | null; allow: boolean; demo?: boolean },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!deps.user) return { status: 401, body: { error: 'Please log in to continue.' } };
  if (!deps.allow) return { status: 429, body: { error: 'Please slow down.' } };
  const member = deps.user;
  try {
    const params = new URL(url).searchParams;
    const range = ensureRange(params.get('range'));
    const to = ensureDate(params.get('date') ?? '');
    const activeDemo = demo(deps.demo);
    const historySets = await loggedSetsFor(member.id, historyStart(), to, activeDemo);
    const zero = dayZero(historySets);
    const from = range === 'week' ? monday(to) : range === 'month' ? monthStart(to) : zero ?? to;
    const sets = range === 'start' && zero ? historySets.filter(set => inRange(set.date, from, to)) : await loggedSetsFor(member.id, from, to, activeDemo);
    const cardio = await cardioFor(member.id, from, to, activeDemo);
    const result = bodyFlow(sets, cardio, { from, to });
    const weeks = loggedWeeks(historySets);
    const signals = await memberSignals(member.id, activeDemo);
    const graduatedFlows = await graduatedFlowCount(member, activeDemo);
    const level = focusLevelFor(
      memberLevel({
        loggedWeeks: weeks,
        lifts: signals?.lifts ?? {},
        bodyKg: signals?.bodyKg,
        lifestyle: signals?.lifestyle,
        graduatedFlows,
      }).level,
    );
    const titleByArea = new Map(muscleAreas.map(area => [area.id, area.title]));
    return {
      status: 200,
      body: {
        dayZero: zero,
        from,
        to,
        level,
        loggedWeeks: weeks,
        graduatedFlows,
        areas: result.areas.map(area => {
          const weekly = targetBand(area.area, level);
          const low = weekly.low * result.weeks;
          const high = weekly.high * result.weeks;
          return {
            area: area.area,
            title: titleByArea.get(area.area) ?? area.area,
            sets: area.sets,
            mainSets: area.mainSets,
            helperSets: area.helperSets,
            shade: shade(area.sets, weekly, result.weeks),
            band: { low, high },
            lastDate: area.lastDate,
            exercises: area.exercises.map(row => ({ exerciseId: row.exerciseId, name: exercise(row.exerciseId)?.name ?? row.exerciseId, sets: row.sets })),
          };
        }),
        joints: result.joints.map(joint => ({
          joint: joint.joint,
          title: joint.title,
          days: joint.days,
          sets: joint.sets,
          shade: jointShade(joint.days, result.weeks),
          // Per week. The shade above is this band scaled by the weeks in the range.
          band: { low: jointTargets.low, high: jointTargets.high },
          lastDate: joint.lastDate,
          exercises: joint.exercises.map(row => ({ exerciseId: row.exerciseId, name: exercise(row.exerciseId)?.name ?? row.exerciseId, sets: row.sets })),
        })),
        cardio: { minutes: result.cardioMinutes, target: cardioMinutesPerWeekTarget * result.weeks },
        gaps: gaps(result, level),
      },
    };
  } catch (error) {
    if (error instanceof BodyFlowError) return { status: error.status, body: { error: error.message } };
    return { status: 503, body: { error: 'Service temporarily unavailable. Please try again.' } };
  }
}
