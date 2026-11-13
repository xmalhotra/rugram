import { gymTechniquesFlowId } from './gym-techniques';
import { fitnessCollectionChildren, hyroxFlows, runningStylesFlowId } from './fitness-guides';
import type { PersonalFlow } from './personal-flows';

/** The cards a phone keeps ready before anyone opens them. */
export const featuredCardLimit = 50;

const featuredParents = [
  'workout-cindy',
  runningStylesFlowId,
  'workout-animal-movements',
  gymTechniquesFlowId,
  ...hyroxFlows.map(flow => flow.id),
];

export function featuredCardIds() {
  const ordered = [
    ...featuredParents.flatMap(id => fitnessCollectionChildren[id] ?? []),
    ...Object.values(fitnessCollectionChildren).flat(),
  ];
  return [...new Set(ordered)].slice(0, featuredCardLimit);
}

/** Top cards stay downloaded. A card someone adds to Home or a personal flow stays too. */
export function cardsToKeep(profile: {
  flowIds: string[];
  personalFlows?: Pick<PersonalFlow, 'cards'>[];
}) {
  const ids = new Set(featuredCardIds());
  for (const flowId of profile.flowIds) {
    ids.add(flowId);
    for (const child of fitnessCollectionChildren[flowId] ?? []) ids.add(child);
  }
  for (const flow of profile.personalFlows ?? []) {
    for (const card of flow.cards) ids.add(card.cardId);
  }
  return [...ids];
}
