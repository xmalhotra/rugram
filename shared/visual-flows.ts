import type { HabitFlow } from './mobile';
import type { VisualFlowCard } from './visual-flow-types';
import { flowFrameSequences, type FlowSequenceId } from './flow-frame-sequences';
import { fitnessMedia, fitnessCollectionChildren, type FitnessMedia } from './fitness-guides';
import { movementRows } from './movement-viewer';
import { codingCards } from './coding-flows';
import { withGymTechniqueVisual } from './gym-techniques';
import {
  nutritionCollectionForId,
  nutritionCollectionChildren,
  withNutritionIdeaVisual,
} from './nutrition-ideas';
import { gymFlowById, gymHabitCards } from './gym-flows';

export type ResolvedVisualFlow = { flow: HabitFlow; cards: HabitFlow[]; adapted: boolean };
const customMedia = (
  media: FitnessMedia,
  title: string,
  frames: VisualFlowCard['frames'],
  benefit: string,
) => ({ media, title, frames, benefit });
type CardPlan = FlowSequenceId | ReturnType<typeof customMedia>;
const coding = (row: number): CardPlan => {
  const card = codingCards.filter(item => item.atlas === 'coding-habits')[row];
  return customMedia(
    { atlas: card.atlas, row: card.row },
    card.title.split(' · ').at(-1)!,
    [...card.frames],
    card.benefits[0].description,
  );
};
const labelPlan = customMedia(
  { atlas: 'supplements', row: 7 },
  'Read the actual label',
  [
    'Find the actual product information',
    'Look at the ingredient list',
    'Compare the stated serving information',
    'Check what is independently verified',
    'Keep the purchase optional',
  ],
  'Distinguish what the label establishes from claims that still need checking.',
);
const suitabilityPlan = customMedia(
  { atlas: 'supplements', row: 6 },
  'Review suitability',
  [
    'Write down your question',
    'Consider your own circumstances',
    'Review reliable information',
    'Ask a qualified professional when needed',
    'Decide without pressure to buy',
  ],
  'Keep questions about suitability separate from an automatic purchase.',
);

/** Explicit plans for old public/saved records. Content/ownership IDs never change. */
function plansForFlow(flow: HabitFlow): CardPlan[] {
  if (flow.id === 'wellbeing-sleep-start' || flow.id === 'sleep')
    return ['evening', 'phone', 'reading', 'sleepNote'];
  if (flow.recipe)
    return [
      flow.recipe.preference === 'plant'
        ? 'plant'
        : flow.recipe.preference === 'dairy'
          ? 'dairy'
          : 'eggs',
    ];
  if (flow.guideId === 'magnesium') return [labelPlan, suitabilityPlan, 'note'];
  if (flow.guideId === 'gym-supports') return ['belt', 'wraps', 'straps', 'sleeves'];
  if (flow.workout) {
    const exerciseIds = [...new Set(flow.workout.blocks.map(block => block.exerciseId))];
    const known: Record<string, FlowSequenceId> = {
      'dead-bug': 'deadBug',
      'bird-dog': 'birdDog',
      'knee-plank': 'kneePlank',
    };
    return exerciseIds.map(
      id =>
        known[id] ??
        customMedia(
          { atlas: 'flow-daily', row: 1 },
          `Prepare: ${id.replaceAll('-', ' ')}`,
          [...flowFrameSequences.plan.frames],
          'Plan an appropriate version before attempting an unfamiliar movement. This is a preparation illustration, not a demonstration of that exercise.',
        ),
    );
  }
  if (flow.id.startsWith('nutrition-protein-'))
    return [
      'plan',
      flow.id.endsWith('plant') ? 'plant' : flow.id.endsWith('dairy') ? 'dairy' : 'eggs',
      'note',
    ];
  if (flow.id.startsWith('nutrition-hydration-')) return ['plan', 'water', 'note'];
  if (flow.id.startsWith('nutrition-pre-')) return ['plan', 'snack', 'water', 'note'];
  if (flow.id.startsWith('nutrition-intra-')) return ['plan', 'water', 'note'];
  if (flow.id.startsWith('nutrition-post-')) return ['plan', 'meal', 'note'];
  const explicit: Record<string, CardPlan[]> = {
    'wellbeing-nutrition-start': ['plan', 'meal', 'note'],
    'fitness-workout-start': ['kit', 'plan', 'note'],
    'fitness-running-start': ['kit', 'walk', 'note'],
    'fitness-crossfit-start': ['coach', 'plan', 'note'],
    'workout-12-3-30': ['plan', 'treadmill', 'note'],
    'workout-norwegian-4x4': [
      'plan',
      customMedia(
        { atlas: 'running', row: 3 },
        'Work and recovery',
        [
          'Prepare for the planned effort',
          'Begin a controlled work period',
          'Continue within the plan',
          'Ease back for recovery',
          'Review before another effort',
        ],
        'Make the contrast between planned work and recovery visible, without prescribing intensity.',
      ),
      'note',
    ],
    'workout-annie': ['rope', 'sitUp', 'note'],
    'fitness-hyrox-base': ['plan', 'water', 'walk', 'note'],
    'fitness-lean-habits': ['meal', 'walk', 'note'],
    'fitness-strength-log': ['plan', 'note', 'kit'],
    'fitness-start-small': ['plan', 'walk', 'note'],
    'tech-web-first-page': [coding(0), coding(1), 'note'],
    'tech-ai-small-experiment': [coding(0), coding(2), 'note'],
    'tech-cloud-safe-lab': ['plan', coding(2), 'note'],
    'tech-security-first-lab': ['plan', coding(1), 'note'],
    morning: ['water', 'walk', 'plan'],
    running: ['kit', 'walk', 'note'],
  };
  // New/custom records cannot fall back to text-only pages. A clearly labelled
  // planning sequence is used until content-specific imagery is supplied.
  return explicit[flow.id] ?? ['plan', 'note'];
}

