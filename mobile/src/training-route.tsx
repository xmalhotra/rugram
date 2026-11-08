import { usePaneState } from './pane-state';

export type TrainingRoute =
  | { page: 'home' }
  | { page: 'plans' }
  | { page: 'plan'; id: string }
  | { page: 'session'; id: string; planId?: string }
  | { page: 'build' };

export function useTrainingRoute() {
  return usePaneState<TrainingRoute>('trainingRoute', { page: 'home' }, 'account');
}

export function useTrainingSessionPane() {
  return usePaneState<{ id: string; date: string } | null>('trainingSession', null, 'account');
}

export function useTrainingTick() {
  return usePaneState('trainingTick', 0, 'account');
}
