/**
 * Next week's routine changes, from this week's Body flow.
 * Nothing here writes a series. A suggestion is either a one-week exception,
 * a once-only series, or a note that a flow stays. A Customflow is never edited,
 * a day the member already moved is left where they put it, and a series whose
 * clock time they set is not rescheduled.
 */
import type { FlowGoal, FlowLevel, TrainPlace } from './flow-defaults';
import { placeCanDo } from './flow-defaults';
import { addCalendarDays, calendarWeekday, inclusiveSpan, type FlowSeries, type SeriesCompletion, type SeriesOccurrence, type SeriesTime } from './flow-series';
import { focusLevelFor } from './member-level';
import { largeMuscleArea, targetBand } from './focus-targets';
import { muscleAreas, type MuscleArea } from './muscle-map';

export type FocusFlow = {
  id: string;
  title: string;
  itemKind: 'flow' | 'session';
  level: FlowLevel;
  goals: FlowGoal[];
  equipment: TrainPlace;
  minutes: number;
  /** Main sets this flow adds, by muscle area. */
  main: { area: MuscleArea; sets: number }[];
  /** Set when the flow is cardio and does not add hard sets. */
  cardioMinutes?: number;
  live: boolean;
};

export type FocusChange =
  | { type: 'once'; itemKind: 'flow' | 'session'; itemId: string; date: string; time: SeriesTime }
  | { type: 'move'; seriesId: string; from: string; to: string }
  | {
      type: 'replace';
      seriesId: string;
      from: string;
      itemKind: 'flow' | 'session';
      itemId: string;
      date: string;
      time: SeriesTime;
    }
  | { type: 'keep' };

export type FocusSuggestion = {
  id: string;
  kind: 'add' | 'replace' | 'move' | 'missed' | 'keep';
  /** The day the suggestion lands on. */
  day: string;
  reason: string;
  title: string;
  change: FocusChange;
};

export type FocusPlanInput = {
  /** Any date in the week being reviewed. Planning is for the following week. */
  weekStart: string;
  today: string;
  bodyFlow: {
    areas: { area: MuscleArea; sets: number; mainSets: number }[];
    cardioMinutes?: number;
  };
  series: FlowSeries[];
  /** Occurrences from the reviewed week through the end of next week. */
  occurrences: SeriesOccurrence[];
  completions: SeriesCompletion[];
  graduations: { flowId: string; nextId: string; nextTitle: string }[];
  member: {
    level: FlowLevel;
    place?: TrainPlace;
    minutes?: number;
    goals?: FlowGoal[];
    /** Areas the member asked for. A gap until the top of the band, not the low end. */
    priorities?: readonly MuscleArea[];
  };
  flows: FocusFlow[];
  /** Source ids the member has edited. Those flows are not replaced. */
  customIds?: readonly string[];
  /** Series whose clock time the member set. They are not moved or replaced. */
  timedSeriesIds?: readonly string[];
};

const levelRank: Record<FlowLevel, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const cardioTarget = 150;
const recoverySets = 4;
const frequencyTarget = 2;

const regions: { name: string; areas: MuscleArea[] }[] = [
  { name: 'Legs', areas: ['quads', 'hamstrings', 'glutes', 'calves', 'hip-flexors'] },
  { name: 'Back', areas: ['lats', 'mid-back', 'lower-back', 'traps'] },
  { name: 'Chest', areas: ['chest', 'upper-chest'] },
  { name: 'Shoulders', areas: ['front-delts', 'side-delts', 'rear-delts'] },
  { name: 'Arms', areas: ['biceps', 'triceps'] },
  { name: 'Core', areas: ['upper-abs', 'lower-abs', 'obliques'] },
];

type Gap = {
  name: string;
  had: number;
  low: number;
  area: MuscleArea;
  areas: MuscleArea[];
  empty: MuscleArea[];
  zeros: number;
  sum: number;
  /** Set when the member marked this area. The reason is "{name} are a priority." */
  priority?: boolean;
};

function mondayOf(iso: string) {
  return addCalendarDays(iso, 1 - calendarWeekday(iso));
}

