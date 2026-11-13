/**
 * Default gym-flow filters. Pure: the app passes what it knows about the member.
 *
 * Goal tags come from onboarding focus picks (`shared/focus.ts`):
 * - workout → strength, size (gym training is both)
 * - running → fitness
 * - hyrox → fitness, strength
 * - sleep, morning-drinks, supplements, coding, nutrition → no gym goal, so they hide nothing
 *
 * A gym catalogue session is tagged from what it is for:
 * - power days → strength
 * - size days → size
 * - strength + conditioning → strength, fitness
 * - a title that says strength or heavy → strength
 * - full body → strength, size, fitness
 * - every other gym session → strength, size
 * None of these sessions is mobility work, so none is tagged mobility.
 *
 * Equipment is the most demanding piece in the session. A bar, machine, cable,
 * or gym cardio machine needs a gym. Dumbbells, kettlebells and bands are home
 * dumbbells. Bodyweight, rings, suspension and a jump rope are bodyweight.
 */
import { exercise, type Equipment } from './exercises';
import { gymEstimatedMinutes, type GymFlowItem } from './gym-flows';
import { flowMuscleMap, muscleAreas, type MuscleArea } from './muscle-map';

export type FlowLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type FlowGoal = 'strength' | 'size' | 'fitness' | 'mobility';
export type TrainPlace = 'gym' | 'dumbbells' | 'bodyweight';
export type WorkoutMinutes = 30 | 45 | 60;

export { benchOfDeadlift, memberLevel, squatOfDeadlift } from './member-level';
export type { MemberLevelInput } from './member-level';

const levelRank: Record<FlowLevel, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const goalOrder: FlowGoal[] = ['strength', 'size', 'fitness', 'mobility'];

export const focusGoalMap: { focusId: string; goals: FlowGoal[] }[] = [
  { focusId: 'workout', goals: ['strength', 'size'] },
  { focusId: 'running', goals: ['fitness'] },
  { focusId: 'hyrox', goals: ['fitness', 'strength'] },
];

export const trainPlaceChoices: { id: TrainPlace; label: string }[] = [
  { id: 'gym', label: 'Gym' },
  { id: 'dumbbells', label: 'Home with dumbbells' },
  { id: 'bodyweight', label: 'Bodyweight only' },
];

export const trainPlaceChip: Record<TrainPlace, string> = {
  gym: 'Gym',
  dumbbells: 'Dumbbells',
  bodyweight: 'Bodyweight',
};

export const goalChip: Record<FlowGoal, string> = {
  strength: 'Strength',
  size: 'Size',
  fitness: 'Fitness',
  mobility: 'Mobility',
};

export function goalsFromFocus(ids: readonly string[]): FlowGoal[] {
  const chosen = new Set<FlowGoal>();
  for (const id of ids) {
    const row = focusGoalMap.find(item => item.focusId === id);
    for (const goal of row?.goals ?? []) chosen.add(goal);
  }
  return goalOrder.filter(goal => chosen.has(goal));
}

/** Goal tags for one gym catalogue flow. Other tiles are not tagged. */
export function goalsForCatalogFlow(flow: { id: string; title: string; tileId: string }): FlowGoal[] {
  if (!flow.tileId.startsWith('gym-')) return [];
  if (flow.id.includes('strength-conditioning')) return ['strength', 'fitness'];
  if (flow.id.includes('power-')) return ['strength'];
  if (flow.id.includes('size-')) return ['size'];
  if (/strength|heavy/i.test(flow.title)) return ['strength'];
  if (flow.tileId === 'gym-full') return ['strength', 'size', 'fitness'];
  return ['strength', 'size'];
}

const homeGear = new Set<Equipment>(['dumbbell', 'kettlebell', 'band']);
const bodyGear = new Set<Equipment>(['bodyweight', 'rings', 'suspension', 'jump-rope']);

