/**
 * When a member has outgrown a flow.
 *
 * ACSM Position Stand 2026 (Med Sci Sports Exerc): simple progression is enough.
 * Add reps up to the top of the range, then add weight. This only notices that
 * the top has been reached. The session screen already raises the weight.
 * Zourdos et al. 2016 (J Strength Cond Res): reps in reserve is how hard a set
 * was. A set recorded with 0 reps in reserve is a failure, so it does not count
 * as mastering the top of the range. A set with no reserve recorded is not
 * treated as a failure.
 *
 * Exercise ready: in each of the last 2 sessions of that exercise in this flow,
 * every set they logged reached the top of the rep range, or the top of the hold.
 * The flow's set count is a guide. Fewer or more logged sets are read as they are.
 * A session with no logged set is not ready. A max set has no top, so it is never ready.
 * Skipped sets are left out.
 *
 * Flow ready: at least 3 finished sessions of this flow in the last 6 weeks
 * (42 days), and at least 70% of its exercises are ready.
 *
 * The next step is the same catalogue tile one level up (`next` on the flow).
 * A split day uses the matching day of the heavier programme: the day with the
 * same title, or the same position when both programmes have the same number of
 * days. If there is no heavier programme, next is null. An advanced flow does
 * not move up a level. For each ready exercise it suggests one harder variation.
 *
 * A harder variation shares the first main muscle, and steps up on rest class
 * or load type without stepping down on the other. Rest classes, low to high:
 * mobility, conditioning, core, isolation, compound, heavy compound. Load
 * types, low to high: assisted, bodyweight, weight. The winner is the highest
 * `alternativeScore` from exercise-alternatives. Ties prefer the higher rest
 * class, then the higher load, then the name.
 */
import { exerciseRestClass, type RestClass } from './exercise-rest';
import { exercise, gymExercises, type LoadType } from './exercises';
import {
  catalogFlows,
  catalogProgrammes,
  type CatalogFlow,
  type CatalogLevel,
  type CatalogProgramme,
} from './flow-catalog';
import { gymFlowById, gymFlows, resolveTarget, type GymFlowItem } from './gym-flows';
import { exerciseMuscles } from './muscle-map';
import { howToLoopIds } from './how-to-loops';
import { addCalendarDays, occurrences, type FlowSeries, type SeriesEnd } from './flow-series';

export type GraduationSet = {
  setIndex: number;
  reps: number | null;
  durationSeconds: number | null;
  status?: 'done' | 'skipped';
  /** 0 is failure (Zourdos). Missing means it was not recorded. */
  repsInReserve?: number | null;
};

export type GraduationSession = {
  /** When the session finished, ISO. */
  finishedAt: string;
  sets: { exerciseId: string; set: GraduationSet }[];
};

export type GraduationItem = Pick<GymFlowItem, 'exerciseId' | 'sets' | 'repsMin' | 'repsMax' | 'target'>;

export type GraduationNext = { flowId: string; title: string; level: CatalogLevel };

export type GraduationVariation = {
  exerciseId: string;
  name: string;
  nextId: string;
  nextName: string;
};

export type GraduationResult = {
  ready: boolean;
  exercisesReady: string[];
  next: GraduationNext | null;
  /** Harder stand-ins for an advanced flow. Empty for every other level. */
  variations: GraduationVariation[];
  reason: string;
};

export type GraduationCatalog = {
  flows: readonly CatalogFlow[];
  programmes: readonly CatalogProgramme[];
};

const dayMs = 24 * 60 * 60 * 1000;
const flowWindowMs = 42 * dayMs;

const restRank: Record<RestClass, number> = {
  mobility: 0,
  conditioning: 1,
  core: 2,
  isolation: 3,
  compound: 4,
  'heavy-compound': 5,
};

const loadRank: Record<LoadType, number> = {
  assisted: 0,
  bodyweight: 1,
  weight: 2,
};

const defaultCatalog: GraduationCatalog = { flows: catalogFlows, programmes: catalogProgrammes };

