import { largeMuscleArea, targetBand, type FocusLevel, type TargetBand } from './focus-targets';
import { isMobilityExercise, joints, jointsMoved, jointTargets, type Joint } from './joint-map';
import { muscleAreas, muscleMapFor, type MuscleArea } from './muscle-map';
import { exerciseRestClass } from './exercise-rest';

export type LoggedSet = { date: string; exerciseId: string; skipped?: boolean };
export type CardioEntry = { date: string; minutes: number };
export type BodyFlowRange = { from: string; to: string };

export type BodyFlowArea = {
  area: MuscleArea;
  sets: number;
  mainSets: number;
  helperSets: number;
  lastDate: string | null;
  exercises: { exerciseId: string; sets: number }[];
};

export type BodyFlowJoint = {
  joint: Joint;
  title: string;
  days: number;
  sets: number;
  lastDate: string | null;
  exercises: { exerciseId: string; sets: number }[];
};

export type BodyFlowResult = {
  areas: BodyFlowArea[];
  joints: BodyFlowJoint[];
  cardioMinutes: number;
  days: number;
  weeks: number;
};

type MutableArea = {
  area: MuscleArea;
  sets: number;
  mainSets: number;
  helperSets: number;
  lastDate: string | null;
  byExercise: Map<string, number>;
};

type MutableJoint = {
  joint: Joint;
  dates: Set<string>;
  sets: number;
  lastDate: string | null;
  byExercise: Map<string, number>;
};

function inRange(date: string, range: BodyFlowRange) {
  return date >= range.from && date <= range.to;
}

