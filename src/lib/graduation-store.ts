/**
 * Graduation from the member's own finished runs of a flow.
 * A run that has reached the finish screen still counts, so the card can show
 * before they leave. Another member's runs are ignored.
 */
import { readRunSetLogs } from './exercise-log-store';
import type { PublicUser } from './types';
import { assessGraduation, type GraduationSession } from '../../shared/graduation';
import { gymFlowById, type GymFlow } from '../../shared/gym-flows';
import { applyCustomflow, customflowKey, type Customflows } from '../../shared/customflows';
import { readCustomflows } from './customflow-store';

const historyMs = 12 * 7 * 24 * 60 * 60 * 1000;

type RunHead = { id: string; flowId: string; updatedAt: string };

function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function phaseOf(state: unknown) {
  if (typeof state === 'string') {
    try {
      return phaseOf(JSON.parse(state) as unknown);
    } catch {
      return '';
    }
  }
  if (state && typeof state === 'object' && 'phase' in state) return String((state as { phase: unknown }).phase);
  return '';
}

function counts(status: string, phase: string) {
  if (status === 'finished' || status === 'posted') return true;
  return status === 'running' && phase === 'finished';
}

async function loadRuns(userId: string, sinceMs: number, demo: boolean, flowId?: string): Promise<RunHead[]> {
  const since = new Date(sinceMs).toISOString();
  if (demo) {
    const runs = globalThis.qramFlowRuns?.runs ?? [];
    return runs
      .filter(run => {
        if (run.userId !== userId || run.kind !== 'flow') return false;
        if (flowId && run.flowId !== flowId) return false;
        if (run.updatedAt < since) return false;
        return counts(run.status, run.state?.phase ?? '');
      })
      .map(run => ({ id: run.id, flowId: run.flowId, updatedAt: run.updatedAt }));
  }
  const { database } = await import('./database');
  const rows = flowId
    ? await database()`SELECT id, flow_id, status, state, updated_at FROM flow_runs
        WHERE user_id=${userId} AND flow_kind='flow' AND flow_id=${flowId} AND updated_at >= ${since}`
    : await database()`SELECT id, flow_id, status, state, updated_at FROM flow_runs
        WHERE user_id=${userId} AND flow_kind='flow' AND updated_at >= ${since}`;
  return rows.flatMap(row => {
    const status = String(row.status);
    if (!counts(status, phaseOf(row.state))) return [];
    return [{ id: String(row.id), flowId: String(row.flow_id), updatedAt: asIso(row.updated_at) }];
  });
}

function toSessions(
  runs: readonly RunHead[],
  logs: readonly {
    runId: string;
    exerciseId: string;
    setIndex: number;
    reps: number | null;
    durationSeconds: number | null;
    status: 'done' | 'skipped';
  }[],
): GraduationSession[] {
  return runs.map(run => ({
    finishedAt: run.updatedAt,
    sets: logs
      .filter(log => log.runId === run.id)
      .map(log => ({
        exerciseId: log.exerciseId,
        set: {
          setIndex: log.setIndex,
          reps: log.reps,
          durationSeconds: log.durationSeconds,
          status: log.status,
        },
      })),
  }));
}

/**
 * The flow as this member runs it: an exercise they swapped is judged on the replacement, because that is what
 * their sets are logged against. Without this a swapped slot could never count as ready.
 */
function memberItems(gym: GymFlow, customflows: Customflows) {
  return applyCustomflow(gym.items, customflows[customflowKey('qram-flow', gym.id)], item => item.exerciseId);
}

export async function readGraduation(user: PublicUser, flowId: string, demo: boolean, now = Date.now()) {
  const gym = gymFlowById(flowId);
  const runs = gym ? await loadRuns(user.id, now - historyMs, demo, flowId) : [];
  const logs = runs.length ? await readRunSetLogs(user, runs.map(run => run.id), { demo }) : [];
  const customflows = gym && runs.length ? await readCustomflows(user).catch(() => ({}) as Customflows) : {};
  return assessGraduation({
    flowId,
    items: gym ? memberItems(gym, customflows) : [],
    sessions: toSessions(runs, logs),
    now,
  });
}

/** How many different flows this member has outgrown. Two of them lift the member's level. */
export async function graduatedFlowCount(user: PublicUser, demo: boolean, now = Date.now()) {
  const runs = await loadRuns(user.id, now - historyMs, demo);
  const flowIds = [...new Set(runs.map(run => run.flowId))].filter(id => gymFlowById(id)?.items.length);
  if (!flowIds.length) return 0;
  const logs = await readRunSetLogs(user, runs.map(run => run.id), { demo });
  const customflows = await readCustomflows(user).catch(() => ({}) as Customflows);
  let count = 0;
  for (const flowId of flowIds) {
    const gym = gymFlowById(flowId);
    if (!gym) continue;
    const result = assessGraduation({
      flowId,
      items: memberItems(gym, customflows),
      sessions: toSessions(runs.filter(run => run.flowId === flowId), logs),
      now,
    });
    if (result.ready) count += 1;
  }
  return count;
}
