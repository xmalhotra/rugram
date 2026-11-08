import { z } from 'zod';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';
import type { HabitFlow, MobileProfile } from '../../shared/mobile';
import { findFlowCard } from '../../shared/personal-flows';
import { resolveVisualFlow } from '../../shared/visual-flows';
import { gymExerciseId, gymFlowById } from '../../shared/gym-flows';
import type { HistoryRun, HistoryRunStatus } from '../../shared/flow-history';
import { readRunSetLogs } from './exercise-log-store';
import { effortRating } from '../../shared/set-detail';
import {
  canPost,
  startRun,
  type FlowRunState,
  type RunCard,
} from '../../shared/flow-run';
import {
  benchmarkFor,
  restFor,
  type Lifestyle,
  type RunLevel,
  type UserMetrics,
} from '../../shared/flow-benchmarks';

export class FlowRunError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const levels = ['Beginner', 'Regular', 'Trained'] as const;
const lifestyles = ['sedentary', 'light', 'active', 'athlete'] as const;
const resumeWindow = 24 * 60 * 60 * 1000;

const runCardSchema = z
  .object({
    cardId: z.string().min(1).max(200),
    sourceFlowId: z.string().min(1).max(200),
    title: z.string().min(1).max(200),
    targetSeconds: z.number().int().nonnegative().max(86_400),
    status: z.enum(['pending', 'done', 'skipped']),
    seconds: z.number().int().nonnegative().max(86_400).nullable(),
    manual: z.boolean().optional(),
    openedAt: z.number().nonnegative().optional(),
    closedAt: z.number().nonnegative().optional(),
    activeSeconds: z.number().int().nonnegative().max(86_400).optional(),
    pausedSeconds: z.number().int().nonnegative().max(86_400).optional(),
  })
  .strict();

export const flowRunStateSchema = z
  .object({
    cards: z.array(runCardSchema).max(40),
    index: z.number().int().nonnegative(),
    phase: z.enum(['card', 'rest', 'finished']),
    phaseStartedAt: z.number(),
    pausedAt: z.number().nullable(),
    pausedTotal: z.number().nonnegative(),
    restSeconds: z.number().int().nonnegative().max(3600),
  })
  .strict();

export const flowRunSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('metrics'),
      birthYear: z.number().int(),
      weightKg: z.number().min(20).max(300),
      lifestyle: z.enum(lifestyles),
      consent: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal('start'),
      kind: z.enum(['flow', 'personal']),
      id: z.string().min(1).max(200),
      level: z.enum(levels),
    })
    .strict(),
  z
    .object({
      action: z.literal('save'),
      runId: z.string().regex(/^run-[0-9a-f-]{36}$/i),
      state: flowRunStateSchema,
      effort: z.number().int().min(1).max(10).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('finish'),
      runId: z.string().regex(/^run-[0-9a-f-]{36}$/i),
      state: flowRunStateSchema,
      effort: z.number().int().min(1).max(10).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('post'),
      runId: z.string().regex(/^run-[0-9a-f-]{36}$/i),
      note: z.string().max(560).optional(),
    })
    .strict(),
]);

export const flowHistoryQuerySchema = z
  .object({
    history: z.string().min(1).max(200),
    kind: z.enum(['flow', 'personal']),
  })
  .strict();

/** The person's own recent runs across every flow, for their profile. */
export const recentRunsQuerySchema = z.object({ recent: z.literal('1') }).strict();

export type FlowRunRecord = {
  id: string;
  kind: 'flow' | 'personal';
  flowId: string;
  title: string;
  level: RunLevel;
  state: FlowRunState;
  status: 'running' | 'finished' | 'posted' | 'abandoned';
  activityId: string | null;
  startedAt: string;
  updatedAt: string;
  bodyWeightKg: number | null;
  effort: number | null;
};

type StoredRun = FlowRunRecord & { userId: string };
type StoredMetrics = UserMetrics & { userId: string; consentedAt: string; updatedAt: string };

export type FlowRunDeps = {
  demo: boolean;
  profile: (user: PublicUser) => Promise<MobileProfile>;
  library: () => Promise<HabitFlow[]>;
  recordActivity: (
    user: PublicUser,
    input: { personalFlowId?: string; flowId?: string; cardIds: string[]; note: string },
  ) => Promise<{ id: string }>;
};

