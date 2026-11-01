import type { HabitFlow } from './mobile';
import { nutritionCollectionIds } from './nutrition-ideas';
import { curatedFitnessIds } from './fitness-guides';
import { morningDrinksFlowId } from './morning-drinks';
import { codingCollectionIds, legacyCodingCourseIds } from './coding-flows';
export const focusOptions = [
  {
    id: 'sleep',
    title: 'Better sleep',
    description: 'Make space to wind down.',
    flowIds: ['wellbeing-sleep-start'],
  },
  {
    id: 'morning-drinks',
    title: 'Morning drinks',
    description: 'Eight optional ways to start your day.',
    flowIds: [morningDrinksFlowId],
  },
  {
    id: 'workout',
    title: 'Workout',
    description: 'Cindy, animal movements and practical gym techniques.',
    flowIds: curatedFitnessIds.workout,
  },
  {
    id: 'running',
    title: 'Running',
    description: 'Explore five running styles.',
    flowIds: curatedFitnessIds.running,
  },
  {
    id: 'hyrox',
    title: 'HYROX',
    description: 'Full format and half-volume training.',
    flowIds: curatedFitnessIds.hyrox,
  },
  {
    id: 'supplements',
    title: 'Supplements',
    description: 'Learn what may fit your training, and when none is needed.',
    flowIds: curatedFitnessIds.supplements,
  },
  {
    id: 'coding',
    title: 'Coding',
    description: 'Set up your space, compare a purchase, and read the source.',
    flowIds: codingCollectionIds,
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    description: 'Food and drink ideas before, during and after training, plus everyday choices.',
    flowIds: nutritionCollectionIds,
  },
] as const;
export type FocusId = string;
export const focusIds = focusOptions.map(option => option.id) as [FocusId, ...FocusId[]];
export function flowsForFocus(
  library: HabitFlow[],
  id: string,
  options: readonly { id: string; flowIds: readonly string[] }[] = focusOptions,
) {
  const focus = options.find(option => option.id === id);
  if (!focus) return [];
  // Built-in Fitness shelves are deliberately curated, even with older CMS focus settings.
  // Migrate the previous course-only CMS seed without overriding an editor's custom list.
  const legacyCoding =
    id === 'coding' &&
    focus.flowIds.length === legacyCodingCourseIds.length &&
    legacyCodingCourseIds.every(course => focus.flowIds.includes(course));
  const ids =
    id === 'nutrition' && library.some(flow => nutritionCollectionIds.includes(flow.id))
      ? nutritionCollectionIds
      : (curatedFitnessIds[id] ?? (legacyCoding ? codingCollectionIds : focus.flowIds));
  return ids.flatMap(flowId => library.filter(flow => flow.id === flowId));
}
