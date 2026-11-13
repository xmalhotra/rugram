import { z } from 'zod';
import { localDay, memberOffsetMinutes } from './local-day';
import { exercise } from '../../shared/exercises';
import { flows } from '../../shared/mobile';
import { trainingCatalog } from '../../shared/training-seed';
import {
  blockFields,
  fieldRole,
  knownFlowIds,
  liveProblems,
  parsePlan,
  parsePlanItems,
  parseSession,
  parseTrainingType,
  planDay,
  TrainingError,
  validateLogValues,
  weekOf,
  type LogMark,
  type LogValue,
  type PlanItem,
  type PlanSlot,
  type TrainingPlan,
  type TrainingSession,
  type TrainingType,
} from '../../shared/training';
import { howToGeneral, parseHowTo, seededHowTos, type ExerciseHowTo } from '../../shared/exercise-how-to';
import { parseScheme, seededSchemes, type SetScheme } from '../../shared/set-scheme-math';
import { customflowKey } from '../../shared/customflows';
import { demoModeEnabled } from './runtime-config';
import { readCustomflows } from './customflow-store';
import type { PublicUser } from './types';
import { assertRecordedTime } from '../../shared/set-detail';
import { ExerciseLogError, logExerciseSets, readExerciseSessions, setDetailSchema, type ExerciseLogInput } from './exercise-log-store';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slug = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,78}$/);

const setInput = z
  .object({
    index: z.number().int().min(1).max(30),
    skipped: z.boolean().optional(),
    values: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
    detail: setDetailSchema.optional(),
  })
  .strict();

const blockInput = z
  .object({
    id: slug,
    skipped: z.boolean().optional(),
    /** The exercise these sets were done as. Omitted means the member's swap, or the block's own exercise. */
    exerciseId: slug.optional(),
    sets: z.array(setInput).max(30).optional(),
  })
  .strict();

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('use-plan'), planId: slug, startDate: dateSchema }).strict(),
  z.object({ action: z.literal('stop-plan') }).strict(),
  z
    .object({
      action: z.literal('set-day'),
      week: z.number().int().min(1).max(52),
      weekday: z.number().int().min(1).max(7),
      items: z.array(z.unknown()).max(8),
      startDate: dateSchema.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('swap-days'),
      weekA: z.number().int().min(1).max(52),
      weekdayA: z.number().int().min(1).max(7),
      weekB: z.number().int().min(1).max(52),
      weekdayB: z.number().int().min(1).max(7),
    })
    .strict(),
  z
    .object({
      action: z.literal('log'),
      sessionId: slug,
      planDate: dateSchema,
      sessionValues: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
      blocks: z.array(blockInput).min(1).max(20),
    })
    .strict(),
  z.object({ action: z.literal('skip'), sessionId: slug, planDate: dateSchema }).strict(),
  z.object({ action: z.literal('post'), sessionId: slug, planDate: dateSchema, note: z.string().max(280).optional() }).strict(),
  z.object({ action: z.literal('upsert-type'), type: z.unknown() }).strict(),
  z.object({ action: z.literal('upsert-scheme'), scheme: z.unknown() }).strict(),
  z.object({ action: z.literal('upsert-how-to'), howTo: z.unknown() }).strict(),
  z.object({ action: z.literal('upsert-session'), session: z.unknown() }).strict(),
  z.object({ action: z.literal('upsert-plan'), plan: z.unknown() }).strict(),
  z
    .object({
      action: z.literal('set-status'),
      kind: z.enum(['type', 'session', 'plan']),
      id: slug,
      status: z.enum(['draft', 'live']),
    })
    .strict(),
  z.object({ action: z.literal('remove'), kind: z.enum(['type', 'session', 'plan']), id: slug }).strict(),
]);

type Action = z.infer<typeof actionSchema>;

export type UserPlan = {
  id: string;
  userId: string;
  sourcePlanId: string | null;
  title: string;
  goal: string;
  level?: string;
  startDate: string;
  weeks: number;
  slots: PlanSlot[];
  active: boolean;
};

type StoredLog = {
  id: string;
  userId: string;
  sessionId: string;
  planDate: string;
  status: 'done' | 'skipped';
  sessionValues: Record<string, LogValue>;
  finishedAt: string | null;
  activityId: string | null;
  bodyWeightKg: number | null;
};

type StoredSet = {
  logId: string;
  blockId: string;
  setIndex: number;
  values: Record<string, unknown>;
  detail: Record<string, unknown> | null;
};

type StoredScheme = SetScheme & { status: 'draft' | 'live' };

type Memory = {
  types: TrainingType[];
  sessions: TrainingSession[];
  plans: TrainingPlan[];
  schemes: StoredScheme[];
  howTos: ExerciseHowTo[];
  userPlans: UserPlan[];
  logs: StoredLog[];
  sets: StoredSet[];
};

declare global {
  var qramTraining: Memory | undefined;
}

/** Demo reads can reuse this list. Clearing it forces the next read to use the stored rows. */
let schemeCache: StoredScheme[] | null = null;

export type TrainingDeps = {
  demo?: boolean;
  recordActivity?: (user: PublicUser, input: { sessionId: string; title: string; note: string }) => Promise<{ id: string }>;
};

function demoMode() {
  return demoModeEnabled(process.env);
}

export function resetTrainingMemory() {
  globalThis.qramTraining = undefined;
  schemeCache = null;
}

/** Drop the demo scheme cache so the next read comes from the stored training rows. */
export function clearTrainingCache() {
  schemeCache = null;
}

function seededSchemeRows(): StoredScheme[] {
  return seededSchemes().map(scheme => ({ ...structuredClone(scheme), status: 'live' as const }));
}

function seededHowToRows(): ExerciseHowTo[] {
  return seededHowTos().map(row => structuredClone(row));
}

function schemeDefinition(scheme: StoredScheme): SetScheme {
  return {
    id: scheme.id,
    title: scheme.title,
    about: scheme.about,
    amount: scheme.amount,
    load: scheme.load,
    ...(scheme.loadSteps ? { loadSteps: scheme.loadSteps } : {}),
    ...(scheme.lastSetToFailure ? { lastSetToFailure: scheme.lastSetToFailure } : {}),
  };
}

function publishedSchemes(schemes: StoredScheme[], liveOnly: boolean): SetScheme[] {
  return schemes.filter(scheme => !liveOnly || scheme.status === 'live').map(schemeDefinition);
}

function cachedSchemes(stored: StoredScheme[]) {
  if (!schemeCache) schemeCache = stored;
  return schemeCache;
}

