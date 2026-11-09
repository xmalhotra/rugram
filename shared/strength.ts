// How strong a member is on a few reference lifts, and the starting weight that follows for any
// other weighted exercise. Pure: the server feeds it the member's anchors and logged sets.
import { exercise, station, type GymExercise } from './exercises';
import type { Lifestyle } from './flow-benchmarks';
import { strengthMap } from './strength-map';

// ofDeadlift: squat and bench are medians from 419,959 raw lifters in OpenPowerlifting (public domain, see
// shared/strength-evidence.ts); the rest are coaching rules of thumb.
export const strengthPatterns = [
  { id: 'hinge', title: 'Deadlift', exerciseId: 'conventional-deadlift', ofDeadlift: 1 },
  { id: 'squat', title: 'Back squat', exerciseId: 'barbell-back-squat', ofDeadlift: 0.85 },
  { id: 'press', title: 'Bench press', exerciseId: 'barbell-bench-press', ofDeadlift: 0.53 },
  { id: 'overhead', title: 'Overhead press', exerciseId: 'barbell-overhead-press', ofDeadlift: 0.4 },
  { id: 'row', title: 'Barbell row', exerciseId: 'barbell-bent-over-row', ofDeadlift: 0.5 },
  { id: 'pulldown', title: 'Lat pulldown', exerciseId: 'wide-grip-lat-pulldown', ofDeadlift: 0.5 },
  { id: 'curl', title: 'Barbell curl', exerciseId: 'barbell-curl', ofDeadlift: 0.25 },
  { id: 'triceps', title: 'Rope pushdown', exerciseId: 'rope-pushdown', ofDeadlift: 0.2 },
] as const;

export type StrengthPattern = (typeof strengthPatterns)[number]['id'];

/** What the member told us: a weight they can lift for some reps on a pattern's reference lift. */
export type StrengthAnchor = { pattern: StrengthPattern; weightKg: number; reps: number; updatedAt: string };

/** One logged set, as the estimate needs it. */
export type StrengthSet = { exerciseId: string; weightKg: number | null; reps: number | null; loggedAt: string };

export type StrengthSource = 'you' | 'sets' | 'related' | 'body';

export type PatternStrength = {
  pattern: StrengthPattern;
  title: string;
  /** Estimated one-rep max on the reference lift. */
  oneRepMaxKg: number;
  source: StrengthSource;
  /** When the number was last confirmed: the anchor's date or the logged set's. */
  at: string | null;
};

export type StrengthProfile = { patterns: PatternStrength[] };

/** Logged sets older than this stop counting, so the estimate follows the member as they change. */
export const strengthWindowDays = 60;
/** Epley gets unreliable past this many reps. */
const maxEstimateReps = 12;
/** Reps kept in the tank on a first try. */
const firstTryReserve = 2;

/** Rough deadlift one-rep max per kg of body weight, by how active someone is. Deliberately cautious. */
const deadliftPerKg: Record<Lifestyle, number> = { sedentary: 0.6, light: 0.8, active: 1, athlete: 1.3 };

