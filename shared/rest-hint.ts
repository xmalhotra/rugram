/**
 * Rest after the set just logged.
 * Class time × effort × the member's factor, then held between 30 s and 5 min
 * and rounded to 5 s. A rest the member set themselves is returned as they set it.
 * Effort comes from weight and reps only. The gap since the previous set is never read.
 * On a hold, the seconds held stand in for reps.
 * Sources for the weights: docs/gym-catalogue.md, "Rest follows effort".
 */
import { exercise } from './exercises';
import { restFor } from './exercise-rest';

export const restHintMinSeconds = 30;
export const restHintMaxSeconds = 300;
export const restHintStepSeconds = 5;

/**
 * How much each signal moves the rest. Missing signals are left out and the
 * rest share what remains. A comment on each names the source; the write-up
 * is in docs/gym-catalogue.md.
 */
export const restEffortWeights = {
  /**
   * Reps against the member's best at this weight.
   * Refalo, Helms et al. (2023), Sports Med; Helms et al. (2016), Strength Cond J.
   * Proximity to failure. Fatigue rises sharply in the last reps, so this weighs most.
   */
  repsVsBest: 0.45,
  /**
   * Reps against the flow's range.
   * A prescribed range is a plan, not a measured max (ACSM 2026 load zones), so this weighs less than a real best.
   */
  repsVsRange: 0.25,
  /**
   * Weight against the member's estimate.
   * Grgic, Schoenfeld et al. (2018), Sports Med; de Salles et al. (2009), Sports Med.
   * Heavier work needs longer rest. The class already separates a squat from a curl, so this only nudges.
   */
  weightVsEstimate: 0.2,
  /**
   * A drop in reps from the previous set, at the same weight.
   * Thin evidence. Willardson (2006), J Strength Cond Res, describes lost reps when rest is short,
   * but no trial sets the next rest from the size of the drop. Kept small.
   */
  repDrop: 0.1,
} as const;

export type RestEffortSignal = keyof typeof restEffortWeights;

/** One logged set. `earlierSets` are earlier sets of this same exercise, oldest first. */
export type RestHintSet = {
  weightKg?: number | null;
  reps?: number | null;
  /** Used as the rep count when the exercise is a hold. Ignored on a rep exercise. */
  durationSeconds?: number | null;
};

export type RestHintRange = { min: number; max: number };

/** `reps` is held seconds when the exercise is a hold. */
export type RestHintBest = { reps: number; weightKg?: number | null };

export type RestHintEstimate = { weightKg: number | null };

export type RestHintInput = {
  exerciseId: string;
  set: RestHintSet;
  earlierSets?: readonly RestHintSet[] | null;
  range?: RestHintRange | null;
  best?: RestHintBest | null;
  estimate?: RestHintEstimate | null;
  /** Near 1. From `gym.restFactor`. Missing means 1. */
  memberFactor?: number | null;
  /** The member's own rest. When set, it wins outright and is not scaled. */
  customRest?: number | null;
};

export type RestHint = { seconds: number; reason: string };

/** Well under the range, or far from the member's best. */
const easyFactor = 0.4;
/** A set that matches the member's best. A little past that climbs, then the 5 min cap. */
const limitFactor = 2.7;
/** Ratio of reps to best that still counts as an ordinary set: about a quarter left. */
const ordinaryBestRatio = 0.75;
/** Effort rises quickly once the set passes the middle of the range. */
const rangeRise = 0.9;
/** The bottom of a range is still a real set, so the fall is gentler than the rise. */
const rangeFall = 0.32;
/** The hardest the range signal will call a set, short of the best-set signal. */
const rangeCap = 2.2;
/**
 * Share of the lost reps added to effort.
 * A full collapse adds half, not a doubling: the evidence for this signal is thin.
 */
const repDropGain = 0.5;
/** How far a heavier-than-estimated load pushes effort. Capped, because the class already did the big split. */
const loadGain = 0.8;
const loadFloor = 0.6;
const loadCap = 1.7;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(seconds: number) {
  return Math.round(seconds / restHintStepSeconds) * restHintStepSeconds;
}

/** No added weight: a bodyweight set, a blank, or a zero. */
function externalLoad(weightKg: number | null | undefined): number | null {
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  return weightKg;
}

function sameLoad(a: number | null | undefined, b: number | null | undefined) {
  const left = externalLoad(a);
  const right = externalLoad(b);
  if (left == null || right == null) return left == null && right == null;
  return Math.abs(left - right) <= 0.5;
}