function catalogEntry(flowId: string, flows: readonly CatalogFlow[]) {
  return flows.find(item => item.id === flowId) ?? flows.find(item => item.flowId === flowId);
}

function liveGymId(flow: CatalogFlow | undefined) {
  if (!flow) return null;
  const flowId = flow.flowId ?? flow.id;
  const gym = gymFlowById(flowId);
  if (!gym || gym.items.length === 0) return null;
  return flowId;
}

function levelOf(flowId: string, flows: readonly CatalogFlow[]): CatalogLevel | null {
  const entry = catalogEntry(flowId, flows);
  if (entry) return entry.level;
  const gym = gymFlowById(flowId);
  if (gym?.level === 'Beginner' || gym?.level === 'Intermediate' || gym?.level === 'Advanced') return gym.level;
  return null;
}

function splitOf(entry: CatalogFlow, programmes: readonly CatalogProgramme[]) {
  return programmes.find(
    item => item.days.includes(entry.id) || (entry.flowId != null && item.days.includes(entry.flowId)),
  );
}

/** The next catalogue step, or null when this flow is advanced, a split with nothing heavier, or the step is not live. */
export function nextFlowStep(flowId: string, catalog: GraduationCatalog = defaultCatalog): GraduationNext | null {
  const entry = catalogEntry(flowId, catalog.flows);
  if (!entry) return null;
  if (entry.level === 'Advanced') return null;
  const split = splitOf(entry, catalog.programmes);
  if (split) return heavierDay(entry, split, catalog);
  const nextId = entry.next?.[0];
  const next = nextId ? catalog.flows.find(item => item.id === nextId) : undefined;
  const gymId = liveGymId(next);
  if (!next || !gymId) return null;
  return { flowId: gymId, title: next.title, level: next.level };
}

function heavierDay(
  entry: CatalogFlow,
  split: CatalogProgramme,
  catalog: GraduationCatalog,
): GraduationNext | null {
  const rank = ['Beginner', 'Intermediate', 'Advanced'].indexOf(entry.level);
  const index = split.days.indexOf(entry.id) >= 0 ? split.days.indexOf(entry.id) : split.days.indexOf(entry.flowId ?? '');
  const heavier = catalog.programmes
    .filter(item => item.tileId === entry.tileId && ['Beginner', 'Intermediate', 'Advanced'].indexOf(item.level) > rank)
    .sort(
      (a, b) =>
        ['Beginner', 'Intermediate', 'Advanced'].indexOf(a.level) -
        ['Beginner', 'Intermediate', 'Advanced'].indexOf(b.level),
    );
  for (const programme of heavier) {
    const days = programme.days.map(id => catalog.flows.find(item => item.id === id));
    const byTitle = days.find(day => day?.title === entry.title);
    const byIndex = programme.days.length === split.days.length && index >= 0 ? days[index] : undefined;
    const day = byTitle ?? byIndex;
    const gymId = liveGymId(day);
    if (!day || !gymId) continue;
    return { flowId: gymId, title: day.title, level: day.level };
  }
  return null;
}

function isHarder(fromId: string, toId: string) {
  const from = exercise(fromId);
  const to = exercise(toId);
  if (!from || !to) return false;
  const fromClass = exerciseRestClass[fromId] ?? 'compound';
  const toClass = exerciseRestClass[toId] ?? 'compound';
  // A single-joint exercise steps up to a harder single-joint one (machine to free weight), not to a different lift.
  if (fromClass === 'isolation' && toClass !== 'isolation') return false;
  const steps = [
    restRank[toClass] - restRank[fromClass],
    loadRank[to.load] - loadRank[from.load],
    freeWeight(to.equipment) - freeWeight(from.equipment),
  ];
  return steps.every(step => step >= 0) && steps.some(step => step > 0);
}

const freeWeightRank: Record<string, number> = { barbell: 3, 'ez-bar': 3, 'trap-bar': 3, dumbbell: 2, kettlebell: 2 };
function freeWeight(equipment: string) {
  return freeWeightRank[equipment] ?? 1;
}