function dayDiff(a: string, b: string) {
  const span = inclusiveSpan(a < b ? a : b, a < b ? b : a);
  return span == null ? 99 : span - 1;
}

function countText(value: number) {
  if (Number.isInteger(value)) return String(value);
  const halves = Math.round(value * 2);
  const whole = Math.floor(halves / 2);
  const fraction = halves % 2 === 0 ? '' : '½';
  if (Math.abs(halves / 2 - value) < 0.05) return `${whole || ''}${fraction}` || '0';
  return String(Math.round(value * 10) / 10).replace('.', '·');
}

function areaTitle(area: MuscleArea) {
  return muscleAreas.find(item => item.id === area)?.title ?? area;
}

function regionOf(area: MuscleArea) {
  return regions.find(region => region.areas.includes(area))?.name ?? areaTitle(area);
}

function setsWord(value: number) {
  return value === 1 ? 'set' : 'sets';
}

function needWord(name: string) {
  return name.endsWith('s') ? 'need' : 'needs';
}

function flowOf(flows: readonly FocusFlow[], id: string) {
  return flows.find(flow => flow.id === id) ?? null;
}

function mainOn(flow: FocusFlow | null, area: MuscleArea) {
  return flow?.main.find(row => row.area === area)?.sets ?? 0;
}

function mainIn(flow: FocusFlow | null, areas: readonly MuscleArea[]) {
  if (!flow) return 0;
  return areas.reduce((sum, area) => sum + mainOn(flow, area), 0);
}

function scheduledIds(occurrences: readonly SeriesOccurrence[]) {
  return new Set(occurrences.map(row => row.itemId));
}

function canRun(flow: FocusFlow, member: FocusPlanInput['member'], already: ReadonlySet<string>) {
  if (!flow.live) return false;
  if (levelRank[flow.level] < levelRank[member.level]) return false;
  if (member.place && !placeCanDo(flow.equipment, member.place)) return false;
  // A second session of a flow they already do can ignore a goal tag. Place and level still apply.
  if (member.goals?.length && flow.goals.length && !flow.goals.some(goal => member.goals?.includes(goal)) && !already.has(flow.id))
    return false;
  return true;
}

function checkpointFor(series: readonly FlowSeries[], copy?: SeriesTime): SeriesTime {
  if (copy) return { checkpoint: copy.checkpoint, ...(copy.at ? { at: copy.at } : {}) };
  const found = series[0];
  return { checkpoint: found?.time.checkpoint ?? 'Morning' };
}

function gapsFor(input: FocusPlanInput, level: ReturnType<typeof focusLevelFor>): Gap[] {
  const rows: Gap[] = [];
  for (const region of regions) {
    const large = region.areas.filter(area => largeMuscleArea(area));
    if (!large.length) continue;
    const measured = large.map(area => {
      const found = input.bodyFlow.areas.find(row => row.area === area);
      return { area, sets: found?.sets ?? 0, low: targetBand(area, level).low };
    });
    if (measured.some(row => row.sets >= row.low)) continue;
    const worst = measured.reduce((best, row) => (row.sets < best.sets ? row : best));
    const best = measured.reduce((top, row) => (row.sets > top.sets ? row : top));
    const empty = measured.filter(row => row.sets <= 0).map(row => row.area);
    const sum = measured.reduce((total, row) => total + row.sets, 0);
    // Untouched, or every area equally short: the region is the name ("Legs had 0 sets").
    const name = empty.length || worst.sets === best.sets ? region.name : areaTitle(worst.area);
    rows.push({
      name,
      had: empty.length ? 0 : worst.sets,
      low: worst.low,
      area: worst.area,
      areas: region.areas,
      empty,
      zeros: empty.length,
      sum,
    });
  }
  return rows.sort((a, b) => b.zeros - a.zeros || a.sum - b.sum || a.name.localeCompare(b.name));
}

