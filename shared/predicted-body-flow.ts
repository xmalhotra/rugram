/**
 * The picture of a plan: what one full pass of its Daily flows would do to Body flow.
 * The pattern can be any length. There is no separate day or week prediction.
 * A prediction has nothing logged, so planned areas are worked steps. Missed stays the word
 * for an area the plan asked for that was not done, which a prediction cannot show.
 */
import { customflowKey, applyCustomflow, type Customflows } from './customflows';
import { areaPicture, bodyRegions, muscleSetWeights, pictureWeeks, type AreaPicture } from './body-flow';
import type { FlowLevel } from './flow-defaults';
import { focusLevelFor } from './member-level';
import { targetBand } from './focus-targets';
import { addCalendarDays, occurrences, type FlowSeries, type SeriesItemKind } from './flow-series';
import { gymFlowById } from './gym-flows';
import { muscleAreas, type MuscleArea } from './muscle-map';
import { flowLevelOf, memberGymItems } from './priority-finisher';

/** One flow on a day of the pattern. A Qram gym flow is resolved for this member. */
export type PlannedFlow = {
  id: string;
  kind: SeriesItemKind;
  version?: number;
  /** Set counts when this is not a Qram gym flow. A gym flow uses the written session instead. */
  items?: readonly { exerciseId: string; sets: number }[];
};

/** One day. No flows is a rest day, and it still counts toward the length of the pass. */
export type PlannedDay = {
  flows: readonly PlannedFlow[];
};

/** One full pass, in order. Three days, five, nine: the length is whatever the pattern is. */
export type BodyPlan = {
  days: readonly PlannedDay[];
};

/** Who would run the plan. Their level sets the band. Their Custom flow and priorities change the sets. */
export type PredictionMember = {
  level: FlowLevel;
  priorities?: readonly MuscleArea[];
  customflows?: Customflows;
};

/** The same rows `BodyPicture` takes. */
export type PredictedArea = {
  area: MuscleArea;
  state: AreaPicture['state'];
  step: AreaPicture['step'];
};

const quiet: PredictedArea['state'] = 'quiet';

function areaTitle(area: MuscleArea) {
  return muscleAreas.find(item => item.id === area)?.title ?? area;
}

function verb(name: string) {
  return /s$/i.test(name) ? 'are' : 'is';
}

function flowItems(flow: PlannedFlow, member: PredictionMember): { exerciseId: string; sets: number }[] {
  if (flow.kind === 'flow') {
    const gym = gymFlowById(flow.id);
    if (gym) {
      const custom = member.customflows?.[customflowKey('qram-flow', flow.id)];
      // The session's own level chooses the finisher dose. The member's level chooses the band, below.
      return memberGymItems(gym.items, member.priorities ?? [], flowLevelOf(gym.level), custom).map(item => ({
        exerciseId: item.exerciseId,
        sets: item.sets,
      }));
    }
  }
  const sourceKind = flow.kind === 'session' ? 'qram-session' : flow.kind === 'community' ? 'community-flow' : 'qram-flow';
  const custom = member.customflows?.[customflowKey(sourceKind, flow.id)];
  return applyCustomflow(flow.items ?? [], custom, item => item.exerciseId).map(item => ({
    exerciseId: item.exerciseId,
    sets: item.sets,
  }));
}

function addPlannedSets(totals: Map<MuscleArea, number>, exerciseId: string, times: number) {
  if (!Number.isFinite(times) || times <= 0) return;
  for (const weight of muscleSetWeights(exerciseId)) {
    totals.set(weight.area, (totals.get(weight.area) ?? 0) + (weight.main + weight.helper) * times);
  }
}

/**
 * The figure for one full pass. Planned sets are counted with `muscleSetWeights`, then painted
 * with `areaPicture`. Priority and planned are left off: nothing is done yet, so nothing is missed.
 */
export function predictBodyFlow(plan: BodyPlan, member: PredictionMember): PredictedArea[] {
  const totals = new Map<MuscleArea, number>();
  for (const day of plan.days) {
    for (const flow of day.flows) {
      for (const item of flowItems(flow, member)) addPlannedSets(totals, item.exerciseId, item.sets);
    }
  }
  const level = focusLevelFor(member.level);
  const weeks = pictureWeeks(plan.days.length);
  return muscleAreas.map(item => {
    const picture = areaPicture({
      sets: totals.get(item.id) ?? 0,
      band: targetBand(item.id, level),
      weeks,
      planned: false,
      priority: false,
    });
    return { area: item.id, state: picture.state, step: picture.step };
  });
}

function workedAreas(rows: readonly PredictedArea[]) {
  return new Set(rows.filter(row => row.state === 'worked').map(row => row.area));
}

/**
 * What changed between two predictions.
 * "Adds hamstrings" is new work. "Calves are no longer covered" is one area dropping out.
 * "Legs are missed" is a whole region that had work and now has none.
 */