/** Exercises the curated gym flows use: the standard lifts, preferred over rarer ones as a next step. */
let standardLifts: Set<string> | null = null;
function isStandard(id: string) {
  standardLifts ??= new Set(gymFlows.flatMap(flow => flow.items.map(item => item.exerciseId)));
  return standardLifts.has(id);
}

function sharedShare(a: readonly string[], b: readonly string[]) {
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  return a.filter(area => b.includes(area)).length / union.size;
}

/**
 * One harder variation, or null when nothing in the same muscle is harder.
 * A step up means the same job done with more to control: a lift the curated flows already use first, then the
 * closest match on muscles, loaded over bodyweight, a bigger lift, and free weights over machines. Bands are left out (their resistance is not a
 * measurable step up), and so is anything without a how-to loop, since the member has to be shown it.
 */
export function harderVariation(exerciseId: string): { exerciseId: string; name: string } | null {
  const from = exerciseMuscles[exerciseId];
  const muscle = from?.main[0];
  if (!from || !muscle) return null;
  const ranked = gymExercises
    .filter(
      item =>
        item.id !== exerciseId &&
        item.equipment !== 'band' &&
        howToLoopIds.has(item.id) &&
        exerciseMuscles[item.id]?.main[0] === muscle &&
        isHarder(exerciseId, item.id),
    )
    .map(item => {
      const to = exerciseMuscles[item.id] ?? { main: [], helpers: [] };
      return {
        id: item.id,
        name: item.name,
        match: sharedShare(from.main, to.main) + sharedShare(from.helpers, to.helpers) / 2,
        rest: exerciseRestClass[item.id] ?? 'compound',
        load: item.load,
        free: freeWeight(item.equipment),
        standard: isStandard(item.id) ? 1 : 0,
      };
    })
    .sort(
      (a, b) =>
        b.standard - a.standard ||
        b.match - a.match ||
        loadRank[b.load] - loadRank[a.load] ||
        restRank[b.rest] - restRank[a.rest] ||
        b.free - a.free ||
        a.name.localeCompare(b.name),
    );
  const winner = ranked[0];
  return winner ? { exerciseId: winner.id, name: winner.name } : null;
}

function topped(item: GraduationItem, set: GraduationSet) {
  if (set.status === 'skipped') return false;
  if (set.repsInReserve === 0) return false;
  const target = resolveTarget(item);
  if (target.kind === 'max') return false;
  if (target.kind === 'hold') return (set.durationSeconds ?? 0) >= target.maxSeconds;
  return (set.reps ?? 0) >= target.max;
}

function sessionTopped(item: GraduationItem, session: GraduationSession) {
  const rows = session.sets.filter(row => row.exerciseId === item.exerciseId && row.set.status !== 'skipped');
  if (!rows.length) return false;
  return rows.every(row => topped(item, row.set));
}

function sessionsOf(item: GraduationItem, sessions: readonly GraduationSession[]) {
  return sessions.filter(session => session.sets.some(row => row.exerciseId === item.exerciseId));
}

function exerciseIsReady(item: GraduationItem, sessions: readonly GraduationSession[]) {
  const recent = sessionsOf(item, sessions).slice(0, 2);
  return recent.length === 2 && recent.every(session => sessionTopped(item, session));
}

function stamp(iso: string) {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : null;
}

/**
 * The first future occurrence of this flow, and the date the series should start
 * so the weekday stays. `original` is that weekday when it is still ahead.
 */
export function routineSwitchStart(
  occurrences: readonly { seriesId: string; itemKind: string; itemId: string; date: string; original: string }[],
  flowId: string,
  today: string,
): { seriesId: string; start: string } | null {
  const upcoming = occurrences
    .filter(row => row.itemKind === 'flow' && row.itemId === flowId && row.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.original.localeCompare(b.original) || a.seriesId.localeCompare(b.seriesId));
  const next = upcoming[0];
  if (!next) return null;
  return { seriesId: next.seriesId, start: next.original > today ? next.original : next.date };
}

/**
 * How to switch a routine series to the next flow from `start` on without losing what was done.
 * Changing the old series' start date would wipe its past days off the calendar, so the old series is ended
 * the day before and a new one carries on with the same time and repeat. A series with nothing before `start`
 * (or a once-only one) is simply pointed at the new flow.
 */
