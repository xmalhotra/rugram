/**
 * Other exercises that can stand in for one the member's gym doesn't have.
 * Same first main muscle. A different piece of equipment ranks higher, because the point is to avoid the one they lack.
 *
 * Joint agreement is added to the score. When both exercises are tagged in `exerciseJoints`, that is the
 * Jaccard overlap of those joints. Otherwise each exercise gets a movement pattern, and the score adds 1
 * when the patterns match. The pattern comes from the rest class, then the first main area:
 * - mobility, core, conditioning, or isolation rest → that class
 * - quads, adductors, abductors, hip-flexors → squat
 * - hamstrings, glutes, lower-back → hinge
 * - calves, shins → calf
 * - chest, upper-chest → horizontal-push
 * - front-delts, side-delts, traps → vertical-push
 * - lats → vertical-pull
 * - mid-back, rear-delts → horizontal-pull
 * - biceps, triceps, forearms → arm
 * - abs, obliques → core
 * - anything else → other
 * Heavy and ordinary compounds are told apart by that area, not by the rest class.
 */
import { exercise, gymExercises, type GymExercise } from './exercises';
import { exerciseRestClass } from './exercise-rest';
import { equipmentForExercise, placeCanDo, type TrainPlace } from './flow-defaults';
import { howToLoopIds } from './how-to-loops';
import { jointsMoved } from './joint-map';
import { exerciseMuscles, muscleAreas, type MuscleArea } from './muscle-map';

export type ExerciseAlternative = { exerciseId: string; reason: string };

export type AlternativeOptions = {
  equipment?: string[];
  limit?: number;
  /** Main areas of the superset partner. A candidate whose main areas overlap these is left out. */
  avoidMainAreas?: MuscleArea[];
  /** Where the member trains. Exercises they cannot do there are listed after the ones they can. */
  place?: TrainPlace;
};

const sameEquipmentPenalty = 5;

