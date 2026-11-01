/* Metro requires literal asset paths. Each pose is its own image so a card does not decode the whole sheet. */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { Demonstrator } from '../../shared/movement-viewer';

const frames = {
  male: [
    [
      require('../assets/fitness/cindy/male/pull-1.jpg'),
      require('../assets/fitness/cindy/male/pull-2.jpg'),
      require('../assets/fitness/cindy/male/pull-3.jpg'),
      require('../assets/fitness/cindy/male/pull-4.jpg'),
      require('../assets/fitness/cindy/male/pull-5.jpg'),
      require('../assets/fitness/cindy/male/pull-6.jpg'),
      require('../assets/fitness/cindy/male/pull-7.jpg'),
    ],
    [
      require('../assets/fitness/cindy/male/push-1.jpg'),
      require('../assets/fitness/cindy/male/push-2.jpg'),
      require('../assets/fitness/cindy/male/push-3.jpg'),
      require('../assets/fitness/cindy/male/push-4.jpg'),
      require('../assets/fitness/cindy/male/push-5.jpg'),
      require('../assets/fitness/cindy/male/push-6.jpg'),
      require('../assets/fitness/cindy/male/push-7.jpg'),
    ],
    [
      require('../assets/fitness/cindy/male/squat-1.jpg'),
      require('../assets/fitness/cindy/male/squat-2.jpg'),
      require('../assets/fitness/cindy/male/squat-3.jpg'),
      require('../assets/fitness/cindy/male/squat-4.jpg'),
      require('../assets/fitness/cindy/male/squat-5.jpg'),
      require('../assets/fitness/cindy/male/squat-6.jpg'),
      require('../assets/fitness/cindy/male/squat-7.jpg'),
    ],
  ],
  female: [
    [
      require('../assets/fitness/cindy/female/pull-1.jpg'),
      require('../assets/fitness/cindy/female/pull-2.jpg'),
      require('../assets/fitness/cindy/female/pull-3.jpg'),
      require('../assets/fitness/cindy/female/pull-4.jpg'),
      require('../assets/fitness/cindy/female/pull-5.jpg'),
      require('../assets/fitness/cindy/female/pull-6.jpg'),
      require('../assets/fitness/cindy/female/pull-7.jpg'),
    ],
    [
      require('../assets/fitness/cindy/female/push-1.jpg'),
      require('../assets/fitness/cindy/female/push-2.jpg'),
      require('../assets/fitness/cindy/female/push-3.jpg'),
      require('../assets/fitness/cindy/female/push-4.jpg'),
      require('../assets/fitness/cindy/female/push-5.jpg'),
      require('../assets/fitness/cindy/female/push-6.jpg'),
      require('../assets/fitness/cindy/female/push-7.jpg'),
    ],
    [
      require('../assets/fitness/cindy/female/squat-1.jpg'),
      require('../assets/fitness/cindy/female/squat-2.jpg'),
      require('../assets/fitness/cindy/female/squat-3.jpg'),
      require('../assets/fitness/cindy/female/squat-4.jpg'),
      require('../assets/fitness/cindy/female/squat-5.jpg'),
      require('../assets/fitness/cindy/female/squat-6.jpg'),
      require('../assets/fitness/cindy/female/squat-7.jpg'),
    ],
  ],
} as const;

export function cindyFrame(gender: Demonstrator, row: number, frame: number) {
  const line = frames[gender][Math.max(0, Math.min(frames[gender].length - 1, row))];
  return line[Math.max(0, Math.min(line.length - 1, frame))];
}

export function cindyFrameRow(gender: Demonstrator, row: number) {
  return frames[gender][Math.max(0, Math.min(frames[gender].length - 1, row))];
}
