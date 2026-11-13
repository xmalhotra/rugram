import { z } from 'zod';
import { exercise, type LoadType } from '../../shared/exercises';
import { assertRecordedTime, type SetDetail, type SetStatus, type TimeSource } from '../../shared/set-detail';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';
import { progressPoints } from '../../shared/exercise-progress';

export class ExerciseLogError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const setDetailSchema = z
  .object({
    status: z.enum(['done', 'skipped']).optional(),
    plannedWeightKg: z.number().min(0).max(1000).nullable().optional(),
    plannedReps: z.number().int().min(0).max(200).nullable().optional(),
    plannedSeconds: z.number().int().min(0).max(3600).nullable().optional(),
    schemeId: z.string().min(1).max(80).nullable().optional(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    restBeforeSeconds: z.number().int().min(0).max(86_400).nullable().optional(),
    restPlannedSeconds: z.number().int().min(0).max(3600).nullable().optional(),
    timeSource: z.enum(['clock', 'typed']).nullable().optional(),
    edited: z.boolean().optional(),
  })
  .strict();

const setSchema = z
  .object({
    setIndex: z.number().int().min(1).max(50),
    weightKg: z.number().min(0).max(1000).nullable(),
    reps: z.number().int().min(1).max(200).nullable().optional(),
    durationSeconds: z.number().int().min(1).max(3600).nullable().optional(),
    detail: setDetailSchema.optional(),
  })
  .strict()
  .refine(set => (set.detail?.status ?? 'done') === 'skipped' || set.reps != null || set.durationSeconds != null, {
    message: 'Log reps or seconds.',
  });

export const exerciseLogSchema = z
  .object({
    action: z.literal('log'),
    runId: z.string().regex(/^run-[0-9a-f-]{36}$/i).optional(),
    exerciseId: z.string().min(1).max(80),
    // Empty only inside a run: undoing the last ticked set clears that exercise for the run.
    sets: z.array(setSchema).max(50),
  })
  .strict()
  .refine(value => value.sets.length > 0 || Boolean(value.runId), { message: 'Add a set first.', path: ['sets'] });

export type ExerciseLogInput = z.infer<typeof exerciseLogSchema>;

export type ExerciseSession = {
  exerciseId: string;
  loggedAt: string;
  sets: { setIndex: number; weightKg: number | null; reps: number | null; durationSeconds: number | null; restSeconds: number | null }[];
};

type StoredLog = {
  id: string;
  userId: string;
  exerciseId: string;
  runId: string | null;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  loggedAt: string;
  detail: SetDetail;
};

export type ExerciseLogDeps = { demo: boolean };

declare global {
  var qramExerciseLogs: StoredLog[] | undefined;
}

function demoMode() {
  return demoModeEnabled(process.env);
}

function memory() {
  const logs = (globalThis.qramExerciseLogs ??= []);
  // Rows saved before set detail existed have none: treat them as done sets with no extra detail.
  for (const log of logs) if (!log.detail) log.detail = detailFrom(undefined, Date.now());
  return logs;
}

async function resolveDeps(deps?: ExerciseLogDeps): Promise<ExerciseLogDeps> {
  return deps ?? { demo: demoMode() };
}

function quarterStep(value: number) {
  return Math.abs(value * 4 - Math.round(value * 4)) < 1e-6;
}

function assertWeight(weightKg: number | null, load: LoadType) {
  if (load === 'bodyweight') {
    if (weightKg != null) throw new ExerciseLogError('Bodyweight exercises do not take a weight.');
    return;
  }
  if (weightKg == null) {
    if (load === 'assisted') return;
    throw new ExerciseLogError('Add a weight for this exercise.');
  }
  if (!quarterStep(weightKg)) throw new ExerciseLogError('Use weights in 0.25 kg steps.');
}

function detailFrom(raw: z.infer<typeof setDetailSchema> | undefined, now: number): SetDetail {
  try {
    assertRecordedTime(raw?.startedAt, now);
    assertRecordedTime(raw?.completedAt, now);
  } catch (error) {
    throw new ExerciseLogError(error instanceof Error ? error.message : 'Check the time and try again.');
  }
  const status: SetStatus = raw?.status === 'skipped' ? 'skipped' : 'done';
  return {
    status,
    plannedWeightKg: raw?.plannedWeightKg ?? null,
    plannedReps: raw?.plannedReps ?? null,
    plannedSeconds: raw?.plannedSeconds ?? null,
    schemeId: raw?.schemeId ?? null,
    startedAt: raw?.startedAt ?? null,
    completedAt: raw?.completedAt ?? null,
    restBeforeSeconds: raw?.restBeforeSeconds ?? null,
    restPlannedSeconds: raw?.restPlannedSeconds ?? null,
    timeSource: (raw?.timeSource ?? null) as TimeSource | null,
    edited: status === 'done' && raw?.edited === true,
  };
}

function assertSets(exerciseId: string, sets: ExerciseLogInput['sets']) {
  const move = exercise(exerciseId);
  if (!move) throw new ExerciseLogError('Unknown exercise.');
  const indexes = sets.map(set => set.setIndex);
  if (new Set(indexes).size !== indexes.length) throw new ExerciseLogError('Each set needs its own number.');
  for (const set of sets) {
    if ((set.detail?.status ?? 'done') === 'skipped') continue;
    assertWeight(set.weightKg, move.load);
  }
  return move;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function sessionFrom(logs: StoredLog[]): ExerciseSession | null {
  const doneLogs = logs.filter(log => log.detail.status !== 'skipped');
  if (!doneLogs.length) return null;
  const latest = [...doneLogs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt) || b.setIndex - a.setIndex)[0];
  const grouped = latest.runId
    ? doneLogs.filter(log => log.runId === latest.runId)
    : doneLogs.filter(log => !log.runId && dayKey(log.loggedAt) === dayKey(latest.loggedAt));
  const sets = [...grouped].sort((a, b) => a.setIndex - b.setIndex);
  return {
    exerciseId: latest.exerciseId,
    loggedAt: sets.reduce((at, log) => (log.loggedAt > at ? log.loggedAt : at), sets[0].loggedAt),
    sets: sets.map(log => ({
      setIndex: log.setIndex,
      weightKg: log.weightKg,
      reps: log.reps,
      durationSeconds: log.durationSeconds,
      restSeconds: log.detail.restPlannedSeconds,
    })),
  };
}

async function assertRunOwner(user: PublicUser, runId: string | undefined, demo: boolean) {
  if (!runId) return;
  if (demo) {
    const run = globalThis.qramFlowRuns?.runs.find(item => item.id === runId);
    if (!run) throw new ExerciseLogError('Run not found.', 404);
    if (run.userId !== user.id) throw new ExerciseLogError('Only you can log this run.', 403);
    return;
  }
  const { database } = await import('./database');
  const [row] = await database()`SELECT user_id FROM flow_runs WHERE id=${runId}`;
  if (!row) throw new ExerciseLogError('Run not found.', 404);
  if (String(row.user_id) !== user.id) throw new ExerciseLogError('Only you can log this run.', 403);
}

export async function readExerciseSessions(user: PublicUser, ids: string[], deps?: ExerciseLogDeps) {
  const unique = [...new Set(ids.map(id => id.trim()).filter(Boolean))];
  if (!unique.length || unique.length > 50) throw new ExerciseLogError('Ask for 1 to 50 exercises.');
  if (unique.some(id => !exercise(id))) throw new ExerciseLogError('Unknown exercise.');
  const resolved = await resolveDeps(deps);
  const logs = resolved.demo
    ? memory().filter(log => log.userId === user.id && unique.includes(log.exerciseId))
    : await readSql(user.id, unique);
  const sessions: ExerciseSession[] = [];
  for (const id of unique) {
    const session = sessionFrom(logs.filter(log => log.exerciseId === id));
    if (session) sessions.push(session);
  }
  return { sessions };
}

async function readSql(userId: string, ids: string[]) {
  const { database } = await import('./database');
  const rows = await database()`SELECT id, user_id, exercise_id, run_id, set_index, weight_kg, reps, duration_seconds, logged_at,
      status, planned_weight_kg, planned_reps, planned_seconds, scheme_id, started_at, completed_at,
      rest_before_seconds, rest_planned_seconds, time_source, edited
    FROM exercise_logs WHERE user_id=${userId} AND exercise_id=ANY(${ids}::text[])`;
  return rows.map(mapLog);
}

function mapLog(row: Record<string, unknown>): StoredLog {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    exerciseId: String(row.exercise_id),
    runId: row.run_id ? String(row.run_id) : null,
    setIndex: Number(row.set_index),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    reps: row.reps == null ? null : Number(row.reps),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    loggedAt: new Date(String(row.logged_at)).toISOString(),
    detail: detailFromRow(row),
  };
}

