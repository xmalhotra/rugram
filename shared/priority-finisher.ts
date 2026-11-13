/**
 * A short finisher for a muscle the member marked as a priority.
 * It is the Personalised layer: the flow as written stays the same for everyone else,
 * and a Customflow can still reorder the finisher, swap it, or leave it out.
 * See docs/gym-catalogue.md (smaller muscles) and docs/customflows.md.
 */
import type { Customflow } from './customflows';
import { applyCustomflow } from './customflows';
import { exerciseRestClass } from './exercise-rest';
import { exercise, gymExercises } from './exercises';
import { equipmentForExercise, flowEquipment, placeCanDo, type FlowLevel, type TrainPlace } from './flow-defaults';
import { gymFlows, type GymFlowItem } from './gym-flows';
import { howToLoopIds } from './how-to-loops';
import { exerciseMuscles, type MuscleArea } from './muscle-map';

/** Direct sets in one flow. Above this, the sets belong on another day. */
export const sessionSetCap = 10;

/** At most one finisher per priority, and at most this many on a single flow. */
const maxFinishers = 2;

/**
 * A priority gets a finisher only when the flow already trains one of these as a main area.
 * Any other area already has its own tile, so it is left alone.
 */
const neighbours: Partial<Record<MuscleArea, readonly MuscleArea[]>> = {
  forearms: ['biceps', 'triceps'],
  calves: ['quads', 'hamstrings', 'glutes'],
  shins: ['calves', 'quads'],
  neck: ['traps'],
  'rear-delts': ['lats', 'mid-back', 'side-delts'],
  'side-delts': ['front-delts', 'chest'],
  'lower-back': ['hamstrings', 'glutes'],
  abductors: ['quads', 'glutes'],
  adductors: ['quads', 'glutes'],
  obliques: ['upper-abs', 'lower-abs'],
  'upper-abs': ['obliques', 'lower-abs'],
  'lower-abs': ['obliques', 'upper-abs'],
};

const curated = new Set(gymFlows.flatMap(flow => flow.items.map(item => item.exerciseId)));

export function flowLevelOf(level: string): FlowLevel {
  if (level === 'Intermediate' || level === 'Advanced') return level;
  return 'Beginner';
}

function unique(areas: readonly MuscleArea[]) {
  const seen = new Set<MuscleArea>();
  const list: MuscleArea[] = [];
  for (const area of areas) {
    if (seen.has(area)) continue;
    seen.add(area);
    list.push(area);
  }
  return list;
}

function mainSets(items: readonly Pick<GymFlowItem, 'exerciseId' | 'sets'>[], area: MuscleArea) {
  let total = 0;
  for (const item of items) {
    if (item.sets <= 0) continue;
    const tag = exerciseMuscles[item.exerciseId];
    if (tag?.main.includes(area)) total += item.sets;
  }
  return total;
}

function trainsMain(items: readonly Pick<GymFlowItem, 'exerciseId' | 'sets'>[], area: MuscleArea) {
  return items.some(item => item.sets > 0 && exerciseMuscles[item.exerciseId]?.main.includes(area));
}

/** Gym when any exercise needs a gym. Otherwise the most demanding home place, so the finisher stays doable. */
function finisherPlace(items: readonly GymFlowItem[]): TrainPlace {
  const ids = items.map(item => item.exerciseId);
  if (ids.some(id => equipmentForExercise(id) === 'gym')) return 'gym';
  return flowEquipment(ids);
}

function fitsCap(items: readonly GymFlowItem[], exerciseId: string, sets: number) {
  const tag = exerciseMuscles[exerciseId];
  if (!tag) return false;
  return tag.main.every(area => mainSets(items, area) + sets <= sessionSetCap);
}

function prescription(level: FlowLevel) {
  if (level === 'Advanced') return { sets: 3, min: 10, max: 12 };
  return { sets: 2, min: 12, max: 15 };
}

/** How many of this exercise's helper muscles the flow already trains as a main area. */
function nearFlow(exerciseId: string, items: readonly GymFlowItem[]) {
  return (exerciseMuscles[exerciseId]?.helpers ?? []).filter(area => trainsMain(items, area)).length;
}

const barKit = new Set(['barbell', 'ez-bar', 'trap-bar', 'smith']);
/** 0 is the best fit for the level. A beginner's finisher avoids the bar; later levels have no preference. */
function levelFit(equipment: string, level: FlowLevel) {
  return level === 'Beginner' && barKit.has(equipment) ? 1 : 0;
}

