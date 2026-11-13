import { habitItemLines } from './items-habit';
import { drinkItemLines } from './items-drink';
import { globalFoodItemLines } from './items-food-global';
import { indiaFoodItemLines } from './items-food-india';
import { supplementItemLines } from './items-supplement';
import { parseItemLines, parseRoutineLines } from './parse';
import { afternoonRoutineLines } from './routines-afternoon';
import { bedRoutineLines } from './routines-bed';
import { dinnerRoutineLines } from './routines-dinner';
import { lunchRoutineLines } from './routines-lunch';
import { midMorningRoutineLines } from './routines-mid-morning';
import { morningRoutineLines } from './routines-morning';
import { postWorkoutRoutineLines } from './routines-post-workout';
import { preWorkoutRoutineLines } from './routines-pre-workout';
import { requiredRoutineLines } from './routines-required';
import { wakeRoutineLines } from './routines-wake';
import type { Routine, RoutineItem, RoutineType } from '../routines';

const itemSources: [string, RoutineType][] = [
  [drinkItemLines, 'Drink'],
  [indiaFoodItemLines, 'Food'],
  [globalFoodItemLines, 'Food'],
  [supplementItemLines, 'Supplement'],
  [habitItemLines, 'Habit'],
];

const routineSources = [
  requiredRoutineLines,
  wakeRoutineLines,
  morningRoutineLines,
  midMorningRoutineLines,
  lunchRoutineLines,
  afternoonRoutineLines,
  preWorkoutRoutineLines,
  postWorkoutRoutineLines,
  dinnerRoutineLines,
  bedRoutineLines,
];

let cached: { items: RoutineItem[]; routines: Routine[] } | undefined;

/** The catalog the API serves when no database is configured, and the seed source. */
export function routineCatalog() {
  if (cached) return cached;
  const items = itemSources.flatMap(([source, type]) => parseItemLines(source, type));
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new Error(`Duplicate routine item id ${item.id}.`);
    seen.add(item.id);
  }
  const byId = new Map(items.map(item => [item.id, item]));
  let rank = 1;
  const routines = routineSources.flatMap(source => {
    const parsed = parseRoutineLines(source, rank);
    rank += parsed.length;
    return parsed;
  });
  for (const routine of routines) {
    for (const part of routine.parts) {
      if (!byId.has(part.itemId)) throw new Error(`Routine "${routine.title}" is missing item ${part.itemId}.`);
    }
  }
  cached = { items, routines };
  return cached;
}
