import type { GymExercise } from './exercises';
import { setStepKg } from './progression';
import type { LoggedSet } from './progression';
import { setsForProgression } from './set-detail';
import {
  measureOf,
  spreadAmounts,
  targetOf,
  type SchemeItem,
  type SetScheme,
} from './set-scheme-math';

export {
  amountListLabel,
  measureOf,
  parseScheme,
  registerSchemes,
  schemeById,
  seededSchemes,
  spreadAmounts,
  targetOf,
} from './set-scheme-math';
export type { SchemeItem, SetScheme } from './set-scheme-math';

export type SchemeSet = {
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
};

export type SchemePlan = {
  sets: SchemeSet[];
  raised: boolean;
};

export type OpenSet = SchemeSet & {
  ticked: boolean;
  touched: boolean;
};

function roundKg(value: number) {
  return Math.round(value * 100) / 100;
}

function carriesWeight(move: GymExercise) {
  return move.load !== 'bodyweight' && setStepKg(move) != null;
}

function harderStep(move: GymExercise) {
  const step = setStepKg(move);
  if (step == null || !carriesWeight(move)) return 0;
  return move.load === 'assisted' ? -step : step;
}

function schemeStep(move: GymExercise, scheme: SetScheme) {
  if (scheme.load === 'hold') return 0;
  const step = setStepKg(move);
  if (step == null || !carriesWeight(move)) return 0;
  const steps = scheme.loadSteps ?? 1;
  const direction = scheme.load === 'up' ? 1 : -1;
  const assisted = move.load === 'assisted' ? -1 : 1;
  return direction * assisted * step * steps;
}

function reached(set: LoggedSet, amount: number | null, measure: 'reps' | 'hold') {
  if (amount == null) {
    return measure === 'hold' ? (set.durationSeconds ?? 0) > 0 : (set.reps ?? 0) > 0;
  }
  if (measure === 'hold') return (set.durationSeconds ?? 0) >= amount;
  return (set.reps ?? 0) >= amount;
}

function rowsFrom(amounts: (number | null)[], measure: 'reps' | 'hold'): SchemeSet[] {
  return amounts.map(amount => ({
    weightKg: null,
    reps: measure === 'reps' ? amount : null,
    seconds: measure === 'hold' ? amount : null,
  }));
}

/**
 * Prefill for every set.
 * No history fills the rep or second targets. The weight starts at `start` (our estimate from the
 * member's strength) when there is one, and follows the scheme from there; otherwise it stays empty.
 * With history, each set keeps the weight from the same set last time.
 * If every set last time reached its own target, each weight rises by one equipment step.
 */
export function planWithScheme(
  move: GymExercise,
  item: SchemeItem,
  scheme: SetScheme,
  lastSets: LoggedSet[] | null | undefined,
  start: number | null = null,
): SchemePlan {
  const target = targetOf(item);
  const measure = measureOf(target);
  const amounts = spreadAmounts(scheme, target, item.sets);
  const history = setsForProgression(lastSets);
  if (!carriesWeight(move)) return { raised: false, sets: rowsFrom(amounts, measure) };
  if (!history.length) {
    const sets = rowsFrom(amounts, measure);
    if (start != null && start > 0)
      sets.forEach((row, index) => {
        row.weightKg = index === 0 ? start : roundKg(Math.max(0, (sets[index - 1].weightKg ?? start) + schemeStep(move, scheme)));
      });
    return { raised: false, sets };
  }
  const topped = history.every((set, index) => reached(set, amounts[index] ?? amounts[amounts.length - 1] ?? null, measure));
  const raised = topped && history.every(set => set.weightKg != null);
  const bump = raised ? harderStep(move) : 0;
  const sets: SchemeSet[] = [];
  for (let index = 0; index < item.sets; index += 1) {
    const amount = amounts[index] ?? null;
    const row: SchemeSet = {
      weightKg: null,
      reps: measure === 'reps' ? amount : null,
      seconds: measure === 'hold' ? amount : null,
    };
    const known = history[index];
    if (known) {
      row.weightKg = known.weightKg == null ? null : roundKg(Math.max(0, known.weightKg + bump));
    } else if (index > 0 && sets[index - 1]?.weightKg != null) {
      row.weightKg = roundKg(Math.max(0, (sets[index - 1]?.weightKg ?? 0) + schemeStep(move, scheme)));
    }
    sets.push(row);
  }
  return { raised, sets };
}