declare global {
  var qramFlowRuns:
    | { metrics: StoredMetrics[]; runs: StoredRun[] }
    | undefined;
}

function demoMode() {
  return demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramFlowRuns ??= { metrics: [], runs: [] });
}

function withinWindow(iso: string, now: number) {
  const time = Date.parse(iso);
  return Number.isFinite(time) && now - time < resumeWindow && time <= now;
}

function publish(run: StoredRun): FlowRunRecord {
  return {
    id: run.id,
    kind: run.kind,
    flowId: run.flowId,
    title: run.title,
    level: run.level,
    state: run.state,
    status: run.status,
    activityId: run.activityId,
    startedAt: run.startedAt,
    updatedAt: run.updatedAt,
    bodyWeightKg: run.bodyWeightKg,
    effort: run.effort,
  };
}

async function resolveDeps(deps?: FlowRunDeps): Promise<FlowRunDeps> {
  if (deps) return deps;
  const [{ getProfile }, { cardLibrary }, { recordFlowActivity }] = await Promise.all([
    import('./mobile/profile'),
    import('./mobile/personal-flows'),
    import('./mobile/community'),
  ]);
  return {
    demo: demoMode(),
    profile: getProfile,
    library: cardLibrary,
    recordActivity: recordFlowActivity,
  };
}

function acceptableAge(birthYear: number, now: number) {
  const age = new Date(now).getFullYear() - birthYear;
  return age >= 13 && age <= 100;
}

function mergeState(stored: FlowRunState, incoming: FlowRunState): FlowRunState {
  if (
    incoming.cards.length !== stored.cards.length ||
    incoming.cards.some((card, index) => card.cardId !== stored.cards[index]?.cardId)
  )
    throw new FlowRunError('These cards do not match the run.');
  if (stored.cards.length && incoming.index >= stored.cards.length)
    throw new FlowRunError('Check the request and try again.');
  const cards: RunCard[] = stored.cards.map((card, index) => {
    const next = incoming.cards[index];
    const timing = {
      ...(next.openedAt != null ? { openedAt: next.openedAt } : {}),
      ...(next.closedAt != null ? { closedAt: next.closedAt } : {}),
      ...(next.activeSeconds != null ? { activeSeconds: next.activeSeconds } : {}),
      ...(next.pausedSeconds != null ? { pausedSeconds: next.pausedSeconds } : {}),
    };
    if (next.status === 'done') {
      if (next.seconds == null) throw new FlowRunError('Check the request and try again.');
      return { ...card, ...timing, status: 'done' as const, seconds: next.seconds };
    }
    return { ...card, ...timing, status: next.status, seconds: null };
  });
  return {
    cards,
    index: incoming.index,
    phase: incoming.phase,
    phaseStartedAt: incoming.phaseStartedAt,
    pausedAt: incoming.pausedAt,
    pausedTotal: incoming.pausedTotal,
    restSeconds: stored.restSeconds,
  };
}

async function resolveRunnable(
  user: PublicUser,
  kind: 'flow' | 'personal',
  id: string,
  level: RunLevel,
  deps: FlowRunDeps,
) {
  const profile = await deps.profile(user);
  const library = await deps.library();
  if (kind === 'personal') {
    const flow = profile.personalFlows?.find(item => item.id === id);
    if (!flow) throw new FlowRunError('Flow not found.', 404);
    if (!flow.cards.length) throw new FlowRunError('This flow has no cards.');
    return {
      title: flow.name.slice(0, 120),
      rest: restFor(flow.id, level),
      cards: flow.cards.map(reference => ({
        cardId: reference.cardId,
        sourceFlowId: reference.sourceFlowId,
        title: reference.title,
        targetSeconds: benchmarkFor(
          flow.id,
          reference.cardId,
          level,
          findFlowCard(library, reference.sourceFlowId, reference.cardId),
        ).seconds,
      })),
    };
  }
  // Trying a flow doesn't need it on the map; adding it is a separate choice.
  const source = library.find(item => item.id === id);
  if (!source) throw new FlowRunError('Flow not found.', 404);
  const cards = resolveVisualFlow(source, library).cards;
  if (!cards.length) throw new FlowRunError('This flow has no cards.');
  const gym = gymFlowById(source.id);
  return {
    title: source.title.slice(0, 120),
    rest: gym?.items[0]?.restSeconds ?? restFor(source.id, level),
    cards: cards.map(card => ({
      cardId: card.id,
      sourceFlowId: source.id,
      title: card.title,
      targetSeconds: gym ? 0 : benchmarkFor(source.id, card.id, level, card).seconds,
      ...(gym ? { manual: true as const } : {}),
    })),
  };
}