function memory(): Memory {
  if (!globalThis.qramTraining) {
    const seed = trainingCatalog();
    globalThis.qramTraining = {
      types: structuredClone(seed.types),
      sessions: structuredClone(seed.sessions),
      plans: structuredClone(seed.plans),
      schemes: seededSchemeRows(),
      howTos: seededHowToRows(),
      userPlans: [],
      logs: [],
      sets: [],
    };
  } else {
    const seed = trainingCatalog();
    for (const session of seed.sessions) {
      const existing = globalThis.qramTraining.sessions.find(item => item.id === session.id);
      if (!existing) {
        globalThis.qramTraining.sessions.push(structuredClone(session));
        continue;
      }
      // Seed fields added later (a block's running intensity) reach sessions already in memory.
      for (const block of existing.blocks) {
        const seeded = session.blocks.find(item => item.id === block.id);
        if (seeded?.intensity && !block.intensity) block.intensity = seeded.intensity;
      }
    }
    if (!globalThis.qramTraining.schemes) globalThis.qramTraining.schemes = seededSchemeRows();
    for (const scheme of globalThis.qramTraining.schemes) {
      if (scheme.status !== 'draft' && scheme.status !== 'live') scheme.status = 'live';
    }
    for (const scheme of seededSchemeRows()) {
      if (!globalThis.qramTraining.schemes.some(item => item.id === scheme.id)) globalThis.qramTraining.schemes.push(scheme);
    }
    if (!globalThis.qramTraining.howTos) globalThis.qramTraining.howTos = seededHowToRows();
    for (const howTo of seededHowToRows()) {
      const existing = globalThis.qramTraining.howTos.find(item => item.exerciseId === howTo.exerciseId);
      if (!existing) globalThis.qramTraining.howTos.push(howTo);
      // A video added to the seed later fills in a row that has none, without replacing one set by an admin.
      else if (!existing.videoUrl && howTo.videoUrl) existing.videoUrl = howTo.videoUrl;
    }
  }
  return globalThis.qramTraining;
}

function asJson<T>(value: unknown): T {
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}

function asDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function requireAdmin(user: PublicUser) {
  if (user.role !== 'admin') throw new TrainingError('Admin access required.', 403);
}

function flowTitle(id: string) {
  return flows.find(flow => flow.id === id)?.title ?? 'Flow';
}

function itemTitle(item: PlanItem, sessions: TrainingSession[]) {
  if (item.kind === 'rest') return item.label ?? 'Rest';
  if (item.kind === 'flow') return flowTitle(item.id);
  return sessions.find(session => session.id === item.id)?.title ?? 'Session';
}

function catalogOf(state: { types: TrainingType[]; sessions: TrainingSession[]; plans: TrainingPlan[] }) {
  return { sessions: state.sessions, types: state.types, flowIds: knownFlowIds() };
}

function publishIssue(
  kind: 'type' | 'session' | 'plan',
  id: string,
  state: { types: TrainingType[]; sessions: TrainingSession[]; plans: TrainingPlan[] },
) {
  const problem = liveProblems(kind, id, state);
  if (problem) throw new TrainingError(problem);
}

async function stateOf(demo: boolean) {
  if (demo) {
    const rows = memory();
    return { ...rows, schemes: cachedSchemes(rows.schemes) };
  }
  const { database } = await import('./database');
  const sql = database();
  const [types, sessions, plans, schemes, howTos, userPlans, logs, sets] = await Promise.all([
    sql`SELECT * FROM training_types`,
    sql`SELECT * FROM training_sessions`,
    sql`SELECT * FROM training_plans`,
    sql`SELECT * FROM training_set_schemes`,
    sql`SELECT * FROM exercise_how_to`,
    sql`SELECT * FROM user_training_plans`,
    sql`SELECT * FROM training_logs`,
    sql`SELECT * FROM training_log_sets`,
  ]);
  return {
    types: types.map(mapType),
    sessions: sessions.map(mapSession),
    plans: plans.map(mapPlan),
    schemes: schemes.map(mapScheme),
    howTos: howTos.map(mapHowTo),
    userPlans: userPlans.map(mapUserPlan),
    logs: logs.map(mapLog),
    sets: sets.map(mapSet),
  };
}

function mapHowTo(row: Record<string, unknown>): ExerciseHowTo {
  const definition = asJson<Record<string, unknown>>(row.definition);
  return parseHowTo({
    ...definition,
    exerciseId: String(row.exercise_id),
    status: row.status === 'draft' ? 'draft' : 'live',
  });
}

function mapScheme(row: Record<string, unknown>): StoredScheme {
  const definition = parseScheme(asJson(row.definition));
  return { ...definition, id: String(row.id), status: row.status === 'draft' ? 'draft' : 'live' };
}

function mapType(row: Record<string, unknown>): TrainingType {
  return {
    id: String(row.id),
    title: String(row.title),
    about: String(row.about),
    iconKey: String(row.icon_key),
    blockFields: asJson(row.block_fields),
    sessionFields: asJson(row.session_fields),
    canPost: Boolean(row.can_post),
    usesExerciseRecords: Boolean(row.uses_exercise_records),
    status: row.status === 'live' ? 'live' : 'draft',
  };
}

function readTiles(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(parsed)) return undefined;
  const tiles = parsed.filter((item): item is string => typeof item === 'string');
  return tiles.length ? tiles : undefined;
}

function mapSession(row: Record<string, unknown>): TrainingSession {
  return {
    id: String(row.id),
    typeId: String(row.type_id),
    title: String(row.title),
    goal: String(row.goal),
    level: row.level ? String(row.level) : undefined,
    note: row.note ? String(row.note) : undefined,
    catalogTiles: readTiles(row.catalog_tiles),
    blocks: asJson(row.blocks),
    status: row.status === 'live' ? 'live' : 'draft',
  };
}

function mapPlan(row: Record<string, unknown>): TrainingPlan {
  return {
    id: String(row.id),
    title: String(row.title),
    goal: String(row.goal),
    level: row.level ? String(row.level) : undefined,
    weeks: Number(row.weeks),
    slots: asJson(row.slots),
    status: row.status === 'live' ? 'live' : 'draft',
  };
}

function mapUserPlan(row: Record<string, unknown>): UserPlan {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sourcePlanId: row.source_plan_id ? String(row.source_plan_id) : null,
    title: String(row.title),
    goal: String(row.goal),
    level: row.level ? String(row.level) : undefined,
    startDate: asDate(row.start_date),
    weeks: Number(row.weeks),
    slots: asJson(row.slots),
    active: Boolean(row.active),
  };
}