/** A priority stays short until it reaches the top of its band, including a small area. */
function priorityGaps(input: FocusPlanInput, level: ReturnType<typeof focusLevelFor>): Gap[] {
  const rows: Gap[] = [];
  const seen = new Set<MuscleArea>();
  for (const area of input.member.priorities ?? []) {
    if (seen.has(area)) continue;
    seen.add(area);
    const found = input.bodyFlow.areas.find(row => row.area === area);
    const sets = found?.sets ?? 0;
    const band = targetBand(area, level);
    if (sets >= band.high) continue;
    rows.push({
      name: areaTitle(area),
      had: sets,
      low: band.high,
      area,
      areas: [area],
      empty: sets <= 0 ? [area] : [],
      zeros: sets <= 0 ? 1 : 0,
      sum: sets,
      priority: true,
    });
  }
  return rows;
}

function covers(flow: FocusFlow | null, areas: readonly MuscleArea[]) {
  return mainIn(flow, areas) > 0;
}

function primaryRegion(flow: FocusFlow | null) {
  if (!flow) return null;
  let best: { name: string; sets: number } | null = null;
  for (const region of regions) {
    const sets = mainIn(flow, region.areas);
    if (!best || sets > best.sets) best = { name: region.name, sets };
  }
  return best && best.sets > 0 ? best.name : null;
}

function onTarget(flow: FocusFlow | null, gaps: readonly Gap[], cardioShort: boolean) {
  if (!flow) return false;
  if ((flow.cardioMinutes ?? 0) > 0 && flow.main.every(row => row.sets <= 0)) return !cardioShort;
  const region = regions.find(item => item.name === primaryRegion(flow));
  if (!region) return false;
  return !gaps.some(gap => gap.areas.some(area => region.areas.includes(area)));
}

function sentence(name: string, had: number, first: boolean) {
  if (name === 'Cardio') {
    const text = `${countText(had)} of ${cardioTarget} minutes`;
    return first ? `First week, cardio had ${text}.` : `Cardio had ${text}.`;
  }
  const text = `${countText(had)} ${setsWord(had)}`;
  return first ? `First week, ${name.toLowerCase()} had ${text}.` : `${name} had ${text} this week.`;
}

function onceChange(flow: FocusFlow, date: string, series: readonly FlowSeries[], time?: SeriesTime): FocusChange {
  return {
    type: 'once',
    itemKind: flow.itemKind,
    itemId: flow.id,
    date,
    time: checkpointFor(series, time),
  };
}

/**
 * Up to five changes for the week after `weekStart`.
 * Order is the week's days, so the member can read Monday through Sunday.
 */