/** How many runs were finished, and when recently, for the profile's stats. A restarted run never counts. */
function finishedSummary(times: string[], now: number) {
  const since = now - 120 * 24 * 60 * 60 * 1000;
  return {
    finished: times.length,
    finishedAt: times.filter(iso => Date.parse(iso) >= since),
  };
}

export async function readFlowRuns(user: PublicUser, deps?: FlowRunDeps, now = Date.now()) {
  const resolved = await resolveDeps(deps);
  if (resolved.demo) {
    const rows = memory();
    const metrics = rows.metrics.find(row => row.userId === user.id);
    return {
      metrics: metrics
        ? { birthYear: metrics.birthYear, weightKg: metrics.weightKg, lifestyle: metrics.lifestyle }
        : null,
      running: rows.runs
        .filter(run => run.userId === user.id && run.status === 'running' && withinWindow(run.updatedAt, now))
        .map(publish),
      ...finishedSummary(
        rows.runs
          .filter(
            run =>
              run.userId === user.id &&
              (run.status === 'finished' || run.status === 'posted') &&
              run.state.phase === 'finished',
          )
          .map(run => run.updatedAt),
        now,
      ),
    };
  }
  const { database } = await import('./database');
  const sql = database();
  const [metricsRows, runRows, finishedRows] = await Promise.all([
    sql`SELECT birth_year, weight_kg, lifestyle FROM user_metrics WHERE user_id=${user.id}`,
    sql`SELECT * FROM flow_runs WHERE user_id=${user.id} AND status='running' AND updated_at > now() - interval '24 hours' ORDER BY updated_at DESC`,
    sql`SELECT updated_at FROM flow_runs WHERE user_id=${user.id} AND status IN ('finished', 'posted') AND state->>'phase'='finished'`,
  ]);
  const row = metricsRows[0];
  return {
    metrics: row
      ? {
          birthYear: Number(row.birth_year),
          weightKg: Number(row.weight_kg),
          lifestyle: String(row.lifestyle) as Lifestyle,
        }
      : null,
    running: runRows.map(item => publish(mapRun(item))),
    ...finishedSummary(
      finishedRows.map(item => new Date(String(item.updated_at)).toISOString()),
      now,
    ),
  };
}

function historyStatus(run: StoredRun): HistoryRunStatus {
  if (run.status === 'running') return 'running';
  if (run.status === 'posted') return 'posted';
  if (run.status === 'abandoned' || run.state.phase !== 'finished') return 'abandoned';
  return 'finished';
}

/** This member's runs of one flow, newest first. Sets stay on the run that logged them. */
export async function readFlowHistory(
  user: PublicUser,
  input: { history: string; kind: 'flow' | 'personal' } | { recent: true },
  deps?: FlowRunDeps,
): Promise<{ runs: (HistoryRun & { flowId: string; kind: 'flow' | 'personal'; title: string })[] }> {
  const resolved = await resolveDeps(deps);
  const matches = (run: { kind: string; flowId: string }) =>
    'recent' in input || (run.kind === input.kind && run.flowId === input.history);
  const stored = resolved.demo
    ? memory()
        .runs.filter(run => run.userId === user.id && matches(run))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 'recent' in input ? 20 : 30)
    : await readHistorySql(user, input);
  const logs = await readRunSetLogs(
    user,
    stored.map(run => run.id),
    { demo: resolved.demo },
  );
  return {
    runs: stored.map(run => ({
      id: run.id,
      flowId: run.flowId,
      kind: run.kind,
      title: run.title,
      status: historyStatus(run),
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
      effort: run.effort,
      cards: run.state.cards.map(card => {
        const exerciseId = gymExerciseId(card.cardId);
        return {
          cardId: card.cardId,
          title: card.title,
          status: card.status,
          seconds: card.seconds,
          exerciseId,
          sets: logs
            .filter(log => log.runId === run.id && exerciseId != null && log.exerciseId === exerciseId)
            .sort((a, b) => a.setIndex - b.setIndex)
            .map(log => ({
              setIndex: log.setIndex,
              weightKg: log.weightKg,
              reps: log.reps,
              durationSeconds: log.durationSeconds,
              status: log.status,
              restPlannedSeconds: log.restPlannedSeconds,
            })),
        };
      }),
    })),
  };
}

