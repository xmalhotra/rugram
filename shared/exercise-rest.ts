import { gymExercises, type GymExercise } from './exercises';
import { isMobilityExercise } from './joint-map';
import { exerciseMuscles } from './muscle-map';

export type RestClass = 'heavy-compound' | 'compound' | 'isolation' | 'core' | 'conditioning' | 'mobility';

/**
 * Seconds of rest for one class.
 * Singer, Schoenfeld et al. 2024 (Frontiers in Sports and Active Living): rests past 60 s
 * help size a little, and nothing further shows up past about 90 s. Heavy compounds keep
 * a longer rest so the load stays up. The numbers are the middle of the ranges in
 * docs/gym-catalogue.md (conditioning and mobility are the short rests named there).
 */
export const restClassSeconds: Record<RestClass, number> = {
  'heavy-compound': 150,
  compound: 120,
  isolation: 75,
  core: 50,
  conditioning: 30,
  mobility: 20,
};

const conditioningEquipment = new Set(['sled', 'erg', 'treadmill', 'cardio', 'bike', 'jump-rope', 'battle-rope', 'medicine-ball']);
const conditioningStations = new Set(['sled', 'rower', 'treadmill', 'running', 'bike', 'jump-rope', 'battle-ropes', 'bw-plyo', 'med-ball']);
/** Repeated strongman events and dumbbell complexes. Carries are core, not these. */
const conditioningIds = new Set(['devil-press', 'man-maker', 'tire-flip', 'sledgehammer-swing']);

const heavyEquipment = new Set(['barbell', 'smith', 'trap-bar']);

const singleJoint = new Set([
  'calves',
  'shins',
  'forearms',
  'biceps',
  'triceps',
  'side-delts',
  'front-delts',
  'rear-delts',
  'abductors',
  'adductors',
  'neck',
  'hip-flexors',
]);

function isConditioning(item: GymExercise) {
  if (conditioningEquipment.has(item.equipment) || conditioningStations.has(item.station)) return true;
  if (conditioningIds.has(item.id)) return true;
  return /jump|sprint|burpee|plyo/i.test(`${item.id} ${item.name}`);
}

function isCore(item: GymExercise) {
  if (/carry|farmer|yoke-walk|suitcase|plate-walk/.test(item.id)) return true;
  if (item.muscles[0] === 'core') return true;
  if (item.station === 'bw-core' || item.station === 'ab-machine') return true;
  if (/plank|crunch|sit-up|dead-bug|bird-dog|rollout|pallof|woodchop|russian-twist|superman|arch-hold/.test(item.id)) return true;
  const main = exerciseMuscles[item.id]?.main ?? [];
  const abs = new Set(['upper-abs', 'lower-abs', 'obliques']);
  return main.length > 0 && main.every(area => abs.has(area));
}

/** Curls, raises, flyes, and the other single-joint names. Posterior-chain hinges are left out. */
function isIsolationName(id: string) {
  if (/back-extension|hyperextension|glute-ham|leg-raise|knee-raise|toes-to-bar|knees-to-elbows/.test(id)) return false;
  return /curl|extension|raise|(?:^|-)fly(?:-|$)|kickback|shrug|pullover|pushdown|wrist|pinch|roller|neck-curl|neck-extension|calf|tibialis|soleus|abduction|adduction|clamshell|pull-apart|face-pull|external-rotation|internal-rotation|scaption|skull|crossover|pec-deck|nordic|sissy|donkey-kick|fire-hydrant|dead-hang|active-hang|towel-hang|cuban|svend|pronation|rotation|tate-press/.test(
    id,
  );
}

function isHeavy(item: GymExercise) {
  if (item.station === 'olympic') return true;
  if (item.id === 'weighted-pull-up' || item.id === 'weighted-dip') return true;
  if (!heavyEquipment.has(item.equipment)) return false;
  // Lunges, split squats, and step-ups stay ordinary compounds, even on a bar.
  if (/lunge|split-squat|step-up/.test(item.id)) return false;
  if (/upright-row|rear-delt/.test(item.id)) return false;
  if (isIsolationName(item.id)) return false;
  return /squat|deadlift|rdl|romanian|good-morning|rack-pull|hip-thrust|glute-bridge|bench|floor-press|press|row/.test(item.id);
}

function isCompoundName(id: string) {
  return /squat|deadlift|rdl|romanian|good-morning|rack-pull|lunge|split-squat|step-up|step-down|press|push-up|pull-up|chin-up|dip|row|pulldown|thrust|bridge|get-up|muscle-up|handstand|planche|lever|swing|clean|snatch|jerk|climb|thruster|wall-sit|pistol|cossack|shrimp|support-hold|iron-cross|skin-the-cat|german-hang|frog-stand|crow-pose|v-taps|wall-walk|headstand/.test(
    id,
  );
}

function mainsAreSingleJoint(id: string) {
  const main = exerciseMuscles[id]?.main ?? [];
  return main.length > 0 && main.every(area => singleJoint.has(area));
}

/**
 * Mobility wins, then conditioning, then abs and carries, then the heavy barbell and Smith
 * lifts, then single-joint work. What is left is ordinary multi-joint work.
 */
export function classifyExercise(item: GymExercise): RestClass {
  if (isMobilityExercise(item.id)) return 'mobility';
  if (isConditioning(item)) return 'conditioning';
  if (isCore(item)) return 'core';
  if (isHeavy(item)) return 'heavy-compound';
  if (isIsolationName(item.id)) return 'isolation';
  if (isCompoundName(item.id)) return 'compound';
  const station = item.station;
  if (station === 'leg-extension' || station === 'leg-curl' || station === 'calf-raise' || station === 'pec-deck') return 'isolation';
  if (station === 'triceps-extension' && !item.id.includes('dip')) return 'isolation';
  if (mainsAreSingleJoint(item.id)) return 'isolation';
  return 'compound';
}

export const exerciseRestClass: Record<string, RestClass> = {};
for (const item of gymExercises) exerciseRestClass[item.id] = classifyExercise(item);

/** Class seconds, or a compound rest when the exercise is not in the catalogue. */
export function restFor(exerciseId: string) {
  const restClass = exerciseRestClass[exerciseId] ?? 'compound';
  return restClassSeconds[restClass];
}