export function planNextWeek(input: FocusPlanInput): FocusSuggestion[] {
  const weekStart = mondayOf(input.weekStart);
  const weekEnd = addCalendarDays(weekStart, 6);
  const nextStart = addCalendarDays(weekStart, 7);
  const nextEnd = addCalendarDays(nextStart, 6);
  const level = focusLevelFor(input.member.level);
  const trained =
    input.bodyFlow.areas.some(area => area.sets > 0 || area.mainSets > 0) ||
    input.completions.some(row => row.date >= weekStart && row.date <= weekEnd) ||
    (input.bodyFlow.cardioMinutes ?? 0) > 0;
  if (!trained) return [];

  const firstWeek = !input.completions.some(row => row.date < weekStart);
  const custom = new Set(input.customIds ?? []);
  const timed = new Set(input.timedSeriesIds ?? []);
  const seriesById = new Map(input.series.map(series => [series.id, series]));
  const thisWeek = input.occurrences.filter(row => row.date >= weekStart && row.date <= weekEnd);
  const nextWeek = input.occurrences.filter(row => row.date >= nextStart && row.date <= nextEnd);
  const already = scheduledIds(nextWeek);
  const runnable = input.flows.filter(flow => canRun(flow, input.member, already));
  const gaps = [...gapsFor(input, level), ...priorityGaps(input, level)];
  const cardioHad = input.bodyFlow.cardioMinutes ?? 0;
  const cardioShort = cardioHad < cardioTarget;

  const occupied = new Set(nextWeek.map(row => row.date));
  const suggestions: FocusSuggestion[] = [];
  const handled = new Set<string>();

  function locked(row: SeriesOccurrence) {
    return row.moved || timed.has(row.seriesId);
  }

  function titleOf(id: string) {
    return flowOf(input.flows, id)?.title ?? id;
  }

  function take(row: SeriesOccurrence) {
    handled.add(`${row.seriesId}:${row.original}`);
  }

  function freeDays() {
    const days: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      const date = addCalendarDays(nextStart, index);
      if (!occupied.has(date)) days.push(date);
    }
    return days;
  }

  function trainingWeekdays() {
    const days = new Set<number>();
    for (const row of nextWeek) {
      const flow = flowOf(input.flows, row.itemId);
      if (flow && flow.main.length === 0 && (flow.cardioMinutes ?? 0) > 0) continue;
      days.add(calendarWeekday(row.date));
    }
    return [...days].sort((a, b) => a - b);
  }

  function pickDay(areas: readonly MuscleArea[], prefer: 'cadence' | 'earliest') {
    const heavy = new Set<string>();
    if (areas.length) {
      for (const row of nextWeek) {
        const flow = flowOf(input.flows, row.itemId);
        if (areas.some(area => mainOn(flow, area) >= recoverySets)) heavy.add(row.date);
      }
    }
    const free = freeDays();
    const spaced = free.filter(date => [...heavy].every(day => dayDiff(date, day) >= 2));
    const pool = (spaced.length ? spaced : free).filter(date => calendarWeekday(date) !== 7);
    const choices = pool.length ? pool : spaced.length ? spaced : free;
    if (!choices.length) return null;
    if (prefer === 'earliest') return [...choices].sort((a, b) => a.localeCompare(b))[0] ?? null;
    const used = trainingWeekdays();
    const open = choices.map(date => calendarWeekday(date));
    const gap = used.length > 1 ? used[1]! - used[0]! : 2;
    const forward = used.length ? used[used.length - 1]! + gap : 1;
    const back = used.length ? used[0]! - gap : 0;
    const wanted = [forward, back].find(day => day >= 1 && day <= 6 && open.includes(day as 1 | 2 | 3 | 4 | 5 | 6 | 7));
    if (wanted) return choices.find(date => calendarWeekday(date) === wanted) ?? choices[0] ?? null;
    return [...choices].sort((a, b) => a.localeCompare(b))[0] ?? null;
  }

  function pickFlow(areas: readonly MuscleArea[], cardio: boolean) {
    const ranked = runnable
      .filter(flow => (cardio ? (flow.cardioMinutes ?? 0) > 0 : mainIn(flow, areas) > 0))
      .map(flow => {
        const distance = levelRank[flow.level] - levelRank[input.member.level];
        const over = input.member.minutes != null && flow.minutes > input.member.minutes ? 1 : 0;
        const sets = cardio ? (flow.cardioMinutes ?? 0) : mainIn(flow, areas);
        return { flow, distance: distance < 0 ? 9 : distance, over, sets };
      })
      .sort((a, b) => a.distance - b.distance || a.over - b.over || b.sets - a.sets || a.flow.title.localeCompare(b.flow.title));
    return ranked[0]?.flow ?? null;
  }

  // Recovery first: two days in a row with 4 or more main sets on one area.
  const byDate = new Map<string, SeriesOccurrence[]>();
  for (const row of nextWeek) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }
  for (let index = 0; index < 6; index += 1) {
    const left = addCalendarDays(nextStart, index);
    const right = addCalendarDays(left, 1);
    const leftRows = byDate.get(left) ?? [];
    const rightRows = byDate.get(right) ?? [];
    if (!leftRows.length || !rightRows.length) continue;
    const areas = new Set<MuscleArea>([...leftRows, ...rightRows].flatMap(row => flowOf(input.flows, row.itemId)?.main.map(item => item.area) ?? []));
    for (const area of areas) {
      const leftSets = leftRows.reduce((sum, row) => sum + mainOn(flowOf(input.flows, row.itemId), area), 0);
      const rightSets = rightRows.reduce((sum, row) => sum + mainOn(flowOf(input.flows, row.itemId), area), 0);
      if (leftSets < recoverySets || rightSets < recoverySets) continue;
      const contributors = [...leftRows, ...rightRows].filter(row => mainOn(flowOf(input.flows, row.itemId), area) > 0 && !handled.has(`${row.seriesId}:${row.original}`));
      const movable = contributors
        .filter(row => !locked(row))
        .sort((a, b) => (seriesById.get(b.seriesId)?.createdAt ?? '').localeCompare(seriesById.get(a.seriesId)?.createdAt ?? ''));
      const source = movable[0];
      if (!source) continue;
      const keptDate = source.date === left ? right : left;
      const heavyDates = [...byDate.entries()]
        .filter(([, rows]) => rows.reduce((sum, row) => sum + mainOn(flowOf(input.flows, row.itemId), area), 0) >= recoverySets)
        .map(([date]) => date)
        .filter(date => date !== source.date);
      const destination = freeDays()
        .filter(date => dayDiff(date, keptDate) >= 2 && heavyDates.every(day => dayDiff(date, day) >= 2))
        .sort((a, b) => {
          const before = (a < source.date ? 0 : 1) - (b < source.date ? 0 : 1);
          if (before) return before;
          if (a < source.date && b < source.date) return b.localeCompare(a);
          return a.localeCompare(b);
        })[0];
      if (!destination) continue;
      const name = regionOf(area);
      suggestions.push({
        id: `move:${source.seriesId}:${source.original}`,
        kind: 'move',
        day: destination,
        reason: `${name} ${needWord(name)} 48 hours.`,
        title: titleOf(source.itemId),
        change: { type: 'move', seriesId: source.seriesId, from: source.original, to: destination },
      });
      take(source);
      occupied.delete(source.date);
      if ((byDate.get(source.date) ?? []).some(row => row.seriesId !== source.seriesId)) occupied.add(source.date);
      occupied.add(destination);
      break;
    }
  }

  // A session that was not done, offered on the first free day.
  const missed = thisWeek
    .filter(row => row.status === 'open' && !locked(row) && !handled.has(`${row.seriesId}:${row.original}`))
    .filter(row => row.date < input.today || (row.date === input.today && calendarWeekday(input.today) === 7))
    .sort((a, b) => a.date.localeCompare(b.date) || a.seriesId.localeCompare(b.seriesId));
  for (const row of missed) {
    const day = pickDay([], 'earliest');
    if (!day) break;
    suggestions.push({
      id: `missed:${row.seriesId}:${row.original}`,
      kind: 'missed',
      day,
      reason: `You missed ${titleOf(row.itemId)}.`,
      title: titleOf(row.itemId),
      change: { type: 'move', seriesId: row.seriesId, from: row.original, to: day },
    });
    occupied.add(day);
    take(row);
  }

  const addLimit = firstWeek ? 1 : 2;
  let adds = 0;
  const hits = (areas: readonly MuscleArea[]) => nextWeek.some(row => covers(flowOf(input.flows, row.itemId), areas));
  const plannedDays = (areas: readonly MuscleArea[]) =>
    new Set(nextWeek.filter(row => covers(flowOf(input.flows, row.itemId), areas)).map(row => row.date)).size;
  const plannedOn = (area: MuscleArea) => nextWeek.reduce((sum, row) => sum + mainOn(flowOf(input.flows, row.itemId), area), 0);

  for (const gap of gaps) {
    if (adds >= addLimit) break;
    const focus = gap.empty.length ? gap.empty : [gap.area];
    const days = plannedDays(focus);
    const untouched = !hits(focus);
    const thin = gap.priority
      ? !firstWeek && days > 0 && days < frequencyTarget && plannedOn(gap.area) < targetBand(gap.area, level).high
      : !firstWeek &&
        days > 0 &&
        days < frequencyTarget &&
        gap.areas.some(area => largeMuscleArea(area) && plannedOn(area) < targetBand(area, level).low);
    if (!untouched && !thin) continue;
    const flow = pickFlow(focus, false);
    const day = flow ? pickDay(focus, 'cadence') : null;
    if (!flow || !day) continue;
    suggestions.push({
      id: `add:${gap.name}:${day}`,
      kind: 'add',
      day,
      reason: gap.priority
        ? `${gap.name} are a priority.`
        : thin
          ? `${gap.name} ${needWord(gap.name)} a second day.`
          : sentence(gap.name, gap.had, firstWeek),
      title: flow.title,
      change: onceChange(flow, day, input.series),
    });
    occupied.add(day);
    adds += 1;
  }

  if (adds < addLimit && cardioShort) {
    const plannedCardio = nextWeek.reduce((sum, row) => sum + (flowOf(input.flows, row.itemId)?.cardioMinutes ?? 0), 0);
    if (plannedCardio < cardioTarget) {
      const flow = pickFlow([], true);
      const day = flow ? pickDay([], 'cadence') : null;
      if (flow && day) {
        suggestions.push({
          id: `add:cardio:${day}`,
          kind: 'add',
          day,
          reason: sentence('Cardio', cardioHad, firstWeek),
          title: flow.title,
          change: onceChange(flow, day, input.series),
        });
        occupied.add(day);
        adds += 1;
      }
    }
  }

  // Replace a planned flow with its next step, a harder week of the same work, or a flow that covers a gap better.
  let replaces = 0;
  const replaceLimit = firstWeek ? 1 : 2;
  const ordered = [...nextWeek].sort((a, b) => a.date.localeCompare(b.date) || a.seriesId.localeCompare(b.seriesId));
  for (const row of ordered) {
    if (replaces >= replaceLimit) break;
    if (locked(row) || custom.has(row.itemId) || handled.has(`${row.seriesId}:${row.original}`)) continue;
    const current = flowOf(input.flows, row.itemId);
    if (!current) continue;
    const graduated = input.graduations.find(item => item.flowId === row.itemId);
    const nextFlow = graduated ? runnable.find(flow => flow.id === graduated.nextId) : undefined;
    if (graduated && nextFlow) {
      suggestions.push({
        id: `replace:${row.seriesId}:${row.original}`,
        kind: 'replace',
        day: row.date,
        reason: `You've outgrown ${current.title}.`,
        title: nextFlow.title,
        change: {
          type: 'replace',
          seriesId: row.seriesId,
          from: row.original,
          itemKind: nextFlow.itemKind,
          itemId: nextFlow.id,
          date: row.date,
          time: checkpointFor(input.series, row.time),
        },
      });
      take(row);
      replaces += 1;
      continue;
    }
    const weeks = new Set(
      input.completions
        .filter(item => item.itemId === row.itemId && item.date < nextStart)
        .map(item => mondayOf(item.date)),
    ).size;
    if (weeks >= 3) {
      const region = regions.find(item => item.name === primaryRegion(current));
      const rotated = region
        ? runnable
            .filter(flow => flow.id !== current.id && flow.level === current.level && mainIn(flow, region.areas) > 0)
            .sort(
              (a, b) =>
                Math.abs(mainIn(a, region.areas) - mainIn(current, region.areas)) -
                  Math.abs(mainIn(b, region.areas) - mainIn(current, region.areas)) || a.title.localeCompare(b.title),
            )[0]
        : undefined;
      if (rotated) {
        suggestions.push({
          id: `replace:${row.seriesId}:${row.original}`,
          kind: 'replace',
          day: row.date,
          reason: `${current.title} has used the same exercises for 3 weeks.`,
          title: rotated.title,
          change: {
            type: 'replace',
            seriesId: row.seriesId,
            from: row.original,
            itemKind: rotated.itemKind,
            itemId: rotated.id,
            date: row.date,
            time: checkpointFor(input.series, row.time),
          },
        });
        take(row);
        replaces += 1;
        continue;
      }
    }
    const short = gaps.find(gap => {
      if (!covers(current, gap.areas)) return false;
      if (gap.priority) return mainOn(current, gap.area) < targetBand(gap.area, level).high;
      return largeMuscleArea(gap.area) && mainOn(current, gap.area) < targetBand(gap.area, level).low;
    });
    if (!short) continue;
    const better = runnable
      .filter(flow => flow.id !== current.id && mainOn(flow, short.area) > mainOn(current, short.area))
      .filter(flow => current.main.every(row => row.sets <= 0 || mainOn(flow, row.area) >= row.sets))
      .sort((a, b) => mainOn(b, short.area) - mainOn(a, short.area) || a.title.localeCompare(b.title))[0];
    if (!better) continue;
    suggestions.push({
      id: `replace:${row.seriesId}:${row.original}`,
      kind: 'replace',
      day: row.date,
      reason: short.priority ? `${short.name} are a priority.` : sentence(short.name, short.had, firstWeek),
      title: better.title,
      change: {
        type: 'replace',
        seriesId: row.seriesId,
        from: row.original,
        itemKind: better.itemKind,
        itemId: better.id,
        date: row.date,
        time: checkpointFor(input.series, row.time),
      },
    });
    take(row);
    replaces += 1;
  }

  for (const row of ordered) {
    if (handled.has(`${row.seriesId}:${row.original}`)) continue;
    const flow = flowOf(input.flows, row.itemId);
    const steady = onTarget(flow, gaps, cardioShort);
    suggestions.push({
      id: `keep:${row.seriesId}:${row.original}`,
      kind: 'keep',
      day: row.date,
      reason: steady ? 'On target.' : 'Left as you set it.',
      title: titleOf(row.itemId),
      change: { type: 'keep' },
    });
  }

  const rank = { move: 0, missed: 1, add: 2, replace: 3, keep: 4 };
  const keeps = suggestions.filter(item => item.kind === 'keep');
  const actions = suggestions.filter(item => item.kind !== 'keep');
  const onTargetKeeps = keeps.filter(item => item.reason === 'On target.');
  const otherKeeps = keeps.filter(item => item.reason !== 'On target.');
  const chosen = [...actions, ...onTargetKeeps, ...otherKeeps].slice(0, 5);
  return chosen.sort((a, b) => a.day.localeCompare(b.day) || rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id));
}