function chooseExercise(
  area: MuscleArea,
  items: readonly GymFlowItem[],
  taken: ReadonlySet<string>,
  place: TrainPlace,
  sets: number,
  level: FlowLevel,
) {
  const options = gymExercises.filter(move => {
    const tag = exerciseMuscles[move.id];
    if (!tag?.main.includes(area)) return false;
    const rest = exerciseRestClass[move.id];
    if (rest !== 'isolation' && rest !== 'core') return false;
    if (!howToLoopIds.has(move.id)) return false;
    if (taken.has(move.id)) return false;
    if (!placeCanDo(equipmentForExercise(move.id), place)) return false;
    if (!fitsCap(items, move.id, sets)) return false;
    return true;
  });
  options.sort((a, b) => {
    const aCurated = curated.has(a.id) ? 0 : 1;
    const bCurated = curated.has(b.id) ? 0 : 1;
    if (aCurated !== bCurated) return aCurated - bCurated;
    // The catalogue's level rule: beginners get dumbbells, cables and machines before a barbell.
    const aFit = levelFit(a.equipment, level);
    const bFit = levelFit(b.equipment, level);
    if (aFit !== bFit) return aFit - bFit;
    // Closest to what the flow already does: an exercise whose helper muscles the flow trains (a reverse curl on
    // an arms day), and counted reps before a timed hold.
    const aNear = nearFlow(a.id, items);
    const bNear = nearFlow(b.id, items);
    if (aNear !== bNear) return bNear - aNear;
    const aHold = a.measure === 'hold' ? 1 : 0;
    const bHold = b.measure === 'hold' ? 1 : 0;
    if (aHold !== bHold) return aHold - bHold;
    return a.name.localeCompare(b.name);
  });
  return options[0] ?? null;
}

function itemFor(exerciseId: string, level: FlowLevel, items: readonly GymFlowItem[]): GymFlowItem | null {
  const dose = prescription(level);
  if (!fitsCap(items, exerciseId, dose.sets)) return null;
  // A hold (a plank, a hang) is timed, not counted: 20–30 seconds, or 30–45 for advanced.
  if (exercise(exerciseId)?.measure === 'hold') {
    const seconds = level === 'Advanced' ? { min: 30, max: 45 } : { min: 20, max: 30 };
    return {
      exerciseId,
      sets: dose.sets,
      repsMin: seconds.min,
      repsMax: seconds.max,
      target: { kind: 'hold', minSeconds: seconds.min, maxSeconds: seconds.max },
    };
  }
  return {
    exerciseId,
    sets: dose.sets,
    repsMin: dose.min,
    repsMax: dose.max,
    target: { kind: 'reps', min: dose.min, max: dose.max },
  };
}

/**
 * At most one extra item per priority area, and at most two on the flow.
 * Added only when a neighbour is already a main area and the priority itself has fewer than 2 main sets.
 * The caller appends these. They go last until a Customflow moves them.
 */
export function finisherFor(items: readonly GymFlowItem[], priorities: readonly MuscleArea[], level: FlowLevel): GymFlowItem[] {
  const place = finisherPlace(items);
  const dose = prescription(level);
  const taken = new Set(items.map(item => item.exerciseId));
  const added: GymFlowItem[] = [];
  const soFar = [...items];
  for (const area of unique(priorities)) {
    if (added.length >= maxFinishers) break;
    const near = neighbours[area];
    if (!near?.some(neighbour => trainsMain(items, neighbour))) continue;
    if (mainSets(items, area) >= 2) continue;
    const move = chooseExercise(area, soFar, taken, place, dose.sets, level);
    if (!move) continue;
    const item = itemFor(move.id, level, soFar);
    if (!item) continue;
    added.push(item);
    soFar.push(item);
    taken.add(move.id);
  }
  return added;
}

/** The flow's own items, then its finishers. Customflow is not applied yet. */
export function withFinishers(items: readonly GymFlowItem[], priorities: readonly MuscleArea[], level: FlowLevel): GymFlowItem[] {
  return [...items, ...finisherFor(items, priorities, level)];
}

/** What this member runs: the written flow, the priority finisher, then their Customflow. */
export function memberGymItems(
  items: readonly GymFlowItem[],
  priorities: readonly MuscleArea[],
  level: FlowLevel,
  customflow?: Customflow,
): GymFlowItem[] {
  return applyCustomflow(withFinishers(items, priorities, level), customflow, item => item.exerciseId);
}

/** Exercise ids of the finishers this flow would add before a Customflow drops one. */
export function prioritySourceIds(items: readonly GymFlowItem[], priorities: readonly MuscleArea[], level: FlowLevel) {
  return finisherFor(items, priorities, level).map(item => item.exerciseId);
}

/** True when a finisher is still in the list the member sees, including after a swap. */
export function finisherKept(
  items: readonly GymFlowItem[],
  priorities: readonly MuscleArea[],
  level: FlowLevel,
  customflow?: Customflow,
) {
  const extras = finisherFor(items, priorities, level);
  if (!extras.length) return false;
  const resolved = memberGymItems(items, priorities, level, customflow);
  return extras.some(extra => {
    const swapped = customflow?.changes.swaps?.[extra.exerciseId];
    const shown = swapped && swapped !== extra.exerciseId ? swapped : extra.exerciseId;
    return resolved.some(item => item.exerciseId === shown);
  });
}
