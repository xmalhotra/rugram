/* Metro requires literal asset paths. Seven-frame gym technique sequences. */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { Demonstrator } from '../../shared/movement-viewer';

export const gymPoseFrames: Record<string, Record<Demonstrator, number[]>> = {
  'gym-technique-neutral-grip': {
    male: [require('../assets/fitness/pose/male/grip-1.jpg'), require('../assets/fitness/pose/male/grip-2.jpg'), require('../assets/fitness/pose/male/grip-3.jpg'), require('../assets/fitness/pose/male/grip-4.jpg'), require('../assets/fitness/pose/male/grip-5.jpg'), require('../assets/fitness/pose/male/grip-6.jpg'), require('../assets/fitness/pose/male/grip-7.jpg')],
    female: [require('../assets/fitness/pose/female/grip-1.jpg'), require('../assets/fitness/pose/female/grip-2.jpg'), require('../assets/fitness/pose/female/grip-3.jpg'), require('../assets/fitness/pose/female/grip-4.jpg'), require('../assets/fitness/pose/female/grip-5.jpg'), require('../assets/fitness/pose/female/grip-6.jpg'), require('../assets/fitness/pose/female/grip-7.jpg')],
  },
  'gym-technique-back-support': {
    male: [require('../assets/fitness/pose/male/back-1.jpg'), require('../assets/fitness/pose/male/back-2.jpg'), require('../assets/fitness/pose/male/back-3.jpg'), require('../assets/fitness/pose/male/back-4.jpg'), require('../assets/fitness/pose/male/back-5.jpg'), require('../assets/fitness/pose/male/back-6.jpg'), require('../assets/fitness/pose/male/back-7.jpg')],
    female: [require('../assets/fitness/pose/female/back-1.jpg'), require('../assets/fitness/pose/female/back-2.jpg'), require('../assets/fitness/pose/female/back-3.jpg'), require('../assets/fitness/pose/female/back-4.jpg'), require('../assets/fitness/pose/female/back-5.jpg'), require('../assets/fitness/pose/female/back-6.jpg'), require('../assets/fitness/pose/female/back-7.jpg')],
  },
  'gym-technique-chest-supported-row': {
    male: [require('../assets/fitness/pose/male/row-1.jpg'), require('../assets/fitness/pose/male/row-2.jpg'), require('../assets/fitness/pose/male/row-3.jpg'), require('../assets/fitness/pose/male/row-4.jpg'), require('../assets/fitness/pose/male/row-5.jpg'), require('../assets/fitness/pose/male/row-6.jpg'), require('../assets/fitness/pose/male/row-7.jpg')],
    female: [require('../assets/fitness/pose/female/row-1.jpg'), require('../assets/fitness/pose/female/row-2.jpg'), require('../assets/fitness/pose/female/row-3.jpg'), require('../assets/fitness/pose/female/row-4.jpg'), require('../assets/fitness/pose/female/row-5.jpg'), require('../assets/fitness/pose/female/row-6.jpg'), require('../assets/fitness/pose/female/row-7.jpg')],
  },
  'gym-technique-knee-cushion': {
    male: [require('../assets/fitness/pose/male/knee-1.jpg'), require('../assets/fitness/pose/male/knee-2.jpg'), require('../assets/fitness/pose/male/knee-3.jpg'), require('../assets/fitness/pose/male/knee-4.jpg'), require('../assets/fitness/pose/male/knee-5.jpg'), require('../assets/fitness/pose/male/knee-6.jpg'), require('../assets/fitness/pose/male/knee-7.jpg')],
    female: [require('../assets/fitness/pose/female/knee-1.jpg'), require('../assets/fitness/pose/female/knee-2.jpg'), require('../assets/fitness/pose/female/knee-3.jpg'), require('../assets/fitness/pose/female/knee-4.jpg'), require('../assets/fitness/pose/female/knee-5.jpg'), require('../assets/fitness/pose/female/knee-6.jpg'), require('../assets/fitness/pose/female/knee-7.jpg')],
  },
  'gym-technique-squat-breath': {
    male: [require('../assets/fitness/pose/male/breath-1.jpg'), require('../assets/fitness/pose/male/breath-2.jpg'), require('../assets/fitness/pose/male/breath-3.jpg'), require('../assets/fitness/pose/male/breath-4.jpg'), require('../assets/fitness/pose/male/breath-5.jpg'), require('../assets/fitness/pose/male/breath-6.jpg'), require('../assets/fitness/pose/male/breath-7.jpg')],
    female: [require('../assets/fitness/pose/female/breath-1.jpg'), require('../assets/fitness/pose/female/breath-2.jpg'), require('../assets/fitness/pose/female/breath-3.jpg'), require('../assets/fitness/pose/female/breath-4.jpg'), require('../assets/fitness/pose/female/breath-5.jpg'), require('../assets/fitness/pose/female/breath-6.jpg'), require('../assets/fitness/pose/female/breath-7.jpg')],
  },
  'gym-technique-controlled-lowering': {
    male: [require('../assets/fitness/pose/male/curl-1.jpg'), require('../assets/fitness/pose/male/curl-2.jpg'), require('../assets/fitness/pose/male/curl-3.jpg'), require('../assets/fitness/pose/male/curl-4.jpg'), require('../assets/fitness/pose/male/curl-5.jpg'), require('../assets/fitness/pose/male/curl-6.jpg'), require('../assets/fitness/pose/male/curl-7.jpg')],
    female: [require('../assets/fitness/pose/female/curl-1.jpg'), require('../assets/fitness/pose/female/curl-2.jpg'), require('../assets/fitness/pose/female/curl-3.jpg'), require('../assets/fitness/pose/female/curl-4.jpg'), require('../assets/fitness/pose/female/curl-5.jpg'), require('../assets/fitness/pose/female/curl-6.jpg'), require('../assets/fitness/pose/female/curl-7.jpg')],
  },
  'gym-technique-hip-thrust-pad': {
    male: [require('../assets/fitness/pose/male/thrust-1.jpg'), require('../assets/fitness/pose/male/thrust-2.jpg'), require('../assets/fitness/pose/male/thrust-3.jpg'), require('../assets/fitness/pose/male/thrust-4.jpg'), require('../assets/fitness/pose/male/thrust-5.jpg'), require('../assets/fitness/pose/male/thrust-6.jpg'), require('../assets/fitness/pose/male/thrust-7.jpg')],
    female: [require('../assets/fitness/pose/female/thrust-1.jpg'), require('../assets/fitness/pose/female/thrust-2.jpg'), require('../assets/fitness/pose/female/thrust-3.jpg'), require('../assets/fitness/pose/female/thrust-4.jpg'), require('../assets/fitness/pose/female/thrust-5.jpg'), require('../assets/fitness/pose/female/thrust-6.jpg'), require('../assets/fitness/pose/female/thrust-7.jpg')],
  },
  'gym-technique-box-reference': {
    male: [require('../assets/fitness/pose/male/box-1.jpg'), require('../assets/fitness/pose/male/box-2.jpg'), require('../assets/fitness/pose/male/box-3.jpg'), require('../assets/fitness/pose/male/box-4.jpg'), require('../assets/fitness/pose/male/box-5.jpg'), require('../assets/fitness/pose/male/box-6.jpg'), require('../assets/fitness/pose/male/box-7.jpg')],
    female: [require('../assets/fitness/pose/female/box-1.jpg'), require('../assets/fitness/pose/female/box-2.jpg'), require('../assets/fitness/pose/female/box-3.jpg'), require('../assets/fitness/pose/female/box-4.jpg'), require('../assets/fitness/pose/female/box-5.jpg'), require('../assets/fitness/pose/female/box-6.jpg'), require('../assets/fitness/pose/female/box-7.jpg')],
  },
};