async function readHistorySql(
  user: PublicUser,
  input: { history: string; kind: 'flow' | 'personal' } | { recent: true },
) {
  const { database } = await import('./database');
  const rows =
    'recent' in input
      ? await database()`SELECT * FROM flow_runs WHERE user_id=${user.id} ORDER BY started_at DESC LIMIT 20`
      : await database()`SELECT * FROM flow_runs
    WHERE user_id=${user.id} AND flow_kind=${input.kind} AND flow_id=${input.history}
    ORDER BY started_at DESC
    LIMIT 30`;
  return rows.map(row => mapRun(row));
}

export async function saveMetrics(
  user: PublicUser,
  input: { birthYear: number; weightKg: number; lifestyle: Lifestyle },
  deps?: FlowRunDeps,
  now = Date.now(),
) {
  if (!acceptableAge(input.birthYear, now))
    throw new FlowRunError('Enter a birth year that makes you 13 to 100.');
  const weightKg = Math.round(input.weightKg * 10) / 10;
  if (weightKg < 20 || weightKg > 300) throw new FlowRunError('Enter a weight from 20 to 300 kg.');
  const resolved = await resolveDeps(deps);
  const at = new Date(now).toISOString();
  if (resolved.demo) {
    const rows = memory().metrics;
    const existing = rows.find(row => row.userId === user.id);
    const next: StoredMetrics = {
      userId: user.id,
      birthYear: input.birthYear,
      weightKg,
      lifestyle: input.lifestyle,
      consentedAt: existing?.consentedAt ?? at,
      updatedAt: at,
    };
    if (existing) Object.assign(existing, next);
    else rows.push(next);
    return { birthYear: input.birthYear, weightKg, lifestyle: input.lifestyle };
  }
  const { database } = await import('./database');
  await database()`INSERT INTO user_metrics(user_id, birth_year, weight_kg, lifestyle, consented_at, updated_at)
    VALUES(${user.id}, ${input.birthYear}, ${weightKg}, ${input.lifestyle}, ${at}, ${at})
    ON CONFLICT(user_id) DO UPDATE SET birth_year=EXCLUDED.birth_year, weight_kg=EXCLUDED.weight_kg, lifestyle=EXCLUDED.lifestyle, updated_at=EXCLUDED.updated_at`;
  return { birthYear: input.birthYear, weightKg, lifestyle: input.lifestyle };
}

export async function deleteMetrics(user: PublicUser, deps?: FlowRunDeps) {
  const resolved = await resolveDeps(deps);
  if (resolved.demo) {
    const rows = memory();
    rows.metrics = rows.metrics.filter(row => row.userId !== user.id);
    return;
  }
  const { database } = await import('./database');
  await database()`DELETE FROM user_metrics WHERE user_id=${user.id}`;
}

