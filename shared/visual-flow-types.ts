import type { FitnessMedia } from './fitness-guides';

/** Runtime card presentation, separate from stored completion IDs and flow ownership. */
export type VisualFlowCard = {
  media: FitnessMedia;
  frames: [string, string, string, string, string];
  benefits: { title: string; description: string }[];
  sourceFlowId: string;
  sourceStepIds: string[];
  illustration: 'habit' | 'movement' | 'planning';
};
