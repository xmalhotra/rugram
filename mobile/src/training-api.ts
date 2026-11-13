import { useEffect, useState } from 'react';
import type { ExerciseHowTo } from '../../shared/exercise-how-to';
import type { SetDetail } from '../../shared/set-detail';
import type { LogValue, PlanItem, SessionBlock, TrainingPlan, TrainingSession, TrainingType } from '../../shared/training';
import { registerSchemes, type SetScheme } from '../../shared/set-schemes';
import { api } from './api';

export type TrainingPlanSummary = {
  id: string;
  title: string;
  goal: string;
  level: string | null;
  weeks: number;
  status: 'draft' | 'live';
};

export type TrainingSessionSummary = {
  id: string;
  typeId: string;
  title: string;
  goal: string;
  level: string | null;
  status: 'draft' | 'live';
};

export type WeekItem = {
  kind: PlanItem['kind'];
  id: string | null;
  title: string;
  optional: boolean;
  label: string | null;
  status: 'done' | 'skipped' | 'open' | 'rest';
};

export type WeekDay = {
  date: string;
  week: number;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  status: 'done' | 'open' | 'rest' | 'empty';
  items: WeekItem[];
};

export type TrainingWeek = {
  active: boolean;
  plan: { id: string; sourcePlanId: string | null; title: string; goal: string; level: string | null; startDate: string; weeks: number } | null;
  days: WeekDay[];
};

export type ExerciseRecord = {
  exerciseId: string;
  loggedAt: string;
  sets: { weightKg: number | null; reps: number | null; durationSeconds: number | null }[];
};

export type TrainingSessionDetail = {
  session: TrainingSession;
  type: TrainingType;
  schemes?: SetScheme[];
  last: { sessionValues: Record<string, LogValue>; sets: { blockId: string; setIndex: number; values: Record<string, LogValue> | null }[] } | null;
  records: ExerciseRecord[];
};

export function trainingPlans() {
  return api<{ plans: TrainingPlanSummary[] }>('/api/mobile/training?resource=plans');
}

export function trainingPlan(id: string) {
  return api<{ plan: TrainingPlan; sessions: TrainingSession[] }>(`/api/mobile/training?resource=plan&id=${encodeURIComponent(id)}`);
}

export type CatalogSessionCard = {
  id: string;
  title: string;
  level: string | null;
  coverExerciseId: string | null;
  exerciseCount: number;
};

export function trainingSessions() {
  return api<{ sessions: TrainingSessionSummary[] }>('/api/mobile/training?resource=session');
}

export function trainingSessionsForTile(tileId: string) {
  return api<{ sessions: CatalogSessionCard[] }>(`/api/mobile/training?resource=session&tile=${encodeURIComponent(tileId)}`);
}

export function trainingSession(id: string) {
  return api<TrainingSessionDetail>(`/api/mobile/training?resource=session&id=${encodeURIComponent(id)}`);
}

export function trainingWeek(date: string) {
  return api<TrainingWeek>(`/api/mobile/training?resource=week&date=${encodeURIComponent(date)}`);
}

export function trainingManage() {
  return api<{ types: TrainingType[]; sessions: TrainingSession[]; plans: TrainingPlan[]; schemes?: SetScheme[] }>('/api/mobile/training?resource=manage');
}

export function trainingSchemes() {
  return api<{ schemes: SetScheme[] }>('/api/mobile/training?resource=schemes');
}

export function exerciseHowTo(id: string) {
  return api<{ howTo: ExerciseHowTo | null; general: string }>(
    `/api/mobile/training?resource=how-to&id=${encodeURIComponent(id)}`,
  );
}

/** Load live schemes into the shared registry. A network failure leaves the seeded patterns in place. */
export function loadTrainingSchemes() {
  return trainingSchemes()
    .then(result => {
      registerSchemes(result.schemes);
      return result.schemes;
    })
    .catch(() => [] as SetScheme[]);
}

/** Fetch schemes when this screen loads, then re-render so schemeById sees them. */
export function useTrainingSchemes() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    loadTrainingSchemes().finally(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

export function adoptTrainingPlan(planId: string, startDate: string) {
  return api<{ plan: { id: string; sourcePlanId: string | null; title: string; startDate: string } }>('/api/mobile/training', {
    action: 'use-plan',
    planId,
    startDate,
  });
}

export function setTrainingDay(input: { week: number; weekday: number; items: PlanItem[]; startDate?: string }) {
  return api<{ planId: string }>('/api/mobile/training', { action: 'set-day', ...input });
}

export function swapTrainingDays(input: { weekA: number; weekdayA: number; weekB: number; weekdayB: number }) {
  return api<{ planId: string }>('/api/mobile/training', { action: 'swap-days', ...input });
}

export function logTraining(input: {
  sessionId: string;
  planDate: string;
  sessionValues?: Record<string, LogValue>;
  blocks: {
    id: string;
    skipped?: boolean;
    exerciseId?: string;
    sets?: { index: number; skipped?: boolean; values?: Record<string, LogValue>; detail?: SetDetail }[];
  }[];
}) {
  return api<{ logId: string; canPost: boolean }>('/api/mobile/training', { action: 'log', ...input });
}

export function skipTraining(sessionId: string, planDate: string) {
  return api<{ status: string }>('/api/mobile/training', { action: 'skip', sessionId, planDate });
}

export function postTraining(sessionId: string, planDate: string, note: string) {
  return api<{ activityId: string }>('/api/mobile/training', { action: 'post', sessionId, planDate, note });
}

export function saveTrainingDefinition(kind: 'type' | 'session' | 'plan' | 'scheme', value: unknown) {
  const action = kind === 'type' ? 'upsert-type' : kind === 'session' ? 'upsert-session' : kind === 'plan' ? 'upsert-plan' : 'upsert-scheme';
  const key = kind === 'type' ? 'type' : kind === 'session' ? 'session' : kind === 'plan' ? 'plan' : 'scheme';
  return api<Record<string, unknown>>('/api/mobile/training', { action, [key]: value });
}

export function setTrainingStatus(kind: 'type' | 'session' | 'plan', id: string, status: 'draft' | 'live') {
  return api<{ id: string; status: string }>('/api/mobile/training', { action: 'set-status', kind, id, status });
}

export type { PlanItem, SessionBlock };