function isoOrNull(value: unknown) {
  if (value == null || value === '') return null;
  const time = new Date(String(value));
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

function detailFromRow(row: Record<string, unknown>): SetDetail {
  const status: SetStatus = row.status === 'skipped' ? 'skipped' : 'done';
  const source = row.time_source === 'clock' || row.time_source === 'typed' ? row.time_source : null;
  return {
    status,
    plannedWeightKg: row.planned_weight_kg == null ? null : Number(row.planned_weight_kg),
    plannedReps: row.planned_reps == null ? null : Number(row.planned_reps),
    plannedSeconds: row.planned_seconds == null ? null : Number(row.planned_seconds),
    schemeId: row.scheme_id == null ? null : String(row.scheme_id),
    startedAt: isoOrNull(row.started_at),
    completedAt: isoOrNull(row.completed_at),
    restBeforeSeconds: row.rest_before_seconds == null ? null : Number(row.rest_before_seconds),
    restPlannedSeconds: row.rest_planned_seconds == null ? null : Number(row.rest_planned_seconds),
    timeSource: source,
    edited: row.edited === true,
  };
}

export async function logExerciseSets(user: PublicUser, input: ExerciseLogInput, deps?: ExerciseLogDeps, now = Date.now()) {
  const parsed = exerciseLogSchema.parse(input);
  assertSets(parsed.exerciseId, parsed.sets);
  const resolved = await resolveDeps(deps);
  await assertRunOwner(user, parsed.runId, resolved.demo);
  const at = new Date(now).toISOString();
  const runId = parsed.runId ?? null;
  const next: StoredLog[] = parsed.sets.map(set => {
    const detail = detailFrom(set.detail, now);
    const skipped = detail.status === 'skipped';
    return {
      id: `log-${crypto.randomUUID()}`,
      userId: user.id,
      exerciseId: parsed.exerciseId,
      runId,
      setIndex: set.setIndex,
      weightKg: skipped ? null : set.weightKg,
      reps: skipped ? null : (set.reps ?? null),
      durationSeconds: skipped ? null : (set.durationSeconds ?? null),
      loggedAt: at,
      detail,
    };
  });
  if (resolved.demo) {
    const rows = memory();
    const day = dayKey(at);
    globalThis.qramExerciseLogs = rows.filter(log => {
      if (log.userId !== user.id || log.exerciseId !== parsed.exerciseId) return true;
      if (runId) return log.runId !== runId;
      return Boolean(log.runId) || dayKey(log.loggedAt) !== day;
    });
    memory().push(...next);
    return sessionFrom(next);
  }
  const { database } = await import('./database');
  const sql = database();
  const removal = runId
    ? sql`DELETE FROM exercise_logs WHERE user_id=${user.id} AND exercise_id=${parsed.exerciseId} AND run_id=${runId}`
    : sql`DELETE FROM exercise_logs WHERE user_id=${user.id} AND exercise_id=${parsed.exerciseId} AND run_id IS NULL AND (logged_at AT TIME ZONE 'UTC')::date=(${at}::timestamptz AT TIME ZONE 'UTC')::date`;
  const inserts = next.map(
    log =>
      sql`INSERT INTO exercise_logs(id, user_id, exercise_id, run_id, set_index, weight_kg, reps, duration_seconds, logged_at,
          status, planned_weight_kg, planned_reps, planned_seconds, scheme_id, started_at, completed_at,
          rest_before_seconds, rest_planned_seconds, time_source, edited)
        VALUES(${log.id}, ${log.userId}, ${log.exerciseId}, ${log.runId}, ${log.setIndex}, ${log.weightKg}, ${log.reps}, ${log.durationSeconds}, ${log.loggedAt},
          ${log.detail.status}, ${log.detail.plannedWeightKg}, ${log.detail.plannedReps}, ${log.detail.plannedSeconds}, ${log.detail.schemeId},
          ${log.detail.startedAt}, ${log.detail.completedAt}, ${log.detail.restBeforeSeconds}, ${log.detail.restPlannedSeconds},
          ${log.detail.timeSource}, ${log.detail.edited})`,
  );
  await sql.transaction([removal, ...inserts]);
  return sessionFrom(next);
}

export async function readRunSetLogs(
  user: PublicUser,
  runIds: string[],
  deps?: ExerciseLogDeps,
) {
  const unique = [...new Set(runIds.filter(id => /^run-[0-9a-f-]{36}$/i.test(id)))];
  if (!unique.length) return [];
  const resolved = await resolveDeps(deps);
  if (resolved.demo) {
    return memory()
      .filter(log => log.userId === user.id && log.runId != null && unique.includes(log.runId))
      .map(log => ({
        runId: log.runId as string,
        exerciseId: log.exerciseId,
        setIndex: log.setIndex,
        weightKg: log.weightKg,
        reps: log.reps,
        durationSeconds: log.durationSeconds,
        status: log.detail.status,
        restPlannedSeconds: log.detail.restPlannedSeconds,
      }));
  }
  const { database } = await import('./database');
  const rows = await database()`SELECT run_id, exercise_id, set_index, weight_kg, reps, duration_seconds, status, rest_planned_seconds
    FROM exercise_logs WHERE user_id=${user.id} AND run_id = ANY(${unique}::text[])`;
  return rows.map(row => ({
    runId: String(row.run_id),
    exerciseId: String(row.exercise_id),
    setIndex: Number(row.set_index),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    reps: row.reps == null ? null : Number(row.reps),
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    status: row.status === 'skipped' ? ('skipped' as const) : ('done' as const),
    restPlannedSeconds: row.rest_planned_seconds == null ? null : Number(row.rest_planned_seconds),
  }));
}

export async function clearExerciseLogs(user: PublicUser, exerciseId: string, deps?: ExerciseLogDeps) {
  if (!exercise(exerciseId)) throw new ExerciseLogError('Unknown exercise.');
  const resolved = await resolveDeps(deps);
  if (resolved.demo) {
    globalThis.qramExerciseLogs = memory().filter(log => log.userId !== user.id || log.exerciseId !== exerciseId);
    return;
  }
  const { database } = await import('./database');
  await database()`DELETE FROM exercise_logs WHERE user_id=${user.id} AND exercise_id=${exerciseId}`;
}

/** Done sets with a weight from the last year, newest first, for the strength estimate. Private to the member. */
export async function readStrengthSets(user: PublicUser, deps?: ExerciseLogDeps, now = Date.now()) {
  const since = now - 365 * 24 * 60 * 60 * 1000;
  const resolved = await resolveDeps(deps);
  if (resolved.demo) {
    return memory()
      .filter(log => log.userId === user.id && log.detail.status === 'done' && log.weightKg != null && log.reps != null)
      .filter(log => Date.parse(log.loggedAt) >= since)
      .map(log => ({ exerciseId: log.exerciseId, weightKg: log.weightKg, reps: log.reps, loggedAt: log.loggedAt }));
  }
  const { database } = await import('./database');
  const rows = await database()`SELECT exercise_id, weight_kg, reps, logged_at FROM exercise_logs
    WHERE user_id=${user.id} AND status='done' AND weight_kg IS NOT NULL AND reps IS NOT NULL
      AND logged_at >= ${new Date(since).toISOString()} ORDER BY logged_at DESC LIMIT 5000`;
  return rows.map(row => ({
    exerciseId: String(row.exercise_id),
    weightKg: Number(row.weight_kg),
    reps: Number(row.reps),
    loggedAt: new Date(String(row.logged_at)).toISOString(),
  }));
}

/** One point per session for an exercise over the last year, oldest first. Private to the member. */
export async function readExerciseProgress(user: PublicUser, exerciseId: string, deps?: ExerciseLogDeps, now = Date.now()) {
  if (!exercise(exerciseId)) throw new ExerciseLogError('Unknown exercise.');
  const since = now - 365 * 24 * 60 * 60 * 1000;
  const resolved = await resolveDeps(deps);
  const logs = resolved.demo
    ? memory().filter(log => log.userId === user.id && log.exerciseId === exerciseId)
    : await readSql(user.id, [exerciseId]);
  const sets = logs
    .filter(log => log.detail.status !== 'skipped' && Date.parse(log.loggedAt) >= since)
    .map(log => ({ runId: log.runId, loggedAt: log.loggedAt, weightKg: log.weightKg, reps: log.reps, durationSeconds: log.durationSeconds }));
  return { exerciseId, points: progressPoints(sets) };
}