export function visualFlowCards(flow: HabitFlow): HabitFlow[] {
  return plansForFlow(flow).map((plan, index) => {
    const sequence = typeof plan === 'string' ? flowFrameSequences[plan] : plan;
    const media =
      typeof plan === 'string'
        ? { atlas: flowFrameSequences[plan].atlas, row: flowFrameSequences[plan].row }
        : plan.media;
    const sourceSteps = flow.steps[index] ? [flow.steps[index].id] : [];
    return {
      ...flow,
      id: `${flow.id}:visual:${index + 1}`,
      title: sequence.title,
      description: sequence.benefit,
      relatedFlowIds: undefined,
      workout: undefined,
      recipe: undefined,
      visualCard: {
        media,
        frames: [...sequence.frames],
        benefits: [{ title: 'What this helps with', description: sequence.benefit }],
        sourceFlowId: flow.id,
        sourceStepIds: sourceSteps,
        illustration:
          media.atlas === 'flow-fitness'
            ? 'movement'
            : media.atlas === 'flow-daily' && media.row === 1
              ? 'planning'
              : 'habit',
      },
      sessionGuide: {
        collection: flow.title,
        label: flow.goal,
        format: '5 visual frames',
        equipment: 'Use a suitable setting and what you already have',
        reviewedOn: '2026-10-24',
        cards: sequence.frames.map((frame, frameIndex) => ({
          id: `frame-${frameIndex + 1}`,
          title: frame,
          metric: `Frame ${frameIndex + 1} of 5`,
          body: frame,
          illustration: 'workout',
        })),
      },
    };
  });
}

/** The single entry point for every flow, including old saves and CMS records. */
export function resolveVisualFlow(flow: HabitFlow, library: HabitFlow[]): ResolvedVisualFlow {
  const gym = gymFlowById(flow.id);
  if (gym) {
    const cards = gymHabitCards(gym);
    return {
      flow: { ...flow, relatedFlowIds: cards.map(card => card.id) },
      cards,
      adapted: false,
    };
  }
  const nutritionCollection = nutritionCollectionForId(flow.id);
  if (nutritionCollection) {
    let ids = nutritionCollectionChildren[nutritionCollection.id];
    // Retain restrictions in previously saved protein paths without another browse category.
    if (['nutrition-protein-plant', 'recipe-chickpea-bowl'].includes(flow.id))
      ids = ids.filter(id => ['nutrition-item-dal', 'nutrition-item-tofu'].includes(id));
    if (['nutrition-protein-dairy', 'recipe-curd-chickpea-bowl'].includes(flow.id))
      ids = ids.filter(id => id !== 'nutrition-item-eggs');
    const cards = ids
      .flatMap(id => library.filter(item => item.id === id))
      .map(item => withNutritionIdeaVisual(item, flow.id));
    return {
      flow: {
        ...flow,
        title: nutritionCollection.title,
        description: nutritionCollection.description,
        relatedFlowIds: cards.map(card => card.id),
      },
      cards,
      adapted: false,
    };
  }
  if (fitnessMedia[flow.id] || movementRows[flow.id] !== undefined || flow.visualCard) {
    return {
      flow: { ...flow, relatedFlowIds: [flow.id] },
      cards: [withNutritionIdeaVisual(withGymTechniqueVisual(flow))],
      adapted: false,
    };
  }
  const knownIds =
    fitnessCollectionChildren[flow.id] ??
    (flow.id === 'workout-animal-movements' ? flow.relatedFlowIds : undefined);
  if (knownIds) {
    const cards = knownIds
      .flatMap(id =>
        library.filter(
          child =>
            child.id === id &&
            (fitnessMedia[id] || movementRows[id] !== undefined || child.visualCard),
        ),
      )
      .map(item => withNutritionIdeaVisual(withGymTechniqueVisual(item)));
    if (cards.length)
      return {
        flow: { ...flow, relatedFlowIds: cards.map(card => card.id) },
        cards,
        adapted: false,
      };
  }
  const cards = visualFlowCards(flow);
  return { flow: { ...flow, relatedFlowIds: cards.map(card => card.id) }, cards, adapted: true };
}