function inclusiveDays(range: BodyFlowRange) {
  const from = Date.parse(`${range.from}T00:00:00.000Z`);
  const to = Date.parse(`${range.to}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.round((to - from) / 86400000) + 1;
}

function topContributors(input: Map<string, number>) {
  return [...input.entries()]
    .filter(([, sets]) => sets > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([exerciseId, sets]) => ({ exerciseId, sets }));
}

function isSkipped(set: LoggedSet) {
  return set.skipped === true;
}

export type MuscleSetWeight = { area: MuscleArea; main: number; helper: number };

/**
 * How one set counts toward muscle areas.
 * A main area is 1, a helper is 0.5. Mobility and conditioning add nothing.
 * Logged sets and planned sets both use this, so a prediction matches the figure after the same work is logged.
 */
export function muscleSetWeights(exerciseId: string): MuscleSetWeight[] {
  if (isMobilityExercise(exerciseId)) return [];
  if (exerciseRestClass[exerciseId] === 'conditioning') return [];
  const tag = muscleMapFor(exerciseId);
  if (!tag.main.length && !tag.helpers.length) return [];
  return [
    ...tag.main.map(area => ({ area, main: 1, helper: 0 })),
    ...tag.helpers.map(area => ({ area, main: 0, helper: 0.5 })),
  ];
}

/** Weeks a span of `days` is measured against. Never less than one week, same as `bodyFlow`. */
export function pictureWeeks(days: number) {
  const count = Number.isFinite(days) && days > 0 ? days : 0;
  return Math.max(count, 7) / 7;
}

/** First non-skipped date in the logs, or null when there is no completed set yet. */
export function dayZero(sets: LoggedSet[]) {
  return (
    sets
      .filter(set => !isSkipped(set))
      .map(set => set.date)
      .sort((a, b) => a.localeCompare(b))[0] ?? null
  );
}

/**
 * Weeks between the first and latest non-skipped set.
 * One day is 1/7. Nothing logged is 0. A skipped set does not move either end.
 */
export function loggedWeeks(sets: LoggedSet[]): number {
  const start = dayZero(sets);
  if (!start) return 0;
  const end = sets
    .filter(set => !isSkipped(set))
    .map(set => set.date)
    .sort((a, b) => b.localeCompare(a))[0];
  if (!end) return 0;
  return inclusiveDays({ from: start, to: end }) / 7;
}

/**
 * The level is deliberately simple:
 * - beginner for new records and up to 8 weeks between first and latest non-skipped set
 * - regular once the span exceeds 8 weeks
 */
export function levelFromSets(sets: LoggedSet[]): FocusLevel {
  return loggedWeeks(sets) > 8 ? 'regular' : 'beginner';
}

/** 0 none, 1 under half low, 2 under low, 3 in band, 4 above high (band scaled by weeks). */
export function shade(sets: number, band: TargetBand, weeks: number) {
  if (sets <= 0) return 0;
  const low = band.low * weeks;
  const high = band.high * weeks;
  if (sets < low / 2) return 1;
  if (sets < low) return 2;
  if (sets <= high) return 3;
  return 4;
}

/** Same five steps as `shade`, against 2–3 mobility days a week scaled by the weeks in the range. */
export function jointShade(days: number, weeks: number) {
  return shade(days, jointTargets, weeks);
}

export function bodyFlow(sets: LoggedSet[], cardio: CardioEntry[], range: BodyFlowRange): BodyFlowResult {
  const days = inclusiveDays(range);
  const areas = new Map<MuscleArea, MutableArea>(
    muscleAreas.map(item => [
      item.id,
      { area: item.id, sets: 0, mainSets: 0, helperSets: 0, lastDate: null, byExercise: new Map<string, number>() },
    ]),
  );
  const jointRows = new Map<Joint, MutableJoint>(
    joints.map(item => [item.id, { joint: item.id, dates: new Set<string>(), sets: 0, lastDate: null, byExercise: new Map<string, number>() }]),
  );

  for (const set of sets) {
    if (!inRange(set.date, range) || isSkipped(set)) continue;
    // A mobility set moves joints. It does not add hard sets to the muscle areas.
    if (isMobilityExercise(set.exerciseId)) {
      for (const joint of jointsMoved(set.exerciseId)) {
        const row = jointRows.get(joint);
        if (!row) continue;
        row.sets += 1;
        row.dates.add(set.date);
        row.lastDate = row.lastDate && row.lastDate > set.date ? row.lastDate : set.date;
        row.byExercise.set(set.exerciseId, (row.byExercise.get(set.exerciseId) ?? 0) + 1);
      }
      continue;
    }
    // Conditioning and untagged exercises add no hard sets. `muscleSetWeights` is that rule.
    for (const weight of muscleSetWeights(set.exerciseId)) {
      const row = areas.get(weight.area);
      if (!row) continue;
      const amount = weight.main + weight.helper;
      row.sets += amount;
      row.mainSets += weight.main;
      row.helperSets += weight.helper;
      row.lastDate = row.lastDate && row.lastDate > set.date ? row.lastDate : set.date;
      row.byExercise.set(set.exerciseId, (row.byExercise.get(set.exerciseId) ?? 0) + amount);
    }
  }

  const cardioMinutes = cardio
    .filter(entry => inRange(entry.date, range))
    .reduce((sum, entry) => sum + (Number.isFinite(entry.minutes) ? Math.max(0, entry.minutes) : 0), 0);

  return {
    areas: muscleAreas.map(item => {
      const found = areas.get(item.id)!;
      return {
        area: found.area,
        sets: found.sets,
        mainSets: found.mainSets,
        helperSets: found.helperSets,
        lastDate: found.lastDate,
        exercises: topContributors(found.byExercise),
      };
    }),
    joints: joints.map(item => {
      const found = jointRows.get(item.id)!;
      return {
        joint: found.joint,
        title: item.title,
        days: found.dates.size,
        sets: found.sets,
        lastDate: found.lastDate,
        exercises: topContributors(found.byExercise),
      };
    }),
    cardioMinutes,
    days,
    // Never measure against less than one week's target: on a Monday or a member's first day, one
    // workout would otherwise read as 'beyond target' everywhere it touched.
    weeks: pictureWeeks(days),
  };
}

/** Large areas furthest below target, worst first, in plain text for the gap list. */
export function gaps(result: BodyFlowResult, level: FocusLevel) {
  const deficits = result.areas
    .filter(area => largeMuscleArea(area.area))
    .map(area => {
      const low = targetBand(area.area, level).low * result.weeks;
      return { area, low, deficit: low - area.sets };
    })
    .filter(item => item.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.area.area.localeCompare(b.area.area));
  const titleByArea = new Map(muscleAreas.map(area => [area.id, area.title]));
  return deficits.map(item => `${titleByArea.get(item.area.area) ?? item.area.area}: lowest since you started`);
}

export type AreaPictureState = 'quiet' | 'missed' | 'worked';

/** 0 when the area is not worked. 1 is under the low end, 2 is inside the band, 3 is past the high end. */
export type AreaPicture = { state: AreaPictureState; step: 0 | 1 | 2 | 3 };

export type AreaPictureInput = {
  sets: number;
  /**
   * The planner's weekly band. It is multiplied by `weeks`.
   * Pass weeks 1 when the band is already scaled to the range.
   */
  band: TargetBand;
  weeks: number;
  /**
   * The member marked this area. Untouched, it is missed. With any work it is worked;
   * the planner, not the picture, keeps pushing it until the top of the band.
   */
  priority?: boolean;
  /**
   * A large area. No longer makes an area missed on its own: missed means due on the plan and not done.
   * Kept so callers can still say it; prompt 07 passes `planned` from the followed Map flow.
   */
  large?: boolean;
  /**
   * The plan asked for this area by now. No sets means missed, including a small
   * area the weekly target would leave quiet. Prompt 07 fills this from what the
   * followed Map flow planned by now. A figure that only lights work just done passes false.
   */
  planned?: boolean;
};

/**
 * The only place a Body flow figure decides worked, missed or quiet.
 * Worked deepens in three steps against the same band the planner uses.
 */
export function areaPicture(input: AreaPictureInput): AreaPicture {
  const weeks = Number.isFinite(input.weeks) && input.weeks > 0 ? input.weeks : 0;
  const sets = Number.isFinite(input.sets) && input.sets > 0 ? input.sets : 0;
  const low = input.band.low * weeks;
  const high = input.band.high * weeks;
  // Missed is only ever an area with no work: due on the plan and not done, or a priority left untouched.
  // An area with some work is worked, however little; how far it is from the band lives in Details.
  if (sets <= 0 && (input.planned === true || input.priority === true)) return { state: 'missed', step: 0 };
  if (sets <= 0) return { state: 'quiet', step: 0 };
  const step = sets > high ? 3 : sets >= low ? 2 : 1;
  return { state: 'worked', step };
}

/** Main muscle areas these exercises train. Mobility and conditioning add none, same as `bodyFlow`. */
export function mainAreasTrained(exerciseIds: readonly string[]): MuscleArea[] {
  const areas = new Set<MuscleArea>();
  for (const exerciseId of exerciseIds) {
    if (isMobilityExercise(exerciseId)) continue;
    if (exerciseRestClass[exerciseId] === 'conditioning') continue;
    for (const area of muscleMapFor(exerciseId).main) areas.add(area);
  }
  return [...areas].sort((a, b) => a.localeCompare(b));
}

/** The six groups the member thinks in. The list and the headline share this order. */
export const bodyRegions: { name: string; areas: MuscleArea[] }[] = [
  { name: 'Back', areas: ['lats', 'mid-back', 'lower-back', 'traps', 'neck'] },
  { name: 'Chest', areas: ['upper-chest', 'chest'] },
  { name: 'Shoulders', areas: ['front-delts', 'side-delts', 'rear-delts'] },
  { name: 'Arms', areas: ['biceps', 'triceps', 'forearms'] },
  { name: 'Core', areas: ['upper-abs', 'lower-abs', 'obliques'] },
  { name: 'Legs', areas: ['glutes', 'quads', 'hamstrings', 'calves', 'hip-flexors', 'abductors', 'adductors', 'shins'] },
];

function areaTitle(area: MuscleArea) {
  return muscleAreas.find(item => item.id === area)?.title ?? area;
}

function missedLine(name: string, span: string) {
  return `${name} ${/s$/i.test(name) ? 'are' : 'is'} missed ${span}`;
}

/**
 * The one line under the figure. A missed priority wins. Otherwise the region
 * with the most missed areas wins, so an empty week reads "Legs are missed".
 */
export function pictureHeadline(
  rows: readonly { area: MuscleArea; state: AreaPictureState }[],
  priorities: readonly MuscleArea[],
  span: string,
): { text: string; area: MuscleArea | null } {
  const missed = new Set(rows.filter(row => row.state === 'missed').map(row => row.area));
  if (!missed.size) return { text: `Nothing missed ${span}`, area: null };
  const priorityArea = priorities.find(area => missed.has(area)) ?? null;
  const regions = bodyRegions.map((region, index) => ({
    name: region.name,
    index,
    areas: region.areas,
    missed: region.areas.filter(area => missed.has(area)),
  }));
  const priorityRegion = priorityArea ? regions.find(region => region.areas.includes(priorityArea)) : undefined;
  const busiest = [...regions]
    .filter(region => region.missed.length)
    .sort((a, b) => b.missed.length - a.missed.length || a.index - b.index)[0];
  const chosen = priorityRegion ?? busiest;
  const area = priorityArea ?? chosen?.missed[0] ?? [...missed][0] ?? null;
  const name = chosen?.name ?? (area ? areaTitle(area) : 'This');
  return { text: missedLine(name, span), area };
}