export async function beginRun(
  user: PublicUser,
  input: { kind: 'flow' | 'personal'; id: string; level: RunLevel },
  deps?: FlowRunDeps,
  now = Date.now(),
) {
  const resolved = await resolveDeps(deps);
  const runnable = await resolveRunnable(user, input.kind, input.id, input.level, resolved);
  const at = new Date(now).toISOString();
  const bodyWeightKg = await currentBodyWeight(user.id, resolved.demo);
  if (resolved.demo) {
    const rows = memory();
    for (const run of rows.runs) {
      if (run.userId === user.id && run.kind === input.kind && run.flowId === input.id && run.status === 'running') {
        if (withinWindow(run.updatedAt, now)) return { run: publish(run), resumed: true };
        run.status = run.state.phase === 'finished' ? 'finished' : 'abandoned';
        run.updatedAt = at;
      }
    }
    const created: StoredRun = {
      id: `run-${crypto.randomUUID()}`,
      userId: user.id,
      kind: input.kind,
      flowId: input.id,
      title: runnable.title,
      level: input.level,
      state: startRun(runnable.cards, runnable.rest, now),
      status: 'running',
      activityId: null,
      startedAt: at,
      updatedAt: at,
      bodyWeightKg,
      effort: null,
    };
    rows.runs.push(created);
    return { run: publish(created), resumed: false };
  }
  const { database } = await import('./database');
  const sql = database();
  await sql`UPDATE flow_runs
    SET status=CASE WHEN state->>'phase'='finished' THEN 'finished' ELSE 'abandoned' END, updated_at=now()
    WHERE user_id=${user.id} AND flow_kind=${input.kind} AND flow_id=${input.id} AND status='running' AND updated_at <= now() - interval '24 hours'`;
  const [existing] = await sql`SELECT * FROM flow_runs WHERE user_id=${user.id} AND flow_kind=${input.kind} AND flow_id=${input.id} AND status='running'`;
  if (existing) return { run: publish(mapRun(existing)), resumed: true };
  const created: StoredRun = {
    id: `run-${crypto.randomUUID()}`,
    userId: user.id,
    kind: input.kind,
    flowId: input.id,
    title: runnable.title,
    level: input.level,
    state: startRun(runnable.cards, runnable.rest, now),
    status: 'running',
    activityId: null,
    startedAt: at,
    updatedAt: at,
    bodyWeightKg,
    effort: null,
  };
  try {
    await sql`INSERT INTO flow_runs(id, user_id, flow_kind, flow_id, title, level, state, status, started_at, updated_at, body_weight_kg)
      VALUES(${created.id}, ${user.id}, ${input.kind}, ${input.id}, ${created.title}, ${input.level}, ${JSON.stringify(created.state)}::jsonb, 'running', ${at}, ${at}, ${bodyWeightKg})`;
  } catch (error) {
    const [winner] = await sql`SELECT * FROM flow_runs WHERE user_id=${user.id} AND flow_kind=${input.kind} AND flow_id=${input.id} AND status='running'`;
    if (winner) return { run: publish(mapRun(winner)), resumed: true };
    throw error;
  }
  return { run: publish(created), resumed: false };
}

function owned(user: PublicUser, runId: string) {
  const run = memory().runs.find(item => item.id === runId);
  if (!run) throw new FlowRunError('Run not found.', 404);
  if (run.userId !== user.id) throw new FlowRunError('Only you can update this run.', 403);
  return run;
}

function applyEffort(run: StoredRun, effort?: number) {
  if (effort == null) return;
  run.effort = effortRating(effort);
}

export async function saveRun(
  user: PublicUser,
  runId: string,
  state: FlowRunState,
  deps?: FlowRunDeps,
  now = Date.now(),
  effort?: number,
) {
  const parsed = flowRunStateSchema.parse(state);
  if (effort != null) effortRating(effort);
  const resolved = await resolveDeps(deps);
  const at = new Date(now).toISOString();
  if (resolved.demo) {
    const run = owned(user, runId);
    if (run.status !== 'running') throw new FlowRunError('This run is already finished.');
    run.state = mergeState(run.state, parsed);
    applyEffort(run, effort);
    run.updatedAt = at;
    return publish(run);
  }
  const saved = await writeRun(user, runId, parsed, 'running', at, effort);
  if (saved.status !== 'running') throw new FlowRunError('This run is already finished.');
  return saved;
}

export async function finishRun(
  user: PublicUser,
  runId: string,
  state: FlowRunState,
  deps?: FlowRunDeps,
  now = Date.now(),
  effort?: number,
) {
  const parsed = flowRunStateSchema.parse(state);
  if (effort != null) effortRating(effort);
  const resolved = await resolveDeps(deps);
  const at = new Date(now).toISOString();
  if (resolved.demo) {
    const run = owned(user, runId);
    if (run.status !== 'running') return publish(run);
    run.state = mergeState(run.state, parsed);
    applyEffort(run, effort);
    run.status = run.state.phase === 'finished' ? 'finished' : 'abandoned';
    run.updatedAt = at;
    return publish(run);
  }
  return writeRun(user, runId, parsed, 'finished', at, effort);
}

