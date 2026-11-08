import { station, type GymExercise } from './exercises';
import { setsForProgression } from './set-detail';
import { resolveTarget, type GymFlowItem, type SetTarget } from './gym-flows';

export type LoggedSet = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds?: number | null;
  status?: 'done' | 'skipped';
  setIndex?: number;
  /** The rest after this set last time, when it was recorded. */
  restSeconds?: number | null;
};
export type PlannedSet = { weightKg: number | null; reps: number | null };
export type SetPlan = { sets: PlannedSet[]; raised: boolean };
type TargetItem = Pick<GymFlowItem, 'sets' | 'repsMin' | 'repsMax'> & { target?: SetTarget };

function roundKg(value: number) {
  return Math.round(value * 100) / 100;
}

function barbellIsolation(move: GymExercise) {
  const label = `${move.id} ${move.name}`.toLowerCase();
  if (label.includes('curl')) return true;
  const primary = move.muscles[0];
  return primary === 'biceps' || primary === 'forearms';
}

/** The rise for the next set. Squats and deadlifts on a barbell take a bigger jump; curls take a smaller one. */
export function setStepKg(move: GymExercise) {
  const place = station(move.station);
  if (!place) return null;
  if (move.station === 'barbell-rack') {
    const label = `${move.id} ${move.name}`.toLowerCase();
    if (label.includes('squat') || label.includes('deadlift')) return 10;
    if (barbellIsolation(move)) return 2.5;
  }
  return place.stepKg;
}

function hasStack(move: GymExercise) {
  if (move.load === 'bodyweight') return false;
  return setStepKg(move) != null;
}

/**
 * Weight for the set after the one just ticked.
 * Bodyweight, a station with no weight step, and an empty weight stay empty.
 * Missing the bottom of the rep range keeps the same weight.
 * Assisted machines go down, and never below zero.
 */
export function nextSetWeight(
  previous: { weightKg: number | null; reps: number },
  move: GymExercise,
  item: Pick<GymFlowItem, 'repsMin'>,
): number | null {
  if (!hasStack(move) || previous.weightKg == null) return null;
  const step = setStepKg(move);
  if (step == null) return null;
  if (previous.reps < item.repsMin) return previous.weightKg;
  const delta = move.load === 'assisted' ? -step : step;
  return roundKg(Math.max(0, previous.weightKg + delta));
}

function blankSets(count: number, reps: number | null): SetPlan {
  return { raised: false, sets: Array.from({ length: count }, () => ({ weightKg: null, reps })) };
}

/** Bodyweight has no stack, so the next session asks for more of the same target. */
function planBodyweight(item: TargetItem, lastSets: LoggedSet[] | null | undefined): SetPlan {
  const target = resolveTarget(item);
  if (target.kind !== 'reps') return blankSets(item.sets, null);
  const history = setsForProgression(lastSets);
  if (!history.length) return blankSets(item.sets, target.max);
  const sets: PlannedSet[] = [];
  for (let index = 0; index < item.sets; index += 1) {
    const known = history[index] ?? history[history.length - 1];
    const done = known?.reps;
    sets.push({ weightKg: null, reps: done == null ? target.max : Math.min(target.max, done) });
  }
  return { raised: false, sets };
}

/**
 * Prefill for every set in the exercise.
 * No history is blank for a loaded exercise. Otherwise each set copies the same set last time,
 * and a shorter history continues with nextSetWeight.
 * If every logged set reached the top of the range, each set rises by one step.
 * Bodyweight copies the reps already done, and never goes past the top of the target.
 */
export function planSets(move: GymExercise, item: TargetItem, lastSets: LoggedSet[] | null | undefined): SetPlan {
  if (move.load === 'bodyweight') return planBodyweight(item, lastSets);
  const history = setsForProgression(lastSets);
  if (!history.length) return blankSets(item.sets, null);
  const topped = history.every(set => (set.reps ?? 0) >= item.repsMax);
  const step = setStepKg(move);
  const raised = topped && hasStack(move) && step != null && history.every(set => set.weightKg != null);
  const delta = raised && step != null ? (move.load === 'assisted' ? -step : step) : 0;
  const sets: PlannedSet[] = [];
  for (let index = 0; index < item.sets; index += 1) {
    const known = history[index];
    if (known) {
      sets.push({
        weightKg: !hasStack(move) || known.weightKg == null ? null : roundKg(Math.max(0, known.weightKg + delta)),
        reps: raised ? item.repsMin : known.reps,
      });
      continue;
    }
    const anchor = history[history.length - 1];
    const previous = sets[index - 1];
    sets.push({
      weightKg: nextSetWeight({ weightKg: previous?.weightKg ?? null, reps: anchor.reps ?? 0 }, move, item),
      reps: raised ? item.repsMin : anchor.reps,
    });
  }
  return { raised, sets };
}

export function formatKg(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/**
 * The line under a bodyweight exercise. Weighted exercises keep their own line.
 * A max set has no suggestion. A hold steps up by 5 seconds, and never past the top.
 */
export function effortNote(move: GymExercise, item: TargetItem, lastSets: LoggedSet[] | null | undefined) {
  if (move.load !== 'bodyweight') return null;
  const target = resolveTarget(item);
  const history = setsForProgression(lastSets);
  if (!history.length) {
    return target.kind === 'max' ? null : "First time on this one. We'll remember how you did.";
  }
  if (target.kind === 'reps') {
    return history.length >= item.sets && history.every(set => (set.reps ?? 0) >= target.max)
      ? `You hit ${target.max} on every set. Try the next step when it feels easy.`
      : null;
  }
  if (target.kind === 'hold') {
    if (history.length >= item.sets && history.every(set => (set.durationSeconds ?? 0) >= target.maxSeconds)) {
      return `You hit ${target.maxSeconds} sec on every set. Try the next step when it feels easy.`;
    }
    const previous = history[history.length - 1]?.durationSeconds;
    if (previous == null) return null;
    const next = Math.min(target.maxSeconds, previous + 5);
    return next > previous ? `Last time ${previous} sec. Try ${next} sec.` : `Last time ${previous} sec.`;
  }
  const latest = history[history.length - 1];
  if (target.measure === 'hold') return latest?.durationSeconds == null ? null : `Last time ${latest.durationSeconds} sec.`;
  return latest?.reps == null ? null : `Last time ${latest.reps}.`;
}

/** The line under "How the weight goes up". Assisted stacks go down. */
export function riseLine(move: GymExercise) {
  const step = setStepKg(move);
  if (step == null) return null;
  return `${move.load === 'assisted' ? '−' : '+'}${formatKg(step)} kg each set`;
}