function mapLog(row: Record<string, unknown>): StoredLog {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sessionId: String(row.session_id),
    planDate: asDate(row.plan_date),
    status: row.status === 'skipped' ? 'skipped' : 'done',
    sessionValues: asJson(row.session_values),
    finishedAt: row.finished_at ? new Date(String(row.finished_at)).toISOString() : null,
    activityId: row.activity_id ? String(row.activity_id) : null,
    bodyWeightKg: row.body_weight_kg == null ? null : Number(row.body_weight_kg),
  };
}

function mapSet(row: Record<string, unknown>): StoredSet {
  return {
    logId: String(row.log_id),
    blockId: String(row.block_id),
    setIndex: Number(row.set_index),
    values: asJson(row.values),
    detail: row.detail == null ? null : asJson(row.detail),
  };
}

function summaryPlan(plan: TrainingPlan) {
  return { id: plan.id, title: plan.title, goal: plan.goal, level: plan.level ?? null, weeks: plan.weeks, status: plan.status };
}

function summarySession(session: TrainingSession) {
  return { id: session.id, typeId: session.typeId, title: session.title, goal: session.goal, level: session.level ?? null, status: session.status };
}

function catalogCard(session: TrainingSession) {
  const exerciseIds = session.blocks.flatMap(block => (block.exerciseId ? [block.exerciseId] : []));
  return {
    id: session.id,
    title: session.title,
    level: session.level ?? null,
    coverExerciseId: exerciseIds[0] ?? null,
    exerciseCount: exerciseIds.length,
  };
}

type MarkedRun = { userId: string; status: string; updatedAt: string; flowId: string; state?: unknown };

/**
 * The flow a run counts as. A Customflow or a swap keeps the source on every card,
 * and that id is the one on the routine. Mixed sources (a personal flow) stay on the run's own id.
 */
function flowIdForMark(flowId: string, state: unknown) {
  // A community run is that published flow, even when every card names one source.
  if (flowId.startsWith('community-')) return flowId;
  let parsed = state;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return flowId;
    }
  }
  if (!parsed || typeof parsed !== 'object') return flowId;
  const cards = (parsed as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) return flowId;
  const sources = new Set<string>();
  for (const card of cards) {
    if (!card || typeof card !== 'object') continue;
    const id = (card as { sourceFlowId?: unknown }).sourceFlowId;
    if (typeof id === 'string' && id.length > 0) sources.add(id);
  }
  if (sources.size !== 1) return flowId;
  return [...sources][0] ?? flowId;
}

async function flowMarks(userId: string, demo: boolean): Promise<LogMark[]> {
  const offset = await memberOffsetMinutes(userId, demo);
  if (demo) {
    const runs = (globalThis as { qramFlowRuns?: { runs: MarkedRun[] } }).qramFlowRuns?.runs ?? [];
    return runs
      .filter(run => run.userId === userId && (run.status === 'finished' || run.status === 'posted'))
      .map(run => ({ planDate: localDay(run.updatedAt, offset), itemId: flowIdForMark(run.flowId, run.state), status: 'done' as const }));
  }
  const { database } = await import('./database');
  const rows = await database()`SELECT flow_id, updated_at, state FROM flow_runs WHERE user_id=${userId} AND status IN ('finished', 'posted')`;
  return rows.map(row => ({
    planDate: localDay(new Date(String(row.updated_at)), offset),
    itemId: flowIdForMark(String(row.flow_id), row.state),
    status: 'done' as const,
  }));
}

/** Finished or posted flow runs, and done training logs, inside an inclusive date range. */
export async function routineCompletions(userId: string, demo: boolean, from: string, to: string) {
  const [marks, state] = await Promise.all([flowMarks(userId, demo), stateOf(demo)]);
  const inRange = (date: string) => date >= from && date <= to;
  return [
    ...marks
      .filter(mark => mark.status === 'done' && inRange(mark.planDate))
      .map(mark => ({
        itemKind: mark.itemId.startsWith('community-') ? ('community' as const) : ('flow' as const),
        itemId: mark.itemId,
        date: mark.planDate,
      })),
    ...state.logs
      .filter(log => log.userId === userId && log.status === 'done' && inRange(log.planDate))
      .map(log => ({ itemKind: 'session' as const, itemId: log.sessionId, date: log.planDate })),
  ];
}

function weekBody(plan: UserPlan | null, date: string, logs: StoredLog[], sessions: TrainingSession[], marks: LogMark[]) {
  const logMarks: LogMark[] = [
    ...marks,
    ...logs.filter(log => !plan || log.userId === plan.userId).map(log => ({ planDate: log.planDate, itemId: log.sessionId, status: log.status })),
  ];
  const days = weekOf(plan, plan?.startDate ?? null, date, logMarks).map(day => ({
    date: day.date,
    week: day.week,
    weekday: day.weekday,
    status: day.status,
    items: day.items.map(item => ({
      kind: item.kind,
      id: item.kind === 'rest' ? null : item.id,
      title: itemTitle(item, sessions),
      optional: item.kind === 'rest' ? false : Boolean(item.optional),
      label: item.kind === 'rest' ? (item.label ?? 'Rest') : null,
      status:
        item.kind === 'rest'
          ? 'rest'
          : (logMarks.find(log => log.planDate === day.date && log.itemId === item.id)?.status ?? 'open'),
    })),
  }));
  return {
    active: Boolean(plan),
    plan: plan
      ? { id: plan.id, sourcePlanId: plan.sourcePlanId, title: plan.title, goal: plan.goal, level: plan.level ?? null, startDate: plan.startDate, weeks: plan.weeks }
      : null,
    days,
  };
}

function activePlan(state: Memory, userId: string) {
  return state.userPlans.find(plan => plan.userId === userId && plan.active) ?? null;
}

function replaceSlot(slots: PlanSlot[], week: number, weekday: PlanSlot['weekday'], items: PlanItem[]) {
  const next = slots.filter(slot => !(slot.week === week && slot.weekday === weekday));
  if (items.length) next.push({ week, weekday, items });
  return next;
}