function jaccard(left: readonly string[], right: readonly string[]) {
  const a = new Set(left);
  const b = new Set(right);
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const value of a) if (b.has(value)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

function areaName(area: MuscleArea) {
  return (muscleAreas.find(item => item.id === area)?.title ?? area).toLowerCase();
}

function gearName(equipment: string) {
  return equipment.replace(/-/g, ' ');
}

function article(phrase: string) {
  return /^[aeiou]/i.test(phrase) ? 'an' : 'a';
}

/** Movement pattern used when an exercise is not tagged with joints. See the file comment. */
function movementPattern(exerciseId: string) {
  const rest = exerciseRestClass[exerciseId] ?? 'compound';
  if (rest === 'mobility' || rest === 'core' || rest === 'conditioning' || rest === 'isolation') return rest;
  const area = exerciseMuscles[exerciseId]?.main[0];
  if (area === 'quads' || area === 'adductors' || area === 'abductors' || area === 'hip-flexors') return 'squat';
  if (area === 'hamstrings' || area === 'glutes' || area === 'lower-back') return 'hinge';
  if (area === 'calves' || area === 'shins') return 'calf';
  if (area === 'chest' || area === 'upper-chest') return 'horizontal-push';
  if (area === 'front-delts' || area === 'side-delts' || area === 'traps') return 'vertical-push';
  if (area === 'lats') return 'vertical-pull';
  if (area === 'mid-back' || area === 'rear-delts') return 'horizontal-pull';
  if (area === 'biceps' || area === 'triceps' || area === 'forearms') return 'arm';
  if (area === 'upper-abs' || area === 'lower-abs' || area === 'obliques') return 'core';
  return 'other';
}

function jointAgreement(leftId: string, rightId: string) {
  const left = jointsMoved(leftId);
  const right = jointsMoved(rightId);
  if (left.length && right.length) return jaccard(left, right);
  return movementPattern(leftId) === movementPattern(rightId) ? 1 : 0;
}

function fitsPlace(exerciseId: string, place: TrainPlace | undefined) {
  if (!place) return true;
  return placeCanDo(equipmentForExercise(exerciseId), place);
}

const homeKit: Record<string, string> = { dumbbell: 'dumbbells', kettlebell: 'a kettlebell', band: 'a band' };

function placeClause(candidateId: string, place: TrainPlace | undefined) {
  if (!place || place === 'gym') return null;
  const need = equipmentForExercise(candidateId);
  // Name the kit the exercise really uses: a kettlebell or a band is not "dumbbells".
  const kit = homeKit[exercise(candidateId)?.equipment ?? ''] ?? 'dumbbells';
  if (!placeCanDo(need, place)) return need === 'gym' ? 'needs a gym' : `needs ${kit}`;
  if (need === 'dumbbells') return `works at home with ${kit}`;
  if (need === 'bodyweight') return 'works at home with bodyweight';
  return null;
}

function reasonFor(original: GymExercise, candidate: GymExercise, muscle: MuscleArea, place: TrainPlace | undefined) {
  const muscleText = `Same muscles (${areaName(muscle)})`;
  const where = placeClause(candidate.id, place);
  if (where) return `${muscleText}, ${where}`;
  const next = gearName(candidate.equipment);
  if (candidate.equipment === original.equipment) return `${muscleText}, also uses ${article(next)} ${next}`;
  const previous = gearName(original.equipment);
  return `${muscleText}, uses ${article(next)} ${next} instead of ${article(previous)} ${previous}`;
}

function score(original: GymExercise, candidate: GymExercise) {
  const from = exerciseMuscles[original.id] ?? { main: [], helpers: [] };
  const to = exerciseMuscles[candidate.id] ?? { main: [], helpers: [] };
  let value = jaccard(from.main, to.main) + jaccard(from.helpers, to.helpers);
  const fromClass = exerciseRestClass[original.id] ?? 'compound';
  const toClass = exerciseRestClass[candidate.id] ?? 'compound';
  if (fromClass === toClass) value += 1;
  value += jointAgreement(original.id, candidate.id);
  if (howToLoopIds.has(candidate.id)) value += 1;
  if (candidate.equipment === original.equipment) value -= sameEquipmentPenalty;
  return value;
}

/** The score `alternativesFor` ranks with, so a harder variation uses the same order. */
export function alternativeScore(originalId: string, candidateId: string) {
  const original = exercise(originalId);
  const candidate = exercise(candidateId);
  if (!original || !candidate || originalId === candidateId) return null;
  return score(original, candidate);
}

/**
 * Ranked stand-ins for `exerciseId`.
 * Each one is a different exercise whose first main muscle matches.
 * Same equipment is left out when a different piece of equipment can do the job.
 * `options.equipment` keeps only those pieces. `options.limit` keeps the first few after ranking.
 * `options.avoidMainAreas` drops a candidate that shares a main area with the superset partner.
 * `options.place` lists exercises the member can do at that place before the ones they cannot.
 */
export function alternativesFor(exerciseId: string, options?: AlternativeOptions): ExerciseAlternative[] {
  const original = exercise(exerciseId);
  const muscle = exerciseMuscles[exerciseId]?.main[0];
  if (!original || !muscle) return [];
  const avoid = new Set(options?.avoidMainAreas ?? []);
  let pool = gymExercises.filter(item => {
    if (item.id === exerciseId) return false;
    const mains = exerciseMuscles[item.id]?.main ?? [];
    if (mains[0] !== muscle) return false;
    if (avoid.size && mains.some(area => avoid.has(area))) return false;
    if (options?.equipment && !options.equipment.includes(item.equipment)) return false;
    return true;
  });
  if (pool.some(item => item.equipment !== original.equipment)) {
    pool = pool.filter(item => item.equipment !== original.equipment);
  }
  const ranked = pool
    .map(item => ({ item, score: score(original, item), fits: fitsPlace(item.id, options?.place) }))
    .sort((a, b) => Number(b.fits) - Number(a.fits) || b.score - a.score || a.item.name.localeCompare(b.item.name));
  const limited = options?.limit != null ? ranked.slice(0, options.limit) : ranked;
  return limited.map(({ item }) => ({ exerciseId: item.id, reason: reasonFor(original, item, muscle, options?.place) }));
}

/** One line when a browse pick shares a main area with the superset partner. Null when it does not. */
export function supersetClash(exerciseId: string, avoidMainAreas: readonly MuscleArea[] | undefined) {
  if (!avoidMainAreas?.length) return null;
  const main = exerciseMuscles[exerciseId]?.main ?? [];
  const hit = avoidMainAreas.find(area => main.includes(area));
  if (!hit) return null;
  return `That works ${areaName(hit)}, which the other exercise already works.`;
}

/** Main areas of the other item that shares this one's superset label. */
export function supersetPartnerAreas(
  items: readonly { key: string; exerciseId: string; superset?: string }[],
  key: string,
  shownId?: (item: { key: string; exerciseId: string }) => string,
): MuscleArea[] {
  const own = items.find(item => item.key === key);
  const label = own?.superset?.trim();
  if (!own || !label) return [];
  const show = shownId ?? (item => item.exerciseId);
  const areas = new Set<MuscleArea>();
  for (const item of items) {
    if (item.key === key || item.superset?.trim() !== label) continue;
    for (const area of exerciseMuscles[show(item)]?.main ?? []) areas.add(area);
  }
  return [...areas];
}
