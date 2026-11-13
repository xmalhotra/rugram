import type { FitnessMedia } from './fitness-guides';

/**
 * Which flow cards may play as a sequence of frames. Frames earn their place only when each
 * one shows a different moment of a movement or a step in a procedure. Food, drinks, products,
 * playlists and desk setups are one thing seen once, so they show a single picture.
 *
 * Every media family must be classified here: a new atlas will not compile until someone
 * decides, which is the harness that keeps unjustified frames out.
 */
export type CardMotion = 'sequence' | 'still';
export const atlasMotion: Record<FitnessMedia['atlas'], { motion: CardMotion; why: string }> = {
  cindy: { motion: 'sequence', why: 'Pull-up, push-up and squat phases' },
  running: { motion: 'sequence', why: 'Running gait and drills' },
  hyrox: { motion: 'sequence', why: 'Station movement phases' },
  'flow-animal': { motion: 'sequence', why: 'Crawl and travel phases' },
  'flow-animal-extra': { motion: 'sequence', why: 'Crawl and travel phases' },
  'flow-gym-focus': { motion: 'sequence', why: 'Lift setup and execution cues' },
  'flow-gym-support': { motion: 'sequence', why: 'Bench and grip setup cues' },
  'flow-fitness': { motion: 'sequence', why: 'Ordered preparation steps' },
  'flow-daily': { motion: 'sequence', why: 'Ordered routine steps' },
  'flow-sleep': { motion: 'sequence', why: 'Ordered wind-down steps' },
  'coding-habits': { motion: 'sequence', why: 'Ordered working-habit steps' },
  'nutrition-carbs': { motion: 'still', why: 'A food is shown once' },
  'nutrition-protein': { motion: 'still', why: 'A food is shown once' },
  'nutrition-drinks': { motion: 'still', why: 'A drink is shown once' },
  'flow-meals': { motion: 'still', why: 'A meal is shown once' },
  'flow-supports': { motion: 'still', why: 'A piece of equipment is shown once' },
  supplements: { motion: 'still', why: 'A product is shown once' },
  morning: { motion: 'still', why: 'A drink is shown once' },
  'coding-audio': { motion: 'still', why: 'A playlist has nothing to step through' },
  'coding-setups': { motion: 'still', why: 'A desk setup is shown once' },
};

export function cardMotion(media: Pick<FitnessMedia, 'atlas'> | undefined): CardMotion {
  return media ? atlasMotion[media.atlas].motion : 'sequence';
}
