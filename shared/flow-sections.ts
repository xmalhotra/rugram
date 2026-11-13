import type { FocusContent, NutritionPath } from './admin-content';
import type { HabitFlow } from './mobile';
import { flowsForFocus } from './focus';
import { nutritionCategories, nutritionOptions } from './nutrition';
import { nutritionCollections, nutritionCollectionSpecs } from './nutrition-ideas';

export type FlowSection = {
  id: string;
  title: string;
  focusId: string;
  groups: { id: string; title?: string; flows: HabitFlow[] }[];
};

export function defaultNutritionPaths(library: HabitFlow[]): NutritionPath[] {
  if (nutritionCollections.some(flow => library.some(item => item.id === flow.id)))
    return nutritionCollectionSpecs.map(collection => ({
      id: collection.category,
      title: collection.title,
      description: collection.description,
      options: [
        {
          id: 'ideas',
          title: 'Food & drink ideas',
          description: collection.description,
          flowIds: [collection.id],
        },
      ],
    }));
  return nutritionCategories.map(category => ({
    ...category,
    options: nutritionOptions(category.id).map(option => ({
      ...option,
      flowIds: [
        `nutrition-${category.id}-${option.id}`,
        ...(category.id === 'protein'
          ? library.filter(flow => flow.recipe?.preference === option.id).map(flow => flow.id)
          : []),
      ],
    })),
  }));
}

/** One continuous page and one scroll-spy rail for every category. Preferences
 * are labelled content groups, never another navigation rail or a hidden filter. */
export function buildFlowSections(
  topics: readonly FocusContent[],
  options: readonly FocusContent[],
  library: HabitFlow[],
  nutritionPaths?: NutritionPath[],
): FlowSection[] {
  const available = new Map(library.map(flow => [flow.id, flow]));
  const seen = new Set<string>();
  const take = (ids: readonly string[]) =>
    ids.flatMap(id => {
      const flow = available.get(id);
      if (!flow || seen.has(id)) return [];
      seen.add(id);
      return [flow];
    });
  const result: FlowSection[] = [];
  for (const topic of topics) {
    if (topic.id === 'nutrition') {
      const collections = nutritionCollections.filter(flow => available.has(flow.id));
      if (collections.length) {
        for (const collection of collections) {
          const spec = nutritionCollectionSpecs.find(item => item.id === collection.id)!;
          const title =
            nutritionPaths?.find(path => path.id === spec.category)?.title ?? collection.title;
          result.push({
            id: `nutrition:${spec.category}`,
            title,
            focusId: 'nutrition',
            groups: [{ id: collection.id, flows: take([collection.id]) }],
          });
        }
        continue;
      }
      const paths = nutritionPaths ?? defaultNutritionPaths(library);
      const focusFlows = flowsForFocus(library, topic.id, options);
      for (const path of paths) {
        const groups = path.options
          .map(option => ({
            id: `${topic.id}:${path.id}:${option.id}`,
            title: option.title,
            flows: take([
              ...option.flowIds,
              // Existing introductory food guides belong beside their matching recipes.
              ...focusFlows
                .filter(flow => flow.id === `nutrition-${path.id}-${option.id}`)
                .map(flow => flow.id),
            ]),
          }))
          .filter(group => group.flows.length);
        if (groups.length)
          result.push({
            id: `${topic.id}:${path.id}`,
            title: path.title,
            focusId: topic.id,
            groups,
          });
      }
      const remaining = take(focusFlows.map(flow => flow.id));
      if (remaining.length)
        result.push({
          id: `${topic.id}:guides`,
          title: 'Nutrition guides',
          focusId: topic.id,
          groups: [{ id: 'nutrition:guides:flows', flows: remaining }],
        });
    } else {
      const flows = take(flowsForFocus(library, topic.id, options).map(flow => flow.id));
      if (flows.length)
        result.push({
          id: topic.id,
          title: topic.title,
          focusId: topic.id,
          groups: [{ id: topic.id, flows }],
        });
    }
  }
  return result;
}