/** Reps, or the seconds of a hold. Nothing else counts as work. */
function workCount(exerciseId: string, set: RestHintSet): number | null {
  const held = exercise(exerciseId)?.measure === 'hold';
  const value = held ? (set.durationSeconds ?? set.reps) : set.reps;
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

function rangeFactor(count: number, range: RestHintRange): number | null {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return null;
  const low = Math.min(range.min, range.max);
  const high = Math.max(range.min, range.max);
  if (!(high > 0)) return null;
  const span = Math.max(high - low, 1);
  const fromMid = (count - (low + high) / 2) / span;
  if (fromMid >= 0) return clamp(1 + fromMid * rangeRise, 1, rangeCap);
  return clamp(1 + fromMid * rangeFall, easyFactor, 1);
}

function bestFactor(count: number, best: number): number | null {
  if (!(best > 0)) return null;
  const ratio = count / best;
  if (ratio >= 1) return Math.min(limitFactor + Math.min(ratio - 1, 0.25) * 1.2, 3);
  if (ratio <= ordinaryBestRatio) return easyFactor + (1 - easyFactor) * (ratio / ordinaryBestRatio);
  const t = (ratio - ordinaryBestRatio) / (1 - ordinaryBestRatio);
  return 1 + (limitFactor - 1) * t * t;
}

function loadFactor(exerciseId: string, set: RestHintSet, estimate: RestHintEstimate | null | undefined): number | null {
  const weight = externalLoad(set.weightKg);
  const predicted = externalLoad(estimate?.weightKg);
  if (weight == null || predicted == null) return null;
  // More assistance is an easier set. Every other load is harder as the weight rises.
  const ratio = exercise(exerciseId)?.load === 'assisted' ? predicted / weight : weight / predicted;
  return clamp(1 + (ratio - 1) * loadGain, loadFloor, loadCap);
}

function previousCounted(exerciseId: string, earlier: readonly RestHintSet[] | null | undefined): RestHintSet | null {
  if (!earlier?.length) return null;
  for (let i = earlier.length - 1; i >= 0; i--) {
    if (workCount(exerciseId, earlier[i]) != null) return earlier[i];
  }
  return null;
}

function dropFactor(exerciseId: string, set: RestHintSet, earlier: readonly RestHintSet[] | null | undefined, count: number | null): number | null {
  if (count == null) return null;
  const previous = previousCounted(exerciseId, earlier);
  if (!previous || !sameLoad(set.weightKg, previous.weightKg)) return null;
  const before = workCount(exerciseId, previous);
  if (before == null || count >= before) return null;
  const lost = (before - count) / before;
  return 1 + Math.min(lost, 1) * repDropGain;
}

function effortOf(input: RestHintInput): number {
  const count = workCount(input.exerciseId, input.set);
  const parts: { key: RestEffortSignal; factor: number }[] = [];
  if (count != null && input.range) {
    const factor = rangeFactor(count, input.range);
    if (factor != null) parts.push({ key: 'repsVsRange', factor });
  }
  if (count != null && input.best && sameLoad(input.set.weightKg, input.best.weightKg) && input.best.reps > 0) {
    const factor = bestFactor(count, input.best.reps);
    if (factor != null) parts.push({ key: 'repsVsBest', factor });
  }
  const load = loadFactor(input.exerciseId, input.set, input.estimate);
  if (load != null) parts.push({ key: 'weightVsEstimate', factor: load });
  const drop = dropFactor(input.exerciseId, input.set, input.earlierSets, count);
  if (drop != null) parts.push({ key: 'repDrop', factor: drop });
  if (!parts.length) return 1;
  let weight = 0;
  let total = 0;
  for (const part of parts) {
    const share = restEffortWeights[part.key];
    weight += share;
    total += share * part.factor;
  }
  return weight > 0 ? total / weight : 1;
}

function reasonFor(effort: number): string {
  if (effort >= 1.15) return 'A hard set. Take a little longer.';
  if (effort <= 0.85) return 'An easy one.';
  return 'About the usual rest.';
}

function memberScale(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 1;
  return value;
}

/** The most reps, or held seconds, logged at the same load. Other weights are ignored. */
export function bestAtLoad(
  exerciseId: string,
  sets: readonly RestHintSet[],
  weightKg: number | null | undefined,
): RestHintBest | null {
  const held = exercise(exerciseId)?.measure === 'hold';
  let best: number | null = null;
  for (const set of sets) {
    if (!sameLoad(set.weightKg, weightKg)) continue;
    const count = held ? (set.durationSeconds ?? set.reps) : set.reps;
    if (count == null || !Number.isFinite(count) || count <= 0) continue;
    if (best == null || count > best) best = count;
  }
  if (best == null) return null;
  return { reps: best, weightKg: externalLoad(weightKg) };
}

export function restHint(input: RestHintInput): RestHint {
  if (typeof input.customRest === 'number' && Number.isFinite(input.customRest)) {
    return { seconds: input.customRest, reason: 'The rest you set.' };
  }
  const effort = effortOf(input);
  const scale = memberScale(input.memberFactor);
  const raw = restFor(input.exerciseId) * effort * scale;
  const clamped = clamp(raw, restHintMinSeconds, restHintMaxSeconds);
  return { seconds: roundToStep(clamped), reason: reasonFor(effort) };
}
