/**
 * What adding a flow does to this week's Body flow, and whether it stacks a
 * heavy area on the day beside it. Information only: nothing here blocks a save.
 */
import { targetBand, type FocusLevel } from './focus-targets';
import { gymExerciseId, gymFlowItem } from './gym-flows';
import { exerciseMuscles, muscleAreas, type MuscleArea } from './muscle-map';

export type AreaSets = { area: MuscleArea; mainSets: number };

export type WeekArea = { area: MuscleArea; sets: number; low: number; high: number };

const regions: { name: string; areas: MuscleArea[] }[] = [
  { name: 'Back', areas: ['lats', 'mid-back', 'lower-back', 'traps'] },
  { name: 'Chest', areas: ['chest', 'upper-chest'] },
  { name: 'Shoulders', areas: ['front-delts', 'side-delts', 'rear-delts'] },
  { name: 'Arms', areas: ['biceps', 'triceps', 'forearms'] },
  { name: 'Core', areas: ['upper-abs', 'lower-abs', 'obliques'] },
  { name: 'Legs', areas: ['quads', 'hamstrings', 'glutes', 'calves', 'hip-flexors', 'abductors', 'adductors', 'shins'] },
  { name: 'Neck', areas: ['neck'] },
];

/** Sets a community flow's gym cards add. A card that is not a gym exercise adds nothing. */
export function setsFromCards(cards: readonly { cardId: string }[]) {
  const totals = new Map<string, number>();
  for (const card of cards) {
    const exerciseId = gymExerciseId(card.cardId);
    if (!exerciseId) continue;
    const split = card.cardId.indexOf(':');
    const flowId = split > 0 ? card.cardId.slice(0, split) : '';
    const sets = gymFlowItem(flowId, exerciseId)?.sets ?? 1;
    totals.set(exerciseId, (totals.get(exerciseId) ?? 0) + sets);
  }
  return [...totals].map(([exerciseId, sets]) => ({ exerciseId, sets }));
}

/** Main-area sets a flow adds. Helpers are left out: the recovery rule is about main sets. */
export function mainSetsFor(items: readonly { exerciseId: string; sets: number }[]): AreaSets[] {
  const totals = new Map<MuscleArea, number>();
  for (const item of items) {
    if (item.sets <= 0) continue;
    const tag = exerciseMuscles[item.exerciseId];
    if (!tag) continue;
    for (const area of tag.main) totals.set(area, (totals.get(area) ?? 0) + item.sets);
  }
  return [...totals]
    .map(([area, mainSets]) => ({ area, mainSets }))
    .sort((a, b) => b.mainSets - a.mainSets || a.area.localeCompare(b.area));
}

function areaName(area: MuscleArea) {
  return (muscleAreas.find(item => item.id === area)?.title ?? area).toLowerCase();
}

function regionName(area: MuscleArea) {
  return regions.find(region => region.areas.includes(area))?.name ?? areaName(area);
}

function countText(value: number) {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 10) / 10);
}

/**
 * One line for the area this flow adds the most to, then a caution when that
 * would put 4 or more main sets of the same region on the day before or after.
 * The caution never replaces the first line, and either may be absent.
 */
export function seriesImpactLines(input: {
  adds: readonly AreaSets[];
  week: readonly WeekArea[];
  level?: FocusLevel;
  nearby: readonly { side: 'before' | 'after'; areas: readonly AreaSets[] }[];
}): string[] {
  const lead = input.adds.find(row => row.mainSets > 0);
  const lines: string[] = [];
  if (lead) {
    const known = input.week.find(row => row.area === lead.area);
    const band = known ?? { sets: 0, ...targetBand(lead.area, input.level ?? 'regular') };
    const sets = known?.sets ?? 0;
    const word = lead.mainSets === 1 ? 'set' : 'sets';
    lines.push(
      `Adds ${lead.mainSets} ${word} for ${areaName(lead.area)} (${countText(sets)} of ${band.low}–${band.high} this week)`,
    );
  }
  const heavy = input.adds.filter(row => row.mainSets >= 4);
  if (!heavy.length) return lines;
  let best: { name: string; side: 'before' | 'after'; sets: number } | null = null;
  for (const day of input.nearby) {
    for (const planned of day.areas) {
      if (planned.mainSets < 4) continue;
      const match = heavy.find(row => regionName(row.area) === regionName(planned.area));
      if (!match) continue;
      const name = regionName(match.area);
      const sets = planned.mainSets;
      const better =
        !best ||
        (day.side === 'before' && best.side === 'after') ||
        (day.side === best.side && sets > best.sets);
      if (better) best = { name, side: day.side, sets };
    }
  }
  if (best) lines.push(`${best.name} is also planned the day ${best.side}`);
  return lines;
}