/** Estimated one-rep max from a set. Above 12 reps the set says little about a max, so it is not used. */
export function oneRepMax(weightKg: number, reps: number) {
  if (!(weightKg > 0) || !(reps >= 1) || reps > maxEstimateReps) return null;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** The weight a one-rep max allows for a number of reps, with a little left in reserve. */
export function weightForReps(oneRepMaxKg: number, reps: number, reserve = 0) {
  return oneRepMaxKg / (1 + (reps + reserve) / 30);
}

function patternOf(id: StrengthPattern) {
  return strengthPatterns.find(item => item.id === id)!;
}

/** Pattern and ratio for an exercise, or null when we can't predict it. */
export function strengthLink(exerciseId: string) {
  return strengthMap[exerciseId] ?? null;
}

/**
 * The member's strength on every pattern.
 * A pattern uses the best of its recent evidence: the anchor they gave and any logged set on an exercise
 * linked to it, scaled back to the reference lift. With no recent evidence it keeps the latest it has.
 * A pattern with no evidence at all borrows from the others through typical ratios to the deadlift,
 * and with nothing at all, from body weight.
 */
export function strengthProfile(input: {
  anchors: readonly StrengthAnchor[];
  sets: readonly StrengthSet[];
  bodyWeightKg?: number | null;
  lifestyle?: Lifestyle | null;
  now: number;
}): StrengthProfile {
  const since = input.now - strengthWindowDays * 24 * 60 * 60 * 1000;
  const evidence = new Map<StrengthPattern, { value: number; at: string; source: 'you' | 'sets' }[]>();
  const add = (pattern: StrengthPattern, value: number, at: string, source: 'you' | 'sets') => {
    const list = evidence.get(pattern) ?? [];
    list.push({ value, at, source });
    evidence.set(pattern, list);
  };
  for (const anchor of input.anchors) {
    const max = oneRepMax(anchor.weightKg, anchor.reps);
    if (max != null) add(anchor.pattern, max, anchor.updatedAt, 'you');
  }
  for (const set of input.sets) {
    const link = strengthLink(set.exerciseId);
    if (!link || set.weightKg == null || set.reps == null) continue;
    const max = oneRepMax(set.weightKg, set.reps);
    if (max != null) add(link.pattern, max / link.ratio, set.loggedAt, 'sets');
  }
  const known = new Map<StrengthPattern, PatternStrength>();
  for (const [pattern, list] of evidence) {
    const recent = list.filter(item => Date.parse(item.at) >= since);
    const pick = recent.length
      ? recent.reduce((best, item) => (item.value > best.value ? item : best))
      : list.reduce((latest, item) => (Date.parse(item.at) > Date.parse(latest.at) ? item : latest));
    known.set(pattern, {
      pattern,
      title: patternOf(pattern).title,
      oneRepMaxKg: round1(pick.value),
      source: pick.source,
      at: pick.at,
    });
  }
  // Every known pattern votes for a deadlift; the average is the member's overall level.
  const votes = [...known.values()].map(item => item.oneRepMaxKg / patternOf(item.pattern).ofDeadlift);
  const level = votes.length
    ? { deadlift: votes.reduce((sum, value) => sum + value, 0) / votes.length, source: 'related' as const }
    : input.bodyWeightKg
      ? { deadlift: input.bodyWeightKg * deadliftPerKg[input.lifestyle ?? 'light'], source: 'body' as const }
      : null;
  const patterns: PatternStrength[] = [];
  for (const item of strengthPatterns) {
    const found = known.get(item.id);
    if (found) patterns.push(found);
    else if (level)
      patterns.push({
        pattern: item.id,
        title: item.title,
        oneRepMaxKg: round1(level.deadlift * item.ofDeadlift),
        source: level.source,
        at: null,
      });
  }
  return { patterns };
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

/** The smallest jump the equipment really allows: plates for bars, the pair for dumbbells, the stack step for machines. */
export function loadIncrementKg(move: GymExercise) {
  if (['barbell-rack', 'smith', 'ez-bar', 'olympic', 'trap-bar', 'landmine', 'plates'].includes(move.station)) return 2.5;
  if (move.station === 'dumbbells') return 2;
  if (move.station === 'kettlebells') return 4;
  return station(move.station)?.stepKg ?? null;
}

/** An empty bar still weighs something, so a bar exercise never starts below it. */
function floorKg(move: GymExercise) {
  if (move.station === 'barbell-rack' || move.station === 'olympic') return 20;
  if (move.station === 'ez-bar') return 10;
  return 0;
}

export type StartEstimate = { weightKg: number; oneRepMaxKg: number; pattern: PatternStrength };

/**
 * A cautious first weight for an exercise the member hasn't logged yet, for the reps asked.
 * Rounded down to what the equipment allows. Null when the exercise isn't predictable or the member's
 * level is unknown.
 */
export function startWeight(exerciseId: string, reps: number | null, profile: StrengthProfile): StartEstimate | null {
  const move = exercise(exerciseId);
  const link = strengthLink(exerciseId);
  if (!move || move.load !== 'weight' || !link || reps == null || reps < 1) return null;
  const pattern = profile.patterns.find(item => item.pattern === link.pattern);
  if (!pattern) return null;
  const oneRepMaxKg = pattern.oneRepMaxKg * link.ratio;
  const raw = weightForReps(oneRepMaxKg, Math.min(reps, 30), firstTryReserve);
  const step = loadIncrementKg(move);
  const rounded = step ? Math.floor(raw / step) * step : Math.floor(raw);
  const weightKg = Math.max(floorKg(move), rounded);
  if (!(weightKg > 0)) return null;
  return { weightKg, oneRepMaxKg: round1(oneRepMaxKg), pattern };
}

/** Reps people think in when they talk about a working weight. */
export const workingReps = 8;

/** A weight that one-rep max allows for `reps`, rounded down to 2.5 kg: how members think about a lift. */
export function workingWeight(oneRepMaxKg: number, reps = workingReps) {
  return Math.floor(weightForReps(oneRepMaxKg, reps) / 2.5) * 2.5;
}

/** Where a number came from, for the line under it. */
export function sourceLine(pattern: PatternStrength) {
  if (pattern.source === 'you') return `From the ${pattern.title.toLowerCase()} you told us`;
  if (pattern.source === 'sets') return 'From your logged sets';
  if (pattern.source === 'related') return 'Estimated from your other lifts';
  return 'Estimated from your body weight';
}
