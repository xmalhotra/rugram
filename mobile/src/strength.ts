import { useEffect, useState } from 'react';
import { api } from './api';
import { resolveTarget, type GymFlowItem } from '../../shared/gym-flows';
import type { GymExercise } from '../../shared/exercises';
import { formatKg } from '../../shared/progression';
import type { Lifestyle } from '../../shared/flow-benchmarks';
import {
  sourceLine,
  startWeight,
  type StartEstimate,
  type StrengthAnchor,
  type StrengthPattern,
  type StrengthProfile,
} from '../../shared/strength';

export type Strength = {
  anchors: StrengthAnchor[];
  /** Body weight the estimate uses when no lift is known. */
  body: { weightKg: number; lifestyle: Lifestyle } | null;
  profile: StrengthProfile;
};

// The last answer, kept for the session so set rows can use it without waiting.
let current: Strength | null = null;
let pending: Promise<Strength | null> | null = null;
const listeners = new Set<(value: Strength | null) => void>();

function publish(value: Strength | null) {
  current = value;
  listeners.forEach(listener => listener(value));
}

/** Loads (or reloads) the member's strength. A failed read keeps what we had. */
export function loadStrength(force = false) {
  if (pending && !force) return pending;
  pending = api<Strength>('/api/mobile/strength')
    .then(value => {
      publish(value);
      return value;
    })
    .catch(() => current)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function currentStrength() {
  return current;
}

/** Forget the member's numbers, for example on sign-out. */
export function resetStrength() {
  publish(null);
}

export function useStrength() {
  const [value, setValue] = useState<Strength | null>(current);
  useEffect(() => {
    listeners.add(setValue);
    void loadStrength();
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

export async function saveAnchor(pattern: StrengthPattern, weightKg: number, reps: number) {
  const value = await api<Strength>('/api/mobile/strength', { action: 'anchor', pattern, weightKg, reps });
  publish(value);
  return value;
}

/** Body weight and activity, for an estimate when no lift is known. */
export async function saveBody(weightKg: number, lifestyle: Lifestyle) {
  const value = await api<Strength>('/api/mobile/strength', { action: 'body', weightKg, lifestyle });
  publish(value);
  return value;
}

export async function clearAnchor(pattern: StrengthPattern) {
  const value = await api<Strength>('/api/mobile/strength', { action: 'clear', pattern });
  publish(value);
  return value;
}

/** Our first weight for an exercise with no history, for the item's first set. Null without an estimate. */
export function estimateStart(move: GymExercise, item: Pick<GymFlowItem, 'repsMin' | 'repsMax' | 'target'>): StartEstimate | null {
  if (!current) return null;
  const target = resolveTarget(item);
  const reps = target.kind === 'reps' ? target.max : null;
  return startWeight(move.id, reps, current.profile);
}

/** The note under a first-time weighted exercise we couldn't estimate. Says how to get estimates when nothing is known. */
export function noEstimateLine() {
  const known = Boolean(current?.profile.patterns.length);
  return known
    ? "First time on this one. Add your weight and we'll remember it."
    : "First time on this one. Add your weight and we'll remember it. Add your body weight under Personalise and we'll suggest a start for every exercise.";
}

/** The note under a first-time exercise when we filled the weight in. */
export function estimateLine(estimate: StartEstimate) {
  return `First time on this one. We started you at ${formatKg(estimate.weightKg)} kg. ${sourceLine(estimate.pattern)}. Change it if it feels off.`;
}