async function saveUserPlan(plan: UserPlan, demo: boolean, replaceId?: string) {
  if (demo) {
    const rows = memory();
    rows.userPlans = rows.userPlans.map(row => (row.userId === plan.userId && row.active ? { ...row, active: false } : row));
    rows.userPlans = rows.userPlans.filter(row => row.id !== plan.id);
    rows.userPlans.push(plan);
    return;
  }
  const { database } = await import('./database');
  const sql = database();
  await sql.transaction([
    sql`UPDATE user_training_plans SET active=false WHERE user_id=${plan.userId} AND active=true AND id<>${plan.id}`,
    replaceId
      ? sql`UPDATE user_training_plans SET title=${plan.title}, goal=${plan.goal}, level=${plan.level ?? null}, start_date=${plan.startDate}, weeks=${plan.weeks}, slots=${JSON.stringify(plan.slots)}::jsonb, active=${plan.active}, source_plan_id=${plan.sourcePlanId} WHERE id=${plan.id} AND user_id=${plan.userId}`
      : sql`INSERT INTO user_training_plans (id, user_id, source_plan_id, title, goal, level, start_date, weeks, slots, active)
          VALUES (${plan.id}, ${plan.userId}, ${plan.sourcePlanId}, ${plan.title}, ${plan.goal}, ${plan.level ?? null}, ${plan.startDate}, ${plan.weeks}, ${JSON.stringify(plan.slots)}::jsonb, ${plan.active})`,
  ]);
}

function skipValue(values: Record<string, unknown>) {
  return values._skip === true;
}

function loggedValues(values: Record<string, unknown>): Record<string, LogValue> | null {
  if (skipValue(values)) return null;
  const next: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'number' || typeof value === 'boolean') next[key] = value;
  }
  return next;
}

function columnDetail(detail: z.infer<typeof setDetailSchema> | undefined, skipped: boolean) {
  if (!detail && !skipped) return null;
  try {
    assertRecordedTime(detail?.startedAt, Date.now());
    assertRecordedTime(detail?.completedAt, Date.now());
  } catch (error) {
    throw new TrainingError(error instanceof Error ? error.message : 'Check the time and try again.');
  }
  const status = skipped || detail?.status === 'skipped' ? 'skipped' : 'done';
  return {
    status,
    planned_weight_kg: detail?.plannedWeightKg ?? null,
    planned_reps: detail?.plannedReps ?? null,
    planned_seconds: detail?.plannedSeconds ?? null,
    scheme_id: detail?.schemeId ?? null,
    started_at: detail?.startedAt ?? null,
    completed_at: detail?.completedAt ?? null,
    rest_before_seconds: detail?.restBeforeSeconds ?? null,
    rest_planned_seconds: detail?.restPlannedSeconds ?? null,
    time_source: detail?.timeSource ?? null,
    edited: status === 'done' && detail?.edited === true,
  };
}

async function memberWeight(userId: string, demo: boolean) {
  if (demo) return globalThis.qramFlowRuns?.metrics.find(row => row.userId === userId)?.weightKg ?? null;
  const { database } = await import('./database');
  const [row] = await database()`SELECT weight_kg FROM user_metrics WHERE user_id=${userId}`;
  return row?.weight_kg == null ? null : Number(row.weight_kg);
}

async function sessionSwaps(user: PublicUser, sessionId: string) {
  const flows = await readCustomflows(user);
  return flows[customflowKey('qram-session', sessionId)]?.changes.swaps ?? {};
}

function loggedExerciseId(block: { exerciseId?: string }, swap: string | undefined, requested: string | undefined) {
  const original = block.exerciseId;
  const replacement = swap && original && swap !== original ? swap : undefined;
  if (!requested) return replacement ?? original;
  if (!original) throw new TrainingError('That block has no exercise.');
  if (requested !== original && requested !== replacement) throw new TrainingError('That exercise is not this block.');
  return requested;
}

/** The session with each block's exercise set to the one the member actually did. */
function withLoggedExercises<T extends TrainingSession>(
  session: T,
  swaps: Record<string, string>,
  blocks: { id: string; exerciseId?: string }[],
): T {
  return {
    ...session,
    blocks: session.blocks.map(block => {
      const incoming = blocks.find(item => item.id === block.id);
      const exerciseId = loggedExerciseId(block, swaps[block.id], incoming?.exerciseId);
      if (!exerciseId || exerciseId === block.exerciseId) return block;
      return { ...block, exerciseId };
    }),
  };
}

async function writeExerciseRecords(
  user: PublicUser,
  session: TrainingSession,
  type: TrainingType,
  blocks: { id: string; skipped?: boolean; sets?: { index: number; skipped?: boolean; values?: Record<string, LogValue>; detail?: z.infer<typeof setDetailSchema> }[] }[],
  demo: boolean,
) {
  if (!type.usesExerciseRecords) return;
    const grouped = new Map<string, ExerciseLogInput['sets']>();
  for (const block of session.blocks) {
    if (!block.exerciseId) continue;
    const move = exercise(block.exerciseId);
    if (!move) continue;
    const incoming = blocks.find(item => item.id === block.id);
    if (!incoming || (incoming.skipped && !(incoming.sets?.length))) continue;
    const fields = blockFields(type, block);
    const weight = fields.find(field => fieldRole(field) === 'weight');
    const reps = fields.find(field => fieldRole(field) === 'reps');
    const seconds = fields.find(field => fieldRole(field) === 'seconds');
    if (!reps && !seconds) continue;
    for (const set of incoming.sets ?? []) {
      const skipped = set.skipped === true;
      const values = set.values ?? {};
      const rawReps = reps ? values[reps.key] : null;
      const rawSeconds = seconds ? values[seconds.key] : null;
      const rawWeight = weight ? values[weight.key] : null;
      const repValue = typeof rawReps === 'number' ? rawReps : null;
      const secondValue = typeof rawSeconds === 'number' ? rawSeconds : null;
      if (!skipped && repValue == null && secondValue == null) continue;
      const weightValue = typeof rawWeight === 'number' ? rawWeight : null;
      const list = grouped.get(block.exerciseId) ?? [];
      list.push({
        setIndex: list.length + 1,
        weightKg: skipped || move.load === 'bodyweight' ? null : weightValue,
        reps: skipped ? null : repValue,
        durationSeconds: skipped ? null : secondValue,
        ...(set.detail || skipped
          ? { detail: { ...(set.detail ?? {}), status: skipped ? ('skipped' as const) : (set.detail?.status ?? 'done') } }
          : {}),
      });
      grouped.set(block.exerciseId, list);
    }
  }
  for (const [exerciseId, sets] of grouped) {
    if (!sets.length) continue;
    await logExerciseSets(user, { action: 'log', exerciseId, sets }, { demo });
  }
}