/** The place a single exercise needs. Unknown equipment counts as a gym, so it is never offered as doable at home. */
export function equipmentForExercise(exerciseId: string): TrainPlace {
  const gear = exercise(exerciseId)?.equipment;
  if (!gear) return 'gym';
  if (homeGear.has(gear)) return 'dumbbells';
  if (bodyGear.has(gear)) return 'bodyweight';
  return 'gym';
}

/** The most demanding place among the exercises. */
export function flowEquipment(exerciseIds: readonly string[]): TrainPlace {
  let need: TrainPlace = 'bodyweight';
  for (const id of exerciseIds) {
    const place = equipmentForExercise(id);
    if (place === 'gym') return 'gym';
    if (place === 'dumbbells') need = 'dumbbells';
  }
  return exerciseIds.length ? need : 'gym';
}

export type SessionFactsInput = {
  id: string;
  level: FlowLevel;
  goals: readonly FlowGoal[];
  items: Pick<GymFlowItem, 'exerciseId' | 'sets' | 'restSeconds'>[];
};

export type FlowFacts = {
  level: FlowLevel;
  goals: FlowGoal[];
  equipment: TrainPlace;
  minutes: number;
  areas: MuscleArea[];
};

/** Level, goals, equipment, minutes and main muscle areas for one session. */
export function sessionFacts(flow: SessionFactsInput): FlowFacts & { id: string } {
  const ids = flow.items.map(item => item.exerciseId);
  return {
    id: flow.id,
    level: flow.level,
    goals: [...flow.goals],
    equipment: flowEquipment(ids),
    minutes: gymEstimatedMinutes(flow),
    areas: flowMuscleMap(ids).main,
  };
}

export type FlowOverrides = {
  /**
   * Level floor. A named level hides anything below it. `All` or null clears
   * the floor. Omitted means use the member's own level.
   */
  level?: FlowLevel | 'All' | null;
  /** A level the member picked by hand. Only that level stays, and it beats the floor. */
  levelPick?: FlowLevel | null;
  place?: TrainPlace | null;
  minutes?: WorkoutMinutes | null;
  goals?: FlowGoal[] | null;
};

export type FlowMember = {
  level: FlowLevel;
  goals?: FlowGoal[];
  place?: TrainPlace;
  minutes?: number;
  gaps?: MuscleArea[];
  priorities?: MuscleArea[];
  overrides?: FlowOverrides;
};

export type FlowView<T extends FlowFacts> = T & { labels: string[]; reason?: string };

const noHit = 1000;

function activeList<T>(override: readonly T[] | null | undefined, fallback: readonly T[] | undefined) {
  if (override === null) return undefined;
  if (override && override.length) return override;
  return fallback && fallback.length ? fallback : undefined;
}

function activePlace(member: FlowMember): TrainPlace | undefined {
  const override = member.overrides?.place;
  if (override === null) return undefined;
  return override ?? member.place;
}

function activeMinutes(member: FlowMember): number | undefined {
  const override = member.overrides?.minutes;
  if (override === null) return undefined;
  return override ?? member.minutes;
}

/**
 * A place can do an exercise that needs `need`, and anything less demanding.
 * A gym can do every place. Home dumbbells can do dumbbells and bodyweight.
 * Bodyweight can only do bodyweight.
 */
export function placeCanDo(need: TrainPlace, place: TrainPlace) {
  if (place === 'gym') return true;
  if (place === 'dumbbells') return need !== 'gym';
  return need === 'bodyweight';
}

/**
 * "Needs a gym" or "Needs dumbbells" when the member's place cannot do this.
 * No place, or a place that can, returns nothing. The flow stays either way.
 */
export function placeMismatchLabel(need: TrainPlace, place?: TrainPlace) {
  if (!place || placeCanDo(need, place)) return null;
  return need === 'gym' ? 'Needs a gym' : 'Needs dumbbells';
}

