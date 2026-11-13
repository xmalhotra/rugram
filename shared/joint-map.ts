/**
 * Joints that mobility and stretching move. Muscle growth stays on the muscle map;
 * these tags are the only place a mobility set is counted.
 */

export const joints = [
  { id: 'neck', title: 'Neck' },
  { id: 'shoulders', title: 'Shoulders' },
  { id: 'wrists', title: 'Wrists' },
  { id: 'spine', title: 'Spine' },
  { id: 'hips', title: 'Hips' },
  { id: 'knees', title: 'Knees' },
  { id: 'ankles', title: 'Ankles' },
] as const;

export type Joint = (typeof joints)[number]['id'];

/**
 * Days per week with mobility work for one joint.
 * ACSM's Guidelines for Exercise Testing and Prescription, 10th edition (2018), flexibility exercise at least 2–3 days per week.
 */
export const jointTargets = { low: 2, high: 3 };

export const exerciseJoints: Record<string, Joint[]> = {
  'worlds-greatest-stretch': ['shoulders', 'spine', 'hips'],
  'downward-dog': ['shoulders', 'spine', 'ankles'],
  'cat-cow': ['spine'],
  'childs-pose': ['shoulders', 'spine', 'hips'],
  'cobra-stretch': ['spine'],
  'pigeon-stretch': ['hips'],
  '90-90-hip-stretch': ['hips'],
  'couch-stretch': ['hips', 'knees'],
  'hip-flexor-stretch': ['hips'],
  'hamstring-stretch': ['hips'],
  'quad-stretch': ['hips', 'knees'],
  'calf-stretch': ['ankles'],
  'butterfly-stretch': ['hips'],
  'doorway-chest-stretch': ['shoulders'],
  'cross-body-shoulder-stretch': ['shoulders'],
  'triceps-stretch': ['shoulders'],
  'thread-the-needle': ['shoulders', 'spine'],
  'thoracic-rotation': ['spine'],
  'neck-stretch': ['neck'],
  'wrist-stretch': ['wrists'],
  'deep-squat-hold': ['hips', 'knees', 'ankles'],
  'scapular-push-up': ['shoulders'],
  'shoulder-dislocate': ['shoulders'],
  'jefferson-curl': ['spine', 'hips'],
  'arm-circles': ['shoulders'],
  'leg-swings': ['hips'],
  'hip-circles': ['hips'],
  'ankle-circles': ['ankles'],
  '90-90-hip-switch': ['hips'],
  'adductor-stretch': ['hips'],
  'banded-ankle-mobilization': ['ankles'],
  'bodyweight-jefferson-curl': ['spine', 'hips'],
  'squat-to-stand': ['spine', 'hips', 'knees', 'ankles'],
  'dumbbell-jefferson-curl': ['spine', 'hips'],
  'frog-rock': ['hips'],
  'goblet-squat-hold': ['hips', 'knees', 'ankles'],
  'hip-flexor-rock': ['hips'],
  'heel-toe-walk': ['ankles'],
  'hip-hinge': ['hips'],
  'kettlebell-jefferson-curl': ['spine', 'hips'],
  'quadruped-thoracic-rotation': ['spine'],
  'chin-tuck': ['neck'],
  'pelvic-tilt': ['spine'],
  'shoulder-roll': ['shoulders'],
  'thoracic-extension': ['spine'],
  'wrist-extensor-stretch': ['wrists'],
  'wrist-flexor-stretch': ['wrists'],
  'spiderman-stretch': ['hips'],
  'wall-shoulder-opener': ['shoulders'],
  'foam-roller-extension': ['spine'],
  'walking-knee-hug': ['hips'],
  // Loaded circles around the head. The station is a kettlebell or dumbbell, and the work is shoulder range.
  'kettlebell-halo': ['shoulders'],
  'dumbbell-halo': ['shoulders'],
};

const mobilityIds = new Set(Object.keys(exerciseJoints));

/** True when the exercise is tagged in `exerciseJoints`. */
export function isMobilityExercise(id: string) {
  return mobilityIds.has(id);
}

export function jointsMoved(id: string): readonly Joint[] {
  if (!mobilityIds.has(id)) return [];
  return exerciseJoints[id] ?? [];
}

export type JointMarker = { joint: Joint; x: number; y: number };

/**
 * Centres in the 270×420 view of `body-map-paths.ts`. The front figure is centred on x = 72
 * and the back figure on x = 198 (the same outline shifted by 126). Neck, shoulders, wrists,
 * hips and knees are read off the front; the spine is three points down the back centre line;
 * ankles sit on both figures where the shin meets the foot.
 */
export const jointMarkers: { front: JointMarker[]; back: JointMarker[] } = {
  front: [
    { joint: 'neck', x: 72, y: 56 },
    { joint: 'shoulders', x: 45, y: 80 },
    { joint: 'shoulders', x: 99, y: 80 },
    { joint: 'wrists', x: 28, y: 204 },
    { joint: 'wrists', x: 116, y: 204 },
    { joint: 'hips', x: 52, y: 178 },
    { joint: 'hips', x: 92, y: 178 },
    { joint: 'knees', x: 55, y: 286 },
    { joint: 'knees', x: 89, y: 286 },
    { joint: 'ankles', x: 55, y: 388 },
    { joint: 'ankles', x: 89, y: 388 },
  ],
  back: [
    { joint: 'neck', x: 198, y: 56 },
    { joint: 'spine', x: 198, y: 100 },
    { joint: 'spine', x: 198, y: 136 },
    { joint: 'spine', x: 198, y: 170 },
    { joint: 'ankles', x: 181, y: 388 },
    { joint: 'ankles', x: 215, y: 388 },
  ],
};