function assertComplete(
  session: TrainingSession,
  type: TrainingType,
  blocks: { id: string; skipped?: boolean; sets?: { index: number; skipped?: boolean; values?: Record<string, LogValue> }[] }[],
  sessionValues: Record<string, LogValue>,
) {
  validateLogValues(type, sessionValues, 'session');
  for (const block of session.blocks) {
    const incoming = blocks.find(item => item.id === block.id);
    if (!incoming) throw new TrainingError('Finish or skip every block.');
    if (incoming.skipped) continue;
    const sets = incoming.sets ?? [];
    const indexes = sets.map(set => set.index);
    if (new Set(indexes).size !== block.sets || indexes.some(index => index < 1 || index > block.sets) || sets.length !== block.sets)
      throw new TrainingError('Finish or skip every set.');
    const fields = blockFields(type, block);
    for (const set of sets) {
      if (set.skipped) continue;
      validateLogValues(type, set.values ?? {}, 'block', fields);
    }
  }
}

async function saveLog(log: StoredLog, sets: StoredSet[], demo: boolean) {
  if (demo) {
    const rows = memory();
    const previous = rows.logs.filter(item => item.userId === log.userId && item.sessionId === log.sessionId && item.planDate === log.planDate);
    const ids = new Set(previous.map(item => item.id));
    rows.logs = rows.logs.filter(item => !ids.has(item.id));
    rows.sets = rows.sets.filter(item => !ids.has(item.logId));
    rows.logs.push(log);
    rows.sets.push(...sets);
    return;
  }
  const { database } = await import('./database');
  const sql = database();
  const removal = sql`DELETE FROM training_logs WHERE user_id=${log.userId} AND session_id=${log.sessionId} AND plan_date=${log.planDate}`;
  const insert = sql`INSERT INTO training_logs (id, user_id, session_id, plan_date, status, session_values, finished_at, activity_id, body_weight_kg)
    VALUES (${log.id}, ${log.userId}, ${log.sessionId}, ${log.planDate}, ${log.status}, ${JSON.stringify(log.sessionValues)}::jsonb, ${log.finishedAt}, ${log.activityId}, ${log.bodyWeightKg})`;
  const setRows = sets.map(
    set =>
      sql`INSERT INTO training_log_sets (log_id, block_id, set_index, values, detail) VALUES (${set.logId}, ${set.blockId}, ${set.setIndex}, ${JSON.stringify(set.values)}::jsonb, ${set.detail ? JSON.stringify(set.detail) : null}::jsonb)`,
  );
  await sql.transaction([removal, insert, ...setRows]);
}

async function persistDefinitions(
  demo: boolean,
  next: { types: TrainingType[]; sessions: TrainingSession[]; plans: TrainingPlan[]; schemes?: StoredScheme[]; howTos?: ExerciseHowTo[] },
  previousIds: { types: string[]; sessions: string[]; plans: string[]; schemes?: string[]; howTos?: string[] },
) {
  if (demo) {
    const rows = memory();
    rows.types = next.types;
    rows.sessions = next.sessions;
    rows.plans = next.plans;
    if (next.schemes) rows.schemes = next.schemes;
    if (next.howTos) rows.howTos = next.howTos;
    schemeCache = null;
    return;
  }
  const { database } = await import('./database');
  const sql = database();
  const goneTypes = previousIds.types.filter(id => !next.types.some(item => item.id === id));
  const goneSessions = previousIds.sessions.filter(id => !next.sessions.some(item => item.id === id));
  const gonePlans = previousIds.plans.filter(id => !next.plans.some(item => item.id === id));
  const schemes = next.schemes;
  const goneSchemes = (previousIds.schemes ?? []).filter(id => !schemes?.some(item => item.id === id));
  const howTos = next.howTos;
  const goneHowTos = (previousIds.howTos ?? []).filter(id => !howTos?.some(item => item.exerciseId === id));
  await sql.transaction([
    ...gonePlans.map(id => sql`DELETE FROM training_plans WHERE id=${id}`),
    ...goneSessions.map(id => sql`DELETE FROM training_sessions WHERE id=${id}`),
    ...goneTypes.map(id => sql`DELETE FROM training_types WHERE id=${id}`),
    ...(schemes ? goneSchemes.map(id => sql`DELETE FROM training_set_schemes WHERE id=${id}`) : []),
    ...(howTos ? goneHowTos.map(id => sql`DELETE FROM exercise_how_to WHERE exercise_id=${id}`) : []),
    ...next.types.map(
      type =>
        sql`INSERT INTO training_types (id, title, about, icon_key, block_fields, session_fields, can_post, uses_exercise_records, status)
          VALUES (${type.id}, ${type.title}, ${type.about}, ${type.iconKey}, ${JSON.stringify(type.blockFields)}::jsonb, ${JSON.stringify(type.sessionFields)}::jsonb, ${type.canPost}, ${type.usesExerciseRecords}, ${type.status})
          ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, about=EXCLUDED.about, icon_key=EXCLUDED.icon_key, block_fields=EXCLUDED.block_fields, session_fields=EXCLUDED.session_fields, can_post=EXCLUDED.can_post, uses_exercise_records=EXCLUDED.uses_exercise_records, status=EXCLUDED.status`,
    ),
    ...next.sessions.map(
      session =>
        sql`INSERT INTO training_sessions (id, type_id, title, goal, level, note, blocks, status, catalog_tiles)
          VALUES (${session.id}, ${session.typeId}, ${session.title}, ${session.goal}, ${session.level ?? null}, ${session.note ?? null}, ${JSON.stringify(session.blocks)}::jsonb, ${session.status}, ${JSON.stringify(session.catalogTiles ?? [])}::jsonb)
          ON CONFLICT (id) DO UPDATE SET type_id=EXCLUDED.type_id, title=EXCLUDED.title, goal=EXCLUDED.goal, level=EXCLUDED.level, note=EXCLUDED.note, blocks=EXCLUDED.blocks, status=EXCLUDED.status, catalog_tiles=EXCLUDED.catalog_tiles`,
    ),
    ...next.plans.map(
      plan =>
        sql`INSERT INTO training_plans (id, title, goal, level, weeks, slots, status)
          VALUES (${plan.id}, ${plan.title}, ${plan.goal}, ${plan.level ?? null}, ${plan.weeks}, ${JSON.stringify(plan.slots)}::jsonb, ${plan.status})
          ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, goal=EXCLUDED.goal, level=EXCLUDED.level, weeks=EXCLUDED.weeks, slots=EXCLUDED.slots, status=EXCLUDED.status`,
    ),
    ...(schemes ?? []).map(scheme => {
      const definition = schemeDefinition(scheme);
      return sql`INSERT INTO training_set_schemes (id, definition, status)
        VALUES (${scheme.id}, ${JSON.stringify(definition)}::jsonb, ${scheme.status})
        ON CONFLICT (id) DO UPDATE SET definition=EXCLUDED.definition, status=EXCLUDED.status`;
    }),
    ...(howTos ?? []).map(howTo => {
      return sql`INSERT INTO exercise_how_to (exercise_id, definition, status)
        VALUES (${howTo.exerciseId}, ${JSON.stringify(howTo)}::jsonb, ${howTo.status})
        ON CONFLICT (exercise_id) DO UPDATE SET definition=EXCLUDED.definition, status=EXCLUDED.status`;
    }),
  ]);
}