/** The place label for a list of exercises, from the most demanding one. */
export function exercisesPlaceLabel(exerciseIds: readonly string[], place?: TrainPlace) {
  if (!exerciseIds.length) return null;
  return placeMismatchLabel(flowEquipment(exerciseIds), place);
}

function equipmentFits(flow: TrainPlace, place: TrainPlace) {
  return placeCanDo(flow, place);
}

function equipmentLabel(flow: TrainPlace, place: TrainPlace) {
  if (equipmentFits(flow, place)) return null;
  return flow === 'gym' ? 'Needs a gym' : 'Needs dumbbells';
}

function areaPhrase(area: MuscleArea) {
  return (muscleAreas.find(item => item.id === area)?.title ?? area).toLowerCase();
}

function firstHit(areas: readonly MuscleArea[], wanted: readonly MuscleArea[]) {
  let best = noHit;
  for (let index = 0; index < wanted.length; index += 1) {
    if (areas.includes(wanted[index])) best = Math.min(best, index);
  }
  return best;
}

/**
 * Visible flows, in the order to show them. Each keeps its own fields and gains
 * `labels` and, when it covers a gap or a priority, `reason`.
 * Only an outgrown level and a goal the member did not pick can hide a flow.
 * A hand-picked level, or a cleared filter, beats the default.
 */
export function defaultFlowView<T extends FlowFacts>(flows: readonly T[], member: FlowMember): FlowView<T>[] {
  const pick = member.overrides?.levelPick ?? null;
  const floorOverride = member.overrides?.level;
  const floor: FlowLevel | null = pick
    ? null
    : floorOverride === null || floorOverride === 'All'
      ? null
      : (floorOverride ?? member.level);
  const goals = activeList(member.overrides?.goals, member.goals);
  const place = activePlace(member);
  const minutes = activeMinutes(member);
  const gaps = member.gaps ?? [];
  const priorities = member.priorities ?? [];
  const rankLevel = floor ? member.level : null;

  const ranked = flows.map((flow, index) => {
    const distance = levelRank[flow.level] - levelRank[member.level];
    const hidden =
      (pick != null && flow.level !== pick) ||
      (floor != null && levelRank[flow.level] < levelRank[floor]) ||
      (goals != null && !flow.goals.some(goal => goals.includes(goal)));
    const labels: string[] = [];
    const gear = place ? equipmentLabel(flow.equipment, place) : null;
    if (gear) labels.push(gear);
    if (!pick && floor && distance > 0) {
      labels.push(distance === 1 ? `${flow.level} · next level` : `${flow.level} · two levels up`);
    }
    const overTime = minutes != null && flow.minutes > minutes;
    if (overTime) labels.push(`${flow.minutes} min`);
    const gapAt = firstHit(flow.areas, gaps);
    const priorityAt = firstHit(flow.areas, priorities);
    const reason =
      gapAt < noHit
        ? `Covers ${areaPhrase(gaps[gapAt])}, which is behind`
        : priorityAt < noHit
          ? `Covers ${areaPhrase(priorities[priorityAt])}, a priority`
          : undefined;
    // Own level, then higher levels, then anything below their level that a lower floor let back in.
    const levelPenalty = !rankLevel || pick ? 0 : distance >= 0 ? distance : 10 - distance;
    return {
      flow,
      index,
      hidden,
      labels,
      reason,
      levelPenalty,
      equipmentPenalty: gear ? 1 : 0,
      timePenalty: overTime ? 1 : 0,
      gapAt,
      priorityAt,
    };
  });

  return ranked
    .filter(item => !item.hidden)
    .sort(
      (a, b) =>
        a.levelPenalty - b.levelPenalty ||
        a.equipmentPenalty - b.equipmentPenalty ||
        a.timePenalty - b.timePenalty ||
        a.gapAt - b.gapAt ||
        a.priorityAt - b.priorityAt ||
        a.index - b.index,
    )
    .map(item => ({ ...item.flow, labels: item.labels, ...(item.reason ? { reason: item.reason } : {}) }));
}