async function currentBodyWeight(userId: string, demo: boolean) {
  if (demo) {
    const row = memory().metrics.find(item => item.userId === userId);
    return row?.weightKg ?? null;
  }
  const { database } = await import('./database');
  const [row] = await database()`SELECT weight_kg FROM user_metrics WHERE user_id=${userId}`;
  return row?.weight_kg == null ? null : Number(row.weight_kg);
}

async function writeRun(
  user: PublicUser,
  runId: string,
  state: FlowRunState,
  status: 'running' | 'finished',
  at: string,
  effort?: number,
) {
  const { database } = await import('./database');
  const sql = database();
  const [row] = await sql`SELECT * FROM flow_runs WHERE id=${runId}`;
  if (!row) throw new FlowRunError('Run not found.', 404);
  const run = mapRun(row);
  if (run.userId !== user.id) throw new FlowRunError('Only you can update this run.', 403);
  if (run.status !== 'running') return publish(run);
  const next = mergeState(run.state, state);
  const savedStatus = status === 'running' ? 'running' : next.phase === 'finished' ? 'finished' : 'abandoned';
  const savedEffort = effort == null ? run.effort : effortRating(effort);
  await sql`UPDATE flow_runs SET state=${JSON.stringify(next)}::jsonb, status=${savedStatus}, updated_at=${at}, effort=${savedEffort} WHERE id=${runId} AND user_id=${user.id} AND status='running'`;
  return publish({ ...run, state: next, status: savedStatus, updatedAt: at, effort: savedEffort });
}

export async function postRun(
  user: PublicUser,
  runId: string,
  note = '',
  deps?: FlowRunDeps,
  now = Date.now(),
) {
  const resolved = await resolveDeps(deps);
  const at = new Date(now).toISOString();
  const run = resolved.demo ? owned(user, runId) : await loadSql(user, runId);
  if (run.status === 'posted' && run.activityId) return { activityId: run.activityId, run: publish(run) };
  if (run.status !== 'running' || run.state.phase !== 'finished')
    throw new FlowRunError('Finish the flow before posting.');
  if (!canPost(run.state)) throw new FlowRunError('Finish at least one card before posting.');
  const cardIds = run.state.cards.filter(card => card.status === 'done').map(card => card.cardId);
  const activity = await resolved.recordActivity(user, {
    ...(run.kind === 'personal' ? { personalFlowId: run.flowId } : { flowId: run.flowId }),
    cardIds,
    note,
  });
  run.status = 'posted';
  run.activityId = activity.id;
  run.updatedAt = at;
  if (!resolved.demo) {
    const { database } = await import('./database');
    await database()`UPDATE flow_runs SET status='posted', activity_id=${activity.id}, updated_at=${at} WHERE id=${runId} AND user_id=${user.id}`;
  }
  return { activityId: activity.id, run: publish(run) };
}

async function loadSql(user: PublicUser, runId: string) {
  const { database } = await import('./database');
  const [row] = await database()`SELECT * FROM flow_runs WHERE id=${runId}`;
  if (!row) throw new FlowRunError('Run not found.', 404);
  const run = mapRun(row);
  if (run.userId !== user.id) throw new FlowRunError('Only you can update this run.', 403);
  return run;
}

function mapRun(row: Record<string, unknown>): StoredRun {
  const state = flowRunStateSchema.parse(typeof row.state === 'string' ? JSON.parse(row.state) : row.state);
  const level = String(row.level);
  if (!levels.includes(level as RunLevel)) throw new FlowRunError('Check the request and try again.');
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: row.flow_kind === 'personal' ? 'personal' : 'flow',
    flowId: String(row.flow_id),
    title: String(row.title),
    level: level as RunLevel,
    state,
    status: (row.status === 'posted' || row.status === 'finished' || row.status === 'abandoned'
      ? row.status
      : 'running') as StoredRun['status'],
    activityId: row.activity_id ? String(row.activity_id) : null,
    startedAt: new Date(String(row.started_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    bodyWeightKg: row.body_weight_kg == null ? null : Number(row.body_weight_kg),
    effort: row.effort == null ? null : Number(row.effort),
  };
}