export async function trainingGet(url: string, deps: { user: PublicUser | null; allow: boolean; demo?: boolean }) {
  if (!deps.user) return { status: 401 as const, body: { error: 'Please log in to continue.' } };
  const person = deps.user;
  if (!deps.allow) return { status: 429 as const, body: { error: 'Please slow down.' } };
  const params = new URL(url).searchParams;
  const resource = params.get('resource') ?? '';
  const demo = deps.demo ?? demoMode();
  try {
    const state = await stateOf(demo);
    if (resource === 'manage') {
      requireAdmin(deps.user);
      return { status: 200 as const, body: { types: state.types, sessions: state.sessions, plans: state.plans, schemes: publishedSchemes(state.schemes, false) } };
    }
    if (resource === 'schemes') return { status: 200 as const, body: { schemes: publishedSchemes(state.schemes, true) } };
    if (resource === 'how-to') {
      const id = params.get('id') ?? '';
      if (!slug.safeParse(id).success) return { status: 400 as const, body: { error: 'Check the request and try again.' } };
      const row = state.howTos.find(item => item.exerciseId === id);
      const visible = row && (row.status === 'live' || person.role === 'admin') ? row : null;
      return { status: 200 as const, body: { howTo: visible, general: howToGeneral } };
    }
    if (resource === 'plans') return { status: 200 as const, body: { plans: state.plans.filter(plan => plan.status === 'live').map(summaryPlan) } };
    if (resource === 'types') return { status: 200 as const, body: { types: state.types.filter(type => type.status === 'live') } };
    if (resource === 'plan') {
      const plan = state.plans.find(item => item.id === params.get('id') && item.status === 'live');
      if (!plan) return { status: 404 as const, body: { error: 'Plan not found.' } };
      const ids = new Set(plan.slots.flatMap(slot => slot.items.filter(item => item.kind === 'session').map(item => item.id)));
      return {
        status: 200 as const,
        body: { plan, sessions: state.sessions.filter(session => ids.has(session.id) && session.status === 'live') },
      };
    }
    if (resource === 'session') {
      const id = params.get('id');
      const tile = params.get('tile');
      if (!id && tile) {
        const sessions = state.sessions.filter(session => session.status === 'live' && session.catalogTiles?.includes(tile));
        return { status: 200 as const, body: { sessions: sessions.map(catalogCard) } };
      }
      if (!id) return { status: 200 as const, body: { sessions: state.sessions.filter(session => session.status === 'live').map(summarySession) } };
      const session = state.sessions.find(item => item.id === id && item.status === 'live');
      if (!session) return { status: 404 as const, body: { error: 'Session not found.' } };
      const type = state.types.find(item => item.id === session.typeId && item.status === 'live');
      if (!type) return { status: 404 as const, body: { error: 'Session not found.' } };
      const ownLogs = state.logs.filter(log => log.userId === person.id && log.sessionId === session.id && log.status === 'done');
      const latest = ownLogs.sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))[0] ?? null;
      const lastSets = latest ? state.sets.filter(set => set.logId === latest.id) : [];
      const swaps = await sessionSwaps(person, session.id);
      const exerciseIds = [
        ...new Set(
          session.blocks.flatMap(block => {
            if (!block.exerciseId) return [];
            const swap = swaps[block.id];
            const shown = swap && swap !== block.exerciseId ? swap : block.exerciseId;
            return shown === block.exerciseId ? [block.exerciseId] : [block.exerciseId, shown];
          }),
        ),
      ];
      const records = exerciseIds.length ? (await readExerciseSessions(person, exerciseIds.slice(0, 50), { demo })).sessions : [];
      return {
        status: 200 as const,
        body: {
          session,
          type,
          schemes: publishedSchemes(state.schemes, true),
          last: latest
            ? {
                sessionValues: latest.sessionValues,
                sets: lastSets.map(set => ({ blockId: set.blockId, setIndex: set.setIndex, values: loggedValues(set.values) })),
              }
            : null,
          records,
        },
      };
    }
    if (resource === 'week') {
      const date = params.get('date') ?? '';
      if (!dateSchema.safeParse(date).success) return { status: 400 as const, body: { error: 'Check the request and try again.' } };
      const plan = activePlan(state, person.id);
      const logs = state.logs.filter(log => log.userId === person.id);
      const marks = await flowMarks(person.id, demo);
      return { status: 200 as const, body: weekBody(plan, date, logs, state.sessions, marks) };
    }
    return { status: 400 as const, body: { error: 'Check the request and try again.' } };
  } catch (error) {
    if (error instanceof TrainingError) return { status: error.status as 400, body: { error: error.message } };
    return { status: 503 as const, body: { error: 'Service temporarily unavailable. Please try again.' } };
  }
}

export async function trainingPost(user: PublicUser, body: unknown, deps?: TrainingDeps) {
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return { status: 400 as const, body: { error: 'Check the request and try again.' } };
  const demo = deps?.demo ?? demoMode();
  try {
    const result = await apply(user, parsed.data, demo, deps?.recordActivity);
    return { status: 200 as const, body: result };
  } catch (error) {
    if (error instanceof TrainingError) return { status: error.status, body: { error: error.message } };
    if (error instanceof ExerciseLogError) return { status: error.status, body: { error: error.message } };
    if (error instanceof Error && error.message) {
      const known = ['Unknown exercise.', 'Add a weight for this exercise.', 'Bodyweight exercises do not take a weight.', 'Use weights in 0.25 kg steps.', 'Log reps or seconds.'];
      if (known.includes(error.message)) return { status: 400 as const, body: { error: error.message } };
    }
    if (error instanceof z.ZodError) return { status: 400 as const, body: { error: 'Check the values and try again.' } };
    return { status: 503 as const, body: { error: 'Service temporarily unavailable. Please try again.' } };
  }
}