export function routineSwitchPlan(
  series: FlowSeries,
  start: string,
  nextFlowId: string,
):
  | { kind: 'retarget'; seriesId: string; itemId: string }
  | { kind: 'split'; seriesId: string; endOld: SeriesEnd; create: Pick<FlowSeries, 'itemKind' | 'itemId' | 'start' | 'time' | 'recurrence' | 'end'> } {
  if (series.recurrence.kind === 'once' || series.start >= start) return { kind: 'retarget', seriesId: series.id, itemId: nextFlowId };
  const lastOld = addCalendarDays(start, -1);
  let end: SeriesEnd = series.end;
  if (series.end.kind === 'after') {
    // Occurrences already used up before the switch come off the count, so the routine ends when it would have.
    const used = occurrences([{ ...series, end: { kind: 'on', date: lastOld } }], [], series.start, lastOld).length;
    end = { kind: 'after', count: Math.max(1, series.end.count - used) };
  }
  return {
    kind: 'split',
    seriesId: series.id,
    endOld: { kind: 'on', date: lastOld },
    create: { itemKind: 'flow', itemId: nextFlowId, start, time: series.time, recurrence: series.recurrence, end },
  };
}

export function assessGraduation(
  input: {
    flowId: string;
    items: readonly GraduationItem[];
    sessions: readonly GraduationSession[];
    now?: number;
  },
  catalog: GraduationCatalog = defaultCatalog,
): GraduationResult {
  const now = input.now ?? Date.now();
  const sessions = [...input.sessions]
    .filter(session => {
      const at = stamp(session.finishedAt);
      return at != null && at <= now;
    })
    .sort((a, b) => (stamp(b.finishedAt) ?? 0) - (stamp(a.finishedAt) ?? 0) || b.finishedAt.localeCompare(a.finishedAt));
  const inWindow = sessions.filter(session => {
    const at = stamp(session.finishedAt) ?? 0;
    return at <= now && now - at <= flowWindowMs;
  });
  const readyItems = input.items.filter(item => exerciseIsReady(item, sessions));
  const exercisesReady = [...new Set(readyItems.map(item => item.exerciseId))];
  const ratio = input.items.length === 0 ? 0 : readyItems.length / input.items.length;
  const ready = inWindow.length >= 3 && ratio >= 0.7 - 1e-9;
  const level = levelOf(input.flowId, catalog.flows);
  const next = ready ? nextFlowStep(input.flowId, catalog) : null;
  const variations =
    level === 'Advanced'
      ? exercisesReady.flatMap(exerciseId => {
          const harder = harderVariation(exerciseId);
          const name = exercise(exerciseId)?.name;
          if (!harder || !name) return [];
          return [{ exerciseId, name, nextId: harder.exerciseId, nextName: harder.name }];
        })
      : [];
  return {
    ready,
    exercisesReady,
    next,
    variations,
    reason: reasonFor(ready, readyItems.length, input.items.length, inWindow.length),
  };
}

/** One muted line when some exercises are ready and the flow is not. */
export function weightReadyLine(ids: readonly string[]) {
  const names = ids.map(exerciseId => exercise(exerciseId)?.name ?? exerciseId);
  if (names.length === 0) return '';
  if (names.length === 1) return `Ready to add weight on ${names[0]}`;
  if (names.length === 2) return `Ready to add weight on ${names[0]} and ${names[1]}`;
  return `Ready to add weight on ${names[0]} and ${names.length - 1} more`;
}

function reasonFor(ready: boolean, readyCount: number, total: number, sessions: number) {
  if (ready) return `Top of the range on ${readyCount} of ${total} exercises, ${sessions} sessions running`;
  if (readyCount > 0) return `Top of the range on ${readyCount} of ${total} exercises`;
  if (sessions > 0) {
    const word = sessions === 1 ? 'session' : 'sessions';
    return `${sessions} finished ${word} in the last 6 weeks`;
  }
  return 'Not enough sessions yet';
}
