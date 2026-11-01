/* Metro requires literal asset paths. These replace atlas rows whose frames did not match the card. */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { Demonstrator } from '../../shared/movement-viewer';
import { animalPoseFrames } from './animal-pose-frames';
import { gymPoseFrames } from './gym-pose-frames';

const frame = (gender: 'male' | 'female', name: string, index: number) => {
  const file = `../assets/fitness/pose/${gender}/${name}-${index}.jpg`;
  if (gender === 'male' && name === 'duck' && index === 1) return require('../assets/fitness/pose/male/duck-1.jpg');
  if (gender === 'male' && name === 'duck' && index === 2) return require('../assets/fitness/pose/male/duck-2.jpg');
  if (gender === 'male' && name === 'duck' && index === 3) return require('../assets/fitness/pose/male/duck-3.jpg');
  if (gender === 'male' && name === 'duck' && index === 4) return require('../assets/fitness/pose/male/duck-4.jpg');
  if (gender === 'male' && name === 'duck' && index === 5) return require('../assets/fitness/pose/male/duck-5.jpg');
  if (gender === 'male' && name === 'duck' && index === 6) return require('../assets/fitness/pose/male/duck-6.jpg');
  if (gender === 'male' && name === 'duck' && index === 7) return require('../assets/fitness/pose/male/duck-7.jpg');
  if (gender === 'female' && name === 'duck' && index === 1) return require('../assets/fitness/pose/female/duck-1.jpg');
  if (gender === 'female' && name === 'duck' && index === 2) return require('../assets/fitness/pose/female/duck-2.jpg');
  if (gender === 'female' && name === 'duck' && index === 3) return require('../assets/fitness/pose/female/duck-3.jpg');
  if (gender === 'female' && name === 'duck' && index === 4) return require('../assets/fitness/pose/female/duck-4.jpg');
  if (gender === 'female' && name === 'duck' && index === 5) return require('../assets/fitness/pose/female/duck-5.jpg');
  if (gender === 'female' && name === 'duck' && index === 6) return require('../assets/fitness/pose/female/duck-6.jpg');
  if (gender === 'female' && name === 'duck' && index === 7) return require('../assets/fitness/pose/female/duck-7.jpg');
  if (name === 'run-walk' && index === 1) return require('../assets/fitness/pose/male/run-walk-1.jpg');
  if (name === 'run-walk' && index === 2) return require('../assets/fitness/pose/male/run-walk-2.jpg');
  if (name === 'run-walk' && index === 3) return require('../assets/fitness/pose/male/run-walk-3.jpg');
  if (name === 'run-walk' && index === 4) return require('../assets/fitness/pose/male/run-walk-4.jpg');
  if (name === 'run-walk' && index === 5) return require('../assets/fitness/pose/male/run-walk-5.jpg');
  if (name === 'run-walk' && index === 6) return require('../assets/fitness/pose/male/run-walk-6.jpg');
  if (name === 'run-walk' && index === 7) return require('../assets/fitness/pose/male/run-walk-7.jpg');
  if (name === 'hills' && index === 1) return require('../assets/fitness/pose/male/hills-1.jpg');
  if (name === 'hills' && index === 2) return require('../assets/fitness/pose/male/hills-2.jpg');
  if (name === 'hills' && index === 3) return require('../assets/fitness/pose/male/hills-3.jpg');
  if (name === 'hills' && index === 4) return require('../assets/fitness/pose/male/hills-4.jpg');
  if (name === 'hills' && index === 5) return require('../assets/fitness/pose/male/hills-5.jpg');
  if (name === 'hills' && index === 6) return require('../assets/fitness/pose/male/hills-6.jpg');
  if (name === 'hills' && index === 7) return require('../assets/fitness/pose/male/hills-7.jpg');
  if (name === 'tempo' && index === 1) return require('../assets/fitness/pose/male/tempo-1.jpg');
  if (name === 'tempo' && index === 2) return require('../assets/fitness/pose/male/tempo-2.jpg');
  if (name === 'tempo' && index === 3) return require('../assets/fitness/pose/male/tempo-3.jpg');
  if (name === 'tempo' && index === 4) return require('../assets/fitness/pose/male/tempo-4.jpg');
  if (name === 'tempo' && index === 5) return require('../assets/fitness/pose/male/tempo-5.jpg');
  if (name === 'tempo' && index === 6) return require('../assets/fitness/pose/male/tempo-6.jpg');
  if (name === 'tempo' && index === 7) return require('../assets/fitness/pose/male/tempo-7.jpg');
  if (name === 'intervals' && index === 1) return require('../assets/fitness/pose/male/intervals-1.jpg');
  if (name === 'intervals' && index === 2) return require('../assets/fitness/pose/male/intervals-2.jpg');
  if (name === 'intervals' && index === 3) return require('../assets/fitness/pose/male/intervals-3.jpg');
  if (name === 'intervals' && index === 4) return require('../assets/fitness/pose/male/intervals-4.jpg');
  if (name === 'intervals' && index === 5) return require('../assets/fitness/pose/male/intervals-5.jpg');
  if (name === 'intervals' && index === 6) return require('../assets/fitness/pose/male/intervals-6.jpg');
  if (name === 'intervals' && index === 7) return require('../assets/fitness/pose/male/intervals-7.jpg');
  if (name === 'rope' && index === 1) return require('../assets/fitness/pose/male/rope-1.jpg');
  if (name === 'rope' && index === 2) return require('../assets/fitness/pose/male/rope-2.jpg');
  if (name === 'rope' && index === 3) return require('../assets/fitness/pose/male/rope-3.jpg');
  if (name === 'rope' && index === 4) return require('../assets/fitness/pose/male/rope-4.jpg');
  if (name === 'rope' && index === 5) return require('../assets/fitness/pose/male/rope-5.jpg');
  if (name === 'rope' && index === 6) return require('../assets/fitness/pose/male/rope-6.jpg');
  if (name === 'rope' && index === 7) return require('../assets/fitness/pose/male/rope-7.jpg');
  throw new Error(`Missing pose frame ${file}`);
};

const line = (gender: 'male' | 'female', name: string) =>
  [1, 2, 3, 4, 5, 6, 7].map(index => frame(gender, name, index));

const rows: Record<string, Partial<Record<Demonstrator, ReturnType<typeof line>>>> = {
  'workout-animal-duck': { male: line('male', 'duck'), female: line('female', 'duck') },
  'running-style-run-walk': { male: line('male', 'run-walk') },
  'running-style-hills': { male: line('male', 'hills') },
  'running-style-tempo': { male: line('male', 'tempo') },
  'running-style-intervals': { male: line('male', 'intervals') },
  'jump-rope': { male: line('male', 'rope') },
};

export function poseFrameRow(id: string, gender: Demonstrator) {
  return rows[id]?.[gender] ?? animalPoseFrames[id]?.[gender] ?? gymPoseFrames[id]?.[gender] ?? null;
}

export function poseFrame(id: string, gender: Demonstrator, index: number) {
  const frames = poseFrameRow(id, gender);
  return frames ? frames[Math.max(0, Math.min(frames.length - 1, index))] : null;
}