export function comparePredictions(before: readonly PredictedArea[], after: readonly PredictedArea[]): string[] {
  const prior = new Map(before.map(row => [row.area, row]));
  const next = new Map(after.map(row => [row.area, row]));
  const priorWork = workedAreas(before);
  const nextWork = workedAreas(after);
  const missedRegion = new Set<MuscleArea>();
  const missedLines: string[] = [];
  for (const region of bodyRegions) {
    const had = region.areas.filter(area => priorWork.has(area));
    if (!had.length || had.some(area => nextWork.has(area))) continue;
    for (const area of had) missedRegion.add(area);
    missedLines.push(`${region.name} ${verb(region.name)} missed`);
  }
  const gains: string[] = [];
  const losses: string[] = [];
  for (const item of muscleAreas) {
    const from = prior.get(item.id) ?? { area: item.id, state: quiet, step: 0 as const };
    const to = next.get(item.id) ?? { area: item.id, state: quiet, step: 0 as const };
    const name = areaTitle(item.id);
    if (from.state !== 'worked' && to.state === 'worked') {
      gains.push(`Adds ${name.toLowerCase()}`);
      continue;
    }
    if (from.state === 'worked' && to.state === 'worked' && to.step > from.step) {
      gains.push(`More ${name.toLowerCase()}`);
      continue;
    }
    if (missedRegion.has(item.id)) continue;
    if (from.state === 'worked' && to.state !== 'worked') {
      losses.push(`${name} ${verb(name)} no longer covered`);
      continue;
    }
    if (from.state === 'worked' && to.state === 'worked' && to.step < from.step) {
      losses.push(`Less ${name.toLowerCase()}`);
    }
  }
  return [...gains, ...missedLines, ...losses];
}

/** Put `flow` on the first rest day, or on a new day when the pass has no rest. */
export function planAddingFlow(plan: BodyPlan, flow: PlannedFlow): BodyPlan {
  if (!plan.days.length) return { days: [{ flows: [flow] }] };
  const rest = plan.days.findIndex(day => day.flows.length === 0);
  if (rest < 0) return { days: [...plan.days, { flows: [flow] }] };
  return {
    days: plan.days.map((day, index) => (index === rest ? { flows: [...day.flows, flow] } : day)),
  };
}

export function planHasFlow(plan: BodyPlan, flow: Pick<PlannedFlow, 'id' | 'kind'>) {
  return plan.days.some(day => day.flows.some(item => item.id === flow.id && item.kind === flow.kind));
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function lcm(a: number, b: number) {
  return (a / gcd(a, b)) * b;
}

/** How long one pass of this repeat is, in days. A month is 28 days so it is not treated as a week. */
function periodDays(series: FlowSeries) {
  const recurrence = series.recurrence;
  if (recurrence.kind === 'daily') return recurrence.every;
  if (recurrence.kind === 'weekdays') return 7;
  if (recurrence.kind === 'weekly') return 7 * recurrence.every;
  if (recurrence.kind === 'monthly') return 28 * recurrence.every;
  return 1;
}

function seriesInPass(series: FlowSeries, anchor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(series.start) || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return false;
  if (series.end.kind === 'on' && series.end.date < anchor) return false;
  if (series.recurrence.kind === 'once') return series.start >= anchor;
  const horizon = addCalendarDays(anchor, periodDays(series) - 1);
  if (occurrences([series], [], anchor, horizon).length > 0) return true;
  return series.start > horizon;
}

/**
 * One pass of the member's series, as a plan.
 * The length is the combined repeat (a weekly flow and a two-week flow make 14 days), not a fixed week.
 * A series the window does not hit, but that is still part of the pattern, is one extra day so it is not dropped.
 */
export function planFromSeries(seriesList: readonly FlowSeries[], anchor: string): BodyPlan {
  const active = seriesList.filter(series => seriesInPass(series, anchor));
  if (!active.length) return { days: [] };
  const span = active.map(periodDays).reduce((total, period) => lcm(total, period), 1);
  const end = addCalendarDays(anchor, span - 1);
  const rows = occurrences([...active], [], anchor, end);
  const days: PlannedDay[] = [];
  for (let index = 0; index < span; index += 1) {
    const date = addCalendarDays(anchor, index);
    days.push({
      flows: rows
        .filter(row => row.date === date)
        .map(row => ({
          id: row.itemId,
          kind: row.itemKind,
          ...(row.version != null ? { version: row.version } : {}),
        })),
    });
  }
  const seen = new Set(rows.map(row => row.seriesId));
  for (const series of active) {
    if (seen.has(series.id)) continue;
    days.push({
      flows: [
        {
          id: series.itemId,
          kind: series.itemKind,
          ...(series.version != null ? { version: series.version } : {}),
        },
      ],
    });
  }
  return { days };
}