async function apply(
  user: PublicUser,
  action: Action,
  demo: boolean,
  recordActivity: TrainingDeps['recordActivity'],
): Promise<Record<string, unknown>> {
  const state = await stateOf(demo);
  if (action.action === 'use-plan') {
    const plan = state.plans.find(item => item.id === action.planId && item.status === 'live');
    if (!plan) throw new TrainingError('Plan not found.', 404);
    const next: UserPlan = {
      id: crypto.randomUUID(),
      userId: user.id,
      sourcePlanId: plan.id,
      title: plan.title,
      goal: plan.goal,
      level: plan.level,
      startDate: action.startDate,
      weeks: plan.weeks,
      slots: structuredClone(plan.slots),
      active: true,
    };
    await saveUserPlan(next, demo);
    return { plan: { id: next.id, sourcePlanId: next.sourcePlanId, title: next.title, startDate: next.startDate } };
  }
  if (action.action === 'stop-plan') {
    const current = activePlan(state, user.id);
    if (current) {
      current.active = false;
      await saveUserPlan(current, demo, current.id);
    }
    return { active: false };
  }
  if (action.action === 'set-day') {
    const items = parsePlanItems(action.items, catalogOf(state));
    const weekday = action.weekday as PlanSlot['weekday'];
    let current = activePlan(state, user.id);
    if (!current) {
      if (!action.startDate) throw new TrainingError('Choose the day this week starts.');
      current = {
        id: crypto.randomUUID(),
        userId: user.id,
        sourcePlanId: null,
        title: 'Your week',
        goal: 'A week you arranged.',
        startDate: action.startDate,
        weeks: Math.max(1, action.week),
        slots: [],
        active: true,
      };
    }
    if (action.week > current.weeks) throw new TrainingError('That week is outside this plan.');
    current.slots = replaceSlot(current.slots, action.week, weekday, items);
    await saveUserPlan(current, demo, state.userPlans.some(plan => plan.id === current!.id) ? current.id : undefined);
    return { planId: current.id };
  }
  if (action.action === 'swap-days') {
    const current = activePlan(state, user.id);
    if (!current) throw new TrainingError('Plan your week first.');
    const a = current.slots.find(slot => slot.week === action.weekA && slot.weekday === action.weekdayA)?.items ?? [];
    const b = current.slots.find(slot => slot.week === action.weekB && slot.weekday === action.weekdayB)?.items ?? [];
    let slots = replaceSlot(current.slots, action.weekA, action.weekdayA as PlanSlot['weekday'], b);
    slots = replaceSlot(slots, action.weekB, action.weekdayB as PlanSlot['weekday'], a);
    current.slots = slots;
    await saveUserPlan(current, demo, current.id);
    return { planId: current.id };
  }
  if (action.action === 'skip') {
    const session = state.sessions.find(item => item.id === action.sessionId);
    if (!session) throw new TrainingError('Session not found.', 404);
    const log: StoredLog = {
      id: crypto.randomUUID(),
      userId: user.id,
      sessionId: session.id,
      planDate: action.planDate,
      status: 'skipped',
      sessionValues: {},
      finishedAt: new Date().toISOString(),
      activityId: null,
      bodyWeightKg: null,
    };
    await saveLog(log, [], demo);
    return { status: 'skipped' };
  }
  if (action.action === 'log') {
    const session = state.sessions.find(item => item.id === action.sessionId);
    if (!session) throw new TrainingError('Session not found.', 404);
    const type = state.types.find(item => item.id === session.typeId);
    if (!type) throw new TrainingError('Unknown training type.');
    const sessionValues = validateLogValues(type, action.sessionValues ?? {}, 'session');
    const swaps = await sessionSwaps(user, session.id);
    const performed = withLoggedExercises(session, swaps, action.blocks);
    assertComplete(performed, type, action.blocks, sessionValues);
    const log: StoredLog = {
      id: crypto.randomUUID(),
      userId: user.id,
      sessionId: session.id,
      planDate: action.planDate,
      status: 'done',
      sessionValues,
      finishedAt: new Date().toISOString(),
      activityId: null,
      bodyWeightKg: await memberWeight(user.id, demo),
    };
    const sets: StoredSet[] = [];
    for (const block of action.blocks) {
      if (block.skipped && !(block.sets?.length)) {
        sets.push({ logId: log.id, blockId: block.id, setIndex: 1, values: { _skip: true }, detail: null });
        continue;
      }
      for (const set of block.sets ?? []) {
        const skipped = Boolean(set.skipped || block.skipped);
        sets.push({
          logId: log.id,
          blockId: block.id,
          setIndex: set.index,
          values: skipped ? { _skip: true } : (set.values ?? {}),
          detail: columnDetail(set.detail, skipped),
        });
      }
    }
    await saveLog(log, sets, demo);
    try {
      await writeExerciseRecords(user, performed, type, action.blocks, demo);
    } catch (error) {
      if (demo) {
        const rows = memory();
        rows.logs = rows.logs.filter(item => item.id !== log.id);
        rows.sets = rows.sets.filter(item => item.logId !== log.id);
      } else {
        const { database } = await import('./database');
        await database()`DELETE FROM training_logs WHERE id=${log.id} AND user_id=${user.id}`;
      }
      throw error;
    }
    return { logId: log.id, canPost: type.canPost };
  }
  if (action.action === 'post') {
    const session = state.sessions.find(item => item.id === action.sessionId);
    if (!session) throw new TrainingError('Session not found.', 404);
    const type = state.types.find(item => item.id === session.typeId);
    if (!type?.canPost) throw new TrainingError('This session stays off the timeline.');
    const log = state.logs.find(item => item.userId === user.id && item.sessionId === session.id && item.planDate === action.planDate && item.status === 'done');
    if (!log) throw new TrainingError('Finish the session before posting.');
    const saved = state.sets.filter(set => set.logId === log.id);
    const blocks = session.blocks.map(block => {
      const rows = saved.filter(set => set.blockId === block.id);
      if (rows.length === 1 && skipValue(rows[0].values)) return { id: block.id, skipped: true, sets: [] };
      return {
        id: block.id,
        sets: rows.map(row => ({
          index: row.setIndex,
          skipped: skipValue(row.values),
          values: loggedValues(row.values) ?? {},
        })),
      };
    });
    const swaps = await sessionSwaps(user, session.id);
    const performed = withLoggedExercises(session, swaps, blocks);
    const changed = performed.blocks.some((block, index) => block.exerciseId !== session.blocks[index]?.exerciseId);
    try {
      assertComplete(performed, type, blocks, log.sessionValues);
    } catch (error) {
      if (!changed || !(error instanceof TrainingError)) throw error;
      // A set ticked before the swap was logged on the block's own exercise.
      assertComplete(session, type, blocks, log.sessionValues);
    }
    if (log.activityId) return { activityId: log.activityId };
    if (!recordActivity) throw new TrainingError('Service temporarily unavailable. Please try again.', 503);
    const activity = await recordActivity(user, { sessionId: session.id, title: session.title, note: action.note ?? '' });
    log.activityId = activity.id;
    if (demo) {
      const row = memory().logs.find(item => item.id === log.id);
      if (row) row.activityId = activity.id;
    } else {
      const { database } = await import('./database');
      await database()`UPDATE training_logs SET activity_id=${activity.id} WHERE id=${log.id} AND user_id=${user.id}`;
    }
    return { activityId: activity.id };
  }
  requireAdmin(user);
  if (action.action === 'upsert-type') {
    const type = parseTrainingType(action.type);
    const types = state.types.filter(item => item.id !== type.id).concat(type);
    for (const session of state.sessions.filter(item => item.typeId === type.id)) parseSession(session, types, state.schemes);
    const next = { ...state, types };
    if (type.status === 'live') publishIssue('type', type.id, next);
    await persistDefinitions(demo, next, { types: state.types.map(item => item.id), sessions: [], plans: [] });
    return { type };
  }
  if (action.action === 'upsert-scheme') {
    let scheme: SetScheme;
    try {
      scheme = parseScheme(action.scheme);
    } catch (error) {
      throw new TrainingError(error instanceof Error ? error.message : 'Check the set scheme and try again.');
    }
    const schemes = state.schemes.filter(item => item.id !== scheme.id).concat({ ...scheme, status: 'live' });
    await persistDefinitions(
      demo,
      { types: state.types, sessions: state.sessions, plans: state.plans, schemes },
      { types: [], sessions: [], plans: [], schemes: state.schemes.map(item => item.id) },
    );
    return { scheme };
  }
  if (action.action === 'upsert-how-to') {
    let howTo: ExerciseHowTo;
    try {
      howTo = parseHowTo(action.howTo);
    } catch (error) {
      throw new TrainingError(error instanceof Error ? error.message : 'Check the how-to and try again.');
    }
    const howTos = state.howTos.filter(item => item.exerciseId !== howTo.exerciseId).concat(howTo);
    await persistDefinitions(
      demo,
      { types: state.types, sessions: state.sessions, plans: state.plans, howTos },
      { types: [], sessions: [], plans: [], howTos: state.howTos.map(item => item.exerciseId) },
    );
    return { howTo };
  }
  if (action.action === 'upsert-session') {
    const session = parseSession(action.session, state.types, state.schemes);
    const sessions = state.sessions.filter(item => item.id !== session.id).concat(session);
    const next = { ...state, sessions };
    if (session.status === 'live') publishIssue('session', session.id, next);
    await persistDefinitions(demo, next, { types: [], sessions: state.sessions.map(item => item.id), plans: [] });
    return { session };
  }
  if (action.action === 'upsert-plan') {
    const plan = parsePlan(action.plan, catalogOf(state));
    const plans = state.plans.filter(item => item.id !== plan.id).concat(plan);
    const next = { ...state, plans };
    if (plan.status === 'live') publishIssue('plan', plan.id, next);
    await persistDefinitions(demo, next, { types: [], sessions: [], plans: state.plans.map(item => item.id) });
    return { plan };
  }
  if (action.action === 'set-status') {
    const next = {
      types: state.types.map(item => (action.kind === 'type' && item.id === action.id ? { ...item, status: action.status } : item)),
      sessions: state.sessions.map(item => (action.kind === 'session' && item.id === action.id ? { ...item, status: action.status } : item)),
      plans: state.plans.map(item => (action.kind === 'plan' && item.id === action.id ? { ...item, status: action.status } : item)),
    };
    const found =
      (action.kind === 'type' && state.types.some(item => item.id === action.id)) ||
      (action.kind === 'session' && state.sessions.some(item => item.id === action.id)) ||
      (action.kind === 'plan' && state.plans.some(item => item.id === action.id));
    if (!found) throw new TrainingError('Not found.', 404);
    if (action.status === 'draft' && action.kind === 'type' && next.sessions.some(session => session.typeId === action.id && session.status === 'live'))
      throw new TrainingError('Unpublish the sessions that use this type first.');
    if (action.status === 'draft' && action.kind === 'session' && next.plans.some(plan => plan.status === 'live' && plan.slots.some(slot => slot.items.some(item => item.kind === 'session' && item.id === action.id))))
      throw new TrainingError('Unpublish the plans that use this session first.');
    if (action.status === 'live') publishIssue(action.kind, action.id, next);
    await persistDefinitions(demo, next, { types: [], sessions: [], plans: [] });
    return { id: action.id, status: action.status };
  }
  const next = {
    types: state.types.filter(item => !(action.kind === 'type' && item.id === action.id)),
    sessions: state.sessions.filter(item => !(action.kind === 'session' && item.id === action.id) && !(action.kind === 'type' && item.typeId === action.id)),
    plans: state.plans.filter(item => !(action.kind === 'plan' && item.id === action.id)),
  };
  if (action.kind === 'session' && next.plans.some(plan => plan.slots.some(slot => slot.items.some(item => item.kind === 'session' && item.id === action.id))))
    throw new TrainingError('Remove this session from plans first.');
  if (action.kind === 'type' && state.sessions.some(session => session.typeId === action.id && next.plans.some(plan => plan.slots.some(slot => slot.items.some(item => item.kind === 'session' && item.id === session.id)))))
    throw new TrainingError('Remove the sessions that use this type from plans first.');
  await persistDefinitions(demo, next, {
    types: state.types.map(item => item.id),
    sessions: state.sessions.map(item => item.id),
    plans: state.plans.map(item => item.id),
  });
  if (demo && action.kind === 'session') {
    const rows = memory();
    const ids = new Set(rows.logs.filter(log => log.sessionId === action.id).map(log => log.id));
    rows.logs = rows.logs.filter(log => !ids.has(log.id));
    rows.sets = rows.sets.filter(set => !ids.has(set.logId));
  }
  if (!demo && action.kind === 'session') {
    const { database } = await import('./database');
    await database()`DELETE FROM training_logs WHERE session_id=${action.id}`;
  }
  return { removed: action.id };
}

export function plannedOn(plan: UserPlan, date: string) {
  return planDay(plan, plan.startDate, date);
}