export function planBlock(
  move: GymExercise | undefined,
  item: SchemeItem,
  scheme: SetScheme,
  lastSets: LoggedSet[] | null | undefined,
  start: number | null = null,
): SchemePlan {
  if (!move) {
    const measure = measureOf(targetOf(item));
    return { raised: false, sets: rowsFrom(spreadAmounts(scheme, targetOf(item), item.sets), measure) };
  }
  return planWithScheme(move, item, scheme, lastSets, start);
}

/**
 * After a set is ticked, the next unticked set follows the scheme from what they used.
 * A set they typed in is left as they typed it.
 * Falling short of the plan keeps the next target from going higher than what they did.
 * Missing the bottom of the range while the weight is rising keeps the same weight.
 */
export function nextSetAfterTick(
  move: GymExercise | null,
  item: SchemeItem,
  scheme: SetScheme,
  sets: OpenSet[],
  tickedIndex: number,
): OpenSet[] {
  const next = sets.map(set => ({ ...set }));
  const current = next[tickedIndex];
  if (!current) return next;
  next[tickedIndex] = { ...current, ticked: true };
  const targetIndex = next.findIndex((set, index) => index > tickedIndex && !set.ticked);
  if (targetIndex < 0 || next[targetIndex].touched) return next;
  const target = targetOf(item);
  const measure = measureOf(target);
  const amounts = spreadAmounts(scheme, target, next.length);
  const boundsMin = target.kind === 'hold' ? target.minSeconds : target.kind === 'reps' ? target.min : item.repsMin;
  const done = measure === 'hold' ? current.seconds : current.reps;
  const plannedNow = amounts[tickedIndex] ?? null;
  let nextAmount = amounts[targetIndex] ?? null;
  if (done != null && plannedNow != null && done < plannedNow && nextAmount != null) nextAmount = Math.min(nextAmount, done);
  let weight = next[targetIndex].weightKg;
  if (move && !carriesWeight(move)) weight = null;
  else if (move && carriesWeight(move) && current.weightKg != null) {
    const missedMin = measure === 'reps' && current.reps != null && current.reps < boundsMin;
    weight = scheme.load === 'up' && missedMin ? current.weightKg : roundKg(Math.max(0, current.weightKg + schemeStep(move, scheme)));
  }
  next[targetIndex] = {
    ...next[targetIndex],
    weightKg: weight,
    reps: measure === 'reps' ? nextAmount : next[targetIndex].reps,
    seconds: measure === 'hold' ? nextAmount : next[targetIndex].seconds,
  };
  return next;
}

/** "Weight up, reps down: 12, 11, 10". Nothing, when the pattern leaves every set the same. */
export function schemeLine(scheme: SetScheme, plan: { sets: SchemeSet[] }): string | null {
  const timed = plan.sets.some(set => set.seconds != null);
  const amounts = plan.sets.map(set => (timed ? set.seconds : set.reps));
  if (amounts.every(value => value == null)) return null;
  const amountsDiffer = amounts.some(value => value !== amounts[0]);
  const loadChanges = scheme.load !== 'hold';
  if (!amountsDiffer && !loadChanges) return null;
  const parts: string[] = [];
  if (scheme.load === 'up') parts.push('weight up');
  if (scheme.load === 'down') parts.push('weight down');
  if (scheme.amount === 'down') parts.push(timed ? 'time down' : 'reps down');
  else if (scheme.amount === 'up') parts.push(timed ? 'time up' : 'reps up');
  else if (loadChanges) parts.push(timed ? 'time held' : 'reps held');
  if (!parts.length) return null;
  const numbers = amounts.map(value => (value == null ? 'max' : String(value))).join(', ');
  const sentence = `${parts.join(', ')}: ${numbers}`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
