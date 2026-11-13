import type { MuscleArea } from './muscle-map';

export type FocusLevel = 'beginner' | 'regular';
export type TargetBand = { low: number; high: number };

type AreaBand = {
  size: 'large' | 'small';
  beginner: TargetBand;
  regular: TargetBand;
};

const large: TargetBand = {
  // Source: Schoenfeld, Ogborn & Krieger (2017), J Sports Sci 35(11), weekly hard-set dose response.
  low: 6,
  high: 10,
};

const regular: TargetBand = {
  // Source: Schoenfeld, Ogborn & Krieger (2017), J Sports Sci 35(11), weekly hard-set dose response.
  low: 10,
  high: 20,
};

const small: TargetBand = {
  // Source: Schoenfeld, Ogborn & Krieger (2017), J Sports Sci 35(11), weekly hard-set dose response.
  low: 2,
  high: 6,
};

const largeAreas = new Set<MuscleArea>([
  'lats',
  'mid-back',
  'chest',
  'upper-chest',
  'quads',
  'hamstrings',
  'glutes',
  'front-delts',
  'side-delts',
  'rear-delts',
  'traps',
  'biceps',
  'triceps',
  'calves',
  'upper-abs',
  'lower-abs',
  'obliques',
  'lower-back',
  'hip-flexors',
]);

const smallAreas = new Set<MuscleArea>(['forearms', 'neck', 'shins', 'abductors', 'adductors']);

export const targetBandsByArea: Record<MuscleArea, AreaBand> = {
  neck: { size: 'small', beginner: small, regular: small },
  traps: { size: 'large', beginner: large, regular },
  'front-delts': { size: 'large', beginner: large, regular },
  'side-delts': { size: 'large', beginner: large, regular },
  'rear-delts': { size: 'large', beginner: large, regular },
  'upper-chest': { size: 'large', beginner: large, regular },
  chest: { size: 'large', beginner: large, regular },
  lats: { size: 'large', beginner: large, regular },
  'mid-back': { size: 'large', beginner: large, regular },
  'lower-back': { size: 'large', beginner: large, regular },
  biceps: { size: 'large', beginner: large, regular },
  triceps: { size: 'large', beginner: large, regular },
  forearms: { size: 'small', beginner: small, regular: small },
  'upper-abs': { size: 'large', beginner: large, regular },
  'lower-abs': { size: 'large', beginner: large, regular },
  obliques: { size: 'large', beginner: large, regular },
  'hip-flexors': { size: 'large', beginner: large, regular },
  glutes: { size: 'large', beginner: large, regular },
  abductors: { size: 'small', beginner: small, regular: small },
  adductors: { size: 'small', beginner: small, regular: small },
  quads: { size: 'large', beginner: large, regular },
  hamstrings: { size: 'large', beginner: large, regular },
  calves: { size: 'large', beginner: large, regular },
  shins: { size: 'small', beginner: small, regular: small },
};

// Source: WHO Guidelines on Physical Activity and Sedentary Behaviour (2020), 150 min/week.
export const cardioMinutesPerWeekTarget = 150;

export function targetBand(area: MuscleArea, level: FocusLevel): TargetBand {
  const chosen = targetBandsByArea[area];
  return level === 'regular' ? chosen.regular : chosen.beginner;
}

export function largeMuscleArea(area: MuscleArea) {
  return largeAreas.has(area);
}

export function smallMuscleArea(area: MuscleArea) {
  return smallAreas.has(area);
}