export type FocusDayLine = { date: string; before: string; after: string; line: string };

export type FocusPlanView = {
  weekStart: string;
  nextWeekStart: string;
  today: string;
  done: number;
  planned: number;
  plannedDays: { date: string; title: string; done: boolean }[];
  areas: { area: MuscleArea; shade: number }[];
  suggestions: FocusSuggestion[];
  appliedIds: string[];
  next: { date: string; title: string; seriesId: string; original: string }[];
};

/** Before and after for each day of next week, using the suggestions still switched on. */
export function focusDayLines(input: {
  nextWeekStart: string;
  next: readonly { date: string; title: string; seriesId: string; original: string }[];
  suggestions: readonly FocusSuggestion[];
  enabled: readonly string[];
}): FocusDayLine[] {
  const on = new Set(input.enabled);
  const days = Array.from({ length: 7 }, (_, index) => addCalendarDays(input.nextWeekStart, index));
  const titles = new Map<string, string[]>(days.map(date => [date, []]));
  for (const row of input.next) titles.get(row.date)?.push(row.title);
  const after = new Map<string, string[]>(days.map(date => [date, [...(titles.get(date) ?? [])]]));
  function drop(seriesId: string, original: string) {
    const row = input.next.find(item => item.seriesId === seriesId && item.original === original);
    if (!row) return;
    const list = after.get(row.date);
    if (!list) return;
    const index = list.indexOf(row.title);
    if (index >= 0) list.splice(index, 1);
  }
  for (const item of input.suggestions) {
    if (!on.has(item.id)) continue;
    const change = item.change;
    if (change.type === 'once') after.get(change.date)?.push(item.title);
    if (change.type === 'move') {
      drop(change.seriesId, change.from);
      after.get(change.to)?.push(item.title);
    }
    if (change.type === 'replace') {
      drop(change.seriesId, change.from);
      after.get(change.date)?.push(item.title);
    }
  }
  return days.map(date => {
    const before = titles.get(date)?.join(', ') || 'Rest';
    const next = after.get(date)?.filter(Boolean).join(', ') || 'Rest';
    return { date, before, after: next, line: `${weekday[calendarWeekday(date) - 1]}: ${before} → ${next}` };
  });
}
