import type { GraduationResult } from '../../shared/graduation';
import type { HistoryRun } from '../../shared/flow-history';
import type { FlowRunState } from '../../shared/flow-run';
import type { SetDetail } from '../../shared/set-detail';
import type { Lifestyle, RunLevel, UserMetrics } from '../../shared/flow-benchmarks';
import { api } from './api';

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
  bodyWeightKg?: number | null;
  effort?: number | null;
};

export function flowRunHome() {
  return api<{
    metrics: UserMetrics | null;
    running: FlowRunRecord[];
    finished: number;
    finishedAt: string[];
  }>('/api/mobile/runs');
}

export function saveFlowMetrics(metrics: UserMetrics) {
  return api<{ metrics: UserMetrics }>('/api/mobile/runs', { action: 'metrics', ...metrics, consent: true });
}

export function deleteFlowMetrics() {
  return api<{ metrics: null }>('/api/mobile/runs?scope=metrics', undefined, 'DELETE');
}

/** Your own recent runs across every flow. Private: only for your profile. */
export function recentRuns() {
  return api<{ runs: (HistoryRun & { flowId: string; kind: 'flow' | 'personal'; title: string })[] }>(
    '/api/mobile/runs?recent=1',
  );
}

export function loadGraduation(flowId: string) {
  return api<GraduationResult>(`/api/mobile/graduation?flowId=${encodeURIComponent(flowId)}`);
}

export function flowRunHistory(kind: 'flow' | 'personal', id: string) {
  return api<{ runs: HistoryRun[] }>(
    `/api/mobile/runs?history=${encodeURIComponent(id)}&kind=${kind}`,
  );
}

export function startFlowRun(input: { kind: 'flow' | 'personal'; id: string; level: RunLevel; version?: number }) {
  return api<{ run: FlowRunRecord; resumed: boolean }>('/api/mobile/runs', { action: 'start', ...input });
}

export function saveFlowRun(runId: string, state: FlowRunState, effort?: number) {
  return api<{ run: FlowRunRecord }>('/api/mobile/runs', {
    action: 'save',
    runId,
    state,
    ...(effort != null ? { effort } : {}),
  });
}

export function finishFlowRun(runId: string, state: FlowRunState, effort?: number) {
  return api<{ run: FlowRunRecord }>('/api/mobile/runs', {
    action: 'finish',
    runId,
    state,
    ...(effort != null ? { effort } : {}),
  });
}

export function postFlowRun(runId: string, note?: string) {
  return api<{ activityId: string; run: FlowRunRecord }>('/api/mobile/runs', {
    action: 'post',
    runId,
    ...(note ? { note } : {}),
  });
}

export type ExerciseSession = {
  exerciseId: string;
  loggedAt: string;
  sets: { setIndex?: number; weightKg: number | null; reps: number | null; durationSeconds: number | null; restSeconds?: number | null }[];
};

export function exerciseSessions(ids: string[]) {
  return api<{ sessions: ExerciseSession[] }>(
    `/api/mobile/exercises?ids=${encodeURIComponent(ids.join(','))}`,
  );
}

export function logExerciseSets(body: {
  runId?: string;
  exerciseId: string;
  sets: {
    setIndex: number;
    weightKg: number | null;
    reps: number | null;
    durationSeconds?: number | null;
    detail?: SetDetail;
  }[];
}) {
  return api<{ session: ExerciseSession }>('/api/mobile/exercises', { action: 'log', ...body });
}

export type { Lifestyle, RunLevel, UserMetrics };
