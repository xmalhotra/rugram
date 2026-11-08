import type { HabitFlow, Product } from './mobile';
import type { FlowCategoryGroup } from './flow-categories';
import { picksForHabit } from './flow-connections';
import { flowMindMap } from './flow-mind-map';

export const daySlots = ['morning', 'workout', 'evening', 'night'] as const;
export type DaySlot = (typeof daySlots)[number];
export const daySlotTitle: Record<DaySlot, string> = {
  morning: 'Morning',
  workout: 'Workout',
  evening: 'Evening',
  night: 'Night',
};

export type FlowStage = 'active' | 'next' | 'resting';
export type FlowWeight = 'daily' | 'regular' | 'light';

export type FlowRoutine = {
  id: string;
  name: string;
  flowIds: string[];
  slot: DaySlot | null;
};

export type FlowHabitState = {
  lastOpened: Record<string, string>;
  position: Record<string, number>;
  slots: Record<string, DaySlot>;
  /** Catalog or personal flow id → where the member sorted it. */
  stages: Record<string, FlowStage>;
  /** When that stage was last chosen. */
  stagedAt: Record<string, string>;
  /** False until existing follows are migrated to Active. */
  seeded: boolean;
  /** Flow id → local date it was pulled into Trying today. */
  tryToday: Record<string, string>;
  /** Auto-rested ids still waiting on the notice. */
  rested: string[];
  /** Flow id → ISO times a run was finished, oldest first. */
  uses: Record<string, string[]>;
  /** Named groups. A flow belongs to at most one. */
  routines: FlowRoutine[];
};

export function emptyFlowHabits(): FlowHabitState {
  return {
    lastOpened: {},
    position: {},
    slots: {},
    stages: {},
    stagedAt: {},
    seeded: false,
    tryToday: {},
    rested: [],
    uses: {},
    routines: [],
  };
}

function isDaySlot(value: unknown): value is DaySlot {
  return value === 'morning' || value === 'workout' || value === 'evening' || value === 'night';
}

function isFlowStage(value: unknown): value is FlowStage {
  return value === 'active' || value === 'next' || value === 'resting';
}

function isIso(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

/** Calendar day `YYYY-MM-DD`, rejecting impossible dates such as 2026-13-40. */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

const dayMs = 86_400_000;
const useWindow = 30 * dayMs;
const useCap = 60;
const useGap = 10 * 60_000;

/** Oldest first, last 30 days, at most 60 timestamps. */
function trimUses(list: readonly string[], now: number) {
  const cutoff = now - useWindow;
  const times = new Map<string, number>();
  for (const iso of list) {
    if (!isIso(iso) || times.has(iso)) continue;
    const time = Date.parse(iso);
    if (time < cutoff || time > now) continue;
    times.set(iso, time);
  }
  return [...times.entries()]
    .sort((left, right) => left[1] - right[1])
    .slice(-useCap)
    .map(([iso]) => iso);
}

function claimRoutineFlows(routines: FlowRoutine[], preferred: ReadonlySet<string>) {
  const ranked = [
    ...routines.filter(routine => preferred.has(routine.id)),
    ...routines.filter(routine => !preferred.has(routine.id)),
  ];
  const claimed = new Set<string>();
  const kept = new Map<string, string[]>();
  for (const routine of ranked) {
    const flowIds: string[] = [];
    for (const id of routine.flowIds) {
      if (claimed.has(id)) continue;
      claimed.add(id);
      flowIds.push(id);
    }
    kept.set(routine.id, flowIds);
  }
  return routines.map(routine => ({ ...routine, flowIds: kept.get(routine.id) ?? [] }));
}

function parseRoutine(value: unknown): FlowRoutine | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id) return undefined;
  if (typeof record.name !== 'string' || !record.name.trim()) return undefined;
  if (!Array.isArray(record.flowIds)) return undefined;
  const flowIds: string[] = [];
  for (const id of record.flowIds) {
    if (typeof id === 'string' && id && !flowIds.includes(id)) flowIds.push(id);
  }
  const slot = record.slot == null ? null : isDaySlot(record.slot) ? record.slot : undefined;
  if (slot === undefined) return undefined;
  return { id: record.id, name: record.name.trim(), flowIds, slot };
}

/** Stored habit JSON. Timestamps, card indexes, day slots, stages, uses, and routines are kept; anything else is dropped. */
export function parseFlowHabits(value: unknown): FlowHabitState {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const lastOpened: Record<string, string> = {};
  const position: Record<string, number> = {};
  const slots: Record<string, DaySlot> = {};
  if (record.lastOpened && typeof record.lastOpened === 'object') {
    for (const [id, iso] of Object.entries(record.lastOpened)) {
      if (typeof iso === 'string' && Number.isFinite(Date.parse(iso))) lastOpened[id] = iso;
    }
  }
  if (record.position && typeof record.position === 'object') {
    for (const [id, index] of Object.entries(record.position)) {
      if (typeof index === 'number' && Number.isInteger(index) && index >= 0) position[id] = index;
    }
  }
  if (record.slots && typeof record.slots === 'object') {
    for (const [id, slot] of Object.entries(record.slots)) {
      if (isDaySlot(slot)) slots[id] = slot;
    }
  }
  const stages: Record<string, FlowStage> = {};
  const stagedAt: Record<string, string> = {};
  const tryToday: Record<string, string> = {};
  if (record.stages && typeof record.stages === 'object') {
    for (const [id, stage] of Object.entries(record.stages)) {
      if (isFlowStage(stage)) stages[id] = stage;
    }
  }
  if (record.stagedAt && typeof record.stagedAt === 'object') {
    for (const [id, iso] of Object.entries(record.stagedAt)) {
      if (isIso(iso)) stagedAt[id] = iso;
    }
  }
  if (record.tryToday && typeof record.tryToday === 'object') {
    for (const [id, day] of Object.entries(record.tryToday)) {
      if (isCalendarDate(day)) tryToday[id] = day;
    }
  }
  const rested: string[] = [];
  if (Array.isArray(record.rested)) {
    for (const id of record.rested) {
      if (typeof id === 'string' && id && !rested.includes(id)) rested.push(id);
    }
  }
  const uses: Record<string, string[]> = {};
  if (record.uses && typeof record.uses === 'object') {
    const now = Date.now();
    for (const [id, list] of Object.entries(record.uses)) {
      if (!Array.isArray(list)) continue;
      const trimmed = trimUses(list.filter((iso): iso is string => typeof iso === 'string'), now);
      if (trimmed.length) uses[id] = trimmed;
    }
  }
  const routines: FlowRoutine[] = [];
  if (Array.isArray(record.routines)) {
    for (const entry of record.routines) {
      const routine = parseRoutine(entry);
      if (routine && !routines.some(item => item.id === routine.id)) routines.push(routine);
    }
  }
  return {
    lastOpened,
    position,
    slots,
    stages,
    stagedAt,
    seeded: record.seeded === true,
    tryToday,
    rested,
    uses,
    routines: claimRoutineFlows(routines, new Set(routines.map(routine => routine.id))),
  };
}

function mergeUses(stored: FlowHabitState['uses'], fresh: FlowHabitState['uses'], now: number) {
  const uses: Record<string, string[]> = {};
  for (const id of new Set([...Object.keys(stored), ...Object.keys(fresh)])) {
    const trimmed = trimUses([...(stored[id] ?? []), ...(fresh[id] ?? [])], now);
    if (trimmed.length) uses[id] = trimmed;
  }
  return uses;
}

function mergeRoutines(stored: FlowRoutine[], fresh: FlowRoutine[]) {
  const byId = new Map(stored.map(routine => [routine.id, routine]));
  for (const routine of fresh) byId.set(routine.id, routine);
  const order: string[] = [];
  for (const routine of [...stored, ...fresh]) {
    if (!order.includes(routine.id)) order.push(routine.id);
  }
  return claimRoutineFlows(
    order.map(id => byId.get(id)!),
    new Set(fresh.map(routine => routine.id)),
  );
}

/** Keep a write that landed before the saved copy finished loading. */
export function mergeFlowHabits(stored: FlowHabitState, fresh: FlowHabitState): FlowHabitState {
  const rested = [...stored.rested];
  for (const id of fresh.rested) if (!rested.includes(id)) rested.push(id);
  return {
    lastOpened: { ...stored.lastOpened, ...fresh.lastOpened },
    position: { ...stored.position, ...fresh.position },
    slots: { ...stored.slots, ...fresh.slots },
    stages: { ...stored.stages, ...fresh.stages },
    stagedAt: { ...stored.stagedAt, ...fresh.stagedAt },
    seeded: stored.seeded || fresh.seeded,
    tryToday: { ...stored.tryToday, ...fresh.tryToday },
    rested,
    uses: mergeUses(stored.uses, fresh.uses, Date.now()),
    routines: mergeRoutines(stored.routines, fresh.routines),
  };
}

/** Record one finished run. A second finish inside ten minutes does not add another use. */
export function appendUse(list: readonly string[] | undefined, iso: string, now: number) {
  const trimmed = trimUses(list ?? [], now);
  const last = trimmed.at(-1);
  if (last && now - Date.parse(last) < useGap) return trimmed;
  if (!isIso(iso)) return trimmed;
  return trimUses([...trimmed, iso], now);
}

/** A finished run is the only thing that counts toward streaks and map weight. */
export function completed(state: FlowHabitState, id: string, iso: string, now: number): FlowHabitState {
  return { ...state, uses: { ...state.uses, [id]: appendUse(state.uses[id], iso, now) } };
}

/** True when a run of this flow was finished on the local calendar day of `now`. */
export function doneToday(state: FlowHabitState, id: string, now: number) {
  const day = localDate(new Date(now));
  return (state.uses[id] ?? []).some(iso => isIso(iso) && localDate(new Date(iso)) === day);
}

const twoWeeks = 14 * 86_400_000;

/** First launch: flows the member already follows become Active. Later calls do nothing. */
export function seedStages(state: FlowHabitState, ids: readonly string[], nowIso: string): FlowHabitState {
  if (state.seeded) return state;
  const stages = { ...state.stages };
  const stagedAt = { ...state.stagedAt };
  for (const id of ids) {
    stages[id] = 'active';
    stagedAt[id] = nowIso;
  }
  return { ...state, stages, stagedAt, seeded: true };
}

/** `'new'` means the flow was added and has not been sorted yet. */
export function flowStage(state: FlowHabitState, id: string): FlowStage | 'new' {
  return state.stages[id] ?? 'new';
}

/** Remember a stage. Starting a flow clears its Trying today mark. */
export function setFlowStage(
  state: FlowHabitState,
  id: string,
  stage: FlowStage,
  nowIso: string,
): FlowHabitState {
  const tryToday = { ...state.tryToday };
  if (stage === 'active') delete tryToday[id];
  return {
    ...state,
    stages: { ...state.stages, [id]: stage },
    stagedAt: { ...state.stagedAt, [id]: nowIso },
    tryToday,
  };
}

/**
 * Active flows whose latest open-or-stage time is 14 days old move to Resting.
 * Flows with no timestamps are left alone. `moved` is the ids appended this pass.
 */
export function autoRest(
  state: FlowHabitState,
  ids: readonly string[],
  now: number,
): { state: FlowHabitState; moved: string[] } {
  const moved: string[] = [];
  for (const id of ids) {
    if (state.stages[id] !== 'active') continue;
    const stamps = [state.lastOpened[id], state.stagedAt[id]].filter(isIso);
    if (!stamps.length) continue;
    const latest = Math.max(...stamps.map(iso => Date.parse(iso)));
    if (now - latest >= twoWeeks) moved.push(id);
  }
  if (!moved.length) return { state, moved };
  const stages = { ...state.stages };
  for (const id of moved) stages[id] = 'resting';
  const rested = [...state.rested];
  for (const id of moved) if (!rested.includes(id)) rested.push(id);
  return { state: { ...state, stages, rested }, moved };
}

export function stageCounts(state: FlowHabitState, ids: readonly string[]) {
  const counts = { active: 0, next: 0, resting: 0, new: 0 };
  for (const id of ids) counts[flowStage(state, id)] += 1;
  return counts;
}

export type TodayEntry = { kind: 'flow'; id: string } | { kind: 'routine'; id: string };

export type TodayGroup = {
  id: DaySlot | 'any' | 'trying';
  title: string;
  items: TodayEntry[];
};

/** Active flows by time of day, then anything pulled in for today that is not active. */
export function todayGroups(
  flowIds: readonly string[],
  state: FlowHabitState,
  todayDate: string,
): TodayGroup[] {
  const buckets: Record<DaySlot | 'any', TodayEntry[]> = {
    morning: [],
    workout: [],
    evening: [],
    night: [],
    any: [],
  };
  const trying: TodayEntry[] = [];
  const tracked = new Set(flowIds);
  const seenRoutines = new Set<string>();
  for (const id of flowIds) {
    const routine = state.routines.find(item => item.flowIds.includes(id));
    if (routine) {
      if (seenRoutines.has(routine.id)) continue;
      seenRoutines.add(routine.id);
      const active = routine.flowIds.some(
        flowId => tracked.has(flowId) && flowStage(state, flowId) === 'active',
      );
      if (!active) continue;
      const slot = isDaySlot(routine.slot) ? routine.slot : 'any';
      buckets[slot].push({ kind: 'routine', id: routine.id });
      continue;
    }
    if (flowStage(state, id) === 'active') {
      const slot = state.slots[id];
      const entry: TodayEntry = { kind: 'flow', id };
      if (isDaySlot(slot)) buckets[slot].push(entry);
      else buckets.any.push(entry);
    } else if (state.tryToday[id] === todayDate) trying.push({ kind: 'flow', id });
  }
  return [
    ...daySlots.map(id => ({ id, title: daySlotTitle[id], items: buckets[id] })),
    { id: 'any' as const, title: 'Any time', items: buckets.any },
    { id: 'trying' as const, title: 'Trying today', items: trying },
  ].filter(group => group.items.length > 0);
}

/** How many recorded uses fall in the rolling window ending at `now`. */
export function usesInDays(state: FlowHabitState, id: string, days: number, now: number) {
  const cutoff = now - days * dayMs;
  return (state.uses[id] ?? []).filter(iso => {
    if (!isIso(iso)) return false;
    const time = Date.parse(iso);
    return time >= cutoff && time <= now;
  }).length;
}

/** Five or more uses in the last week is daily; two or more is regular. */
export function flowWeight(state: FlowHabitState, id: string, now: number): FlowWeight {
  const count = usesInDays(state, id, 7, now);
  if (count >= 5) return 'daily';
  if (count >= 2) return 'regular';
  return 'light';
}

function latestActivity(state: FlowHabitState, id: string) {
  const stamps = [state.lastOpened[id], state.stagedAt[id], ...(state.uses[id] ?? [])];
  let latest: number | null = null;
  for (const iso of stamps) {
    if (!isIso(iso)) continue;
    const time = Date.parse(iso);
    if (latest === null || time > latest) latest = time;
  }
  return latest;
}

/** True when the newest open, stage, or use is at least seven days old. */
export function isStale(state: FlowHabitState, id: string, now: number) {
  const latest = latestActivity(state, id);
  if (latest === null) return false;
  return now - latest >= 7 * dayMs;
}

function calendarDaysUsed(state: FlowHabitState, id: string) {
  const days = new Set<string>();
  for (const iso of state.uses[id] ?? []) {
    if (!isIso(iso)) continue;
    days.add(localDate(new Date(iso)));
  }
  return days;
}

/**
 * A use on each of the last three local days.
 * Today can still be open: yesterday and the two days before it also count.
 */
export function onStreak(state: FlowHabitState, id: string, now: number) {
  const days = calendarDaysUsed(state, id);
  const has = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return days.has(localDate(date));
  };
  return (has(0) && has(-1) && has(-2)) || (has(-1) && has(-2) && has(-3));
}

export function routineOf(state: FlowHabitState, flowId: string) {
  return state.routines.find(routine => routine.flowIds.includes(flowId));
}

/** `id` is `r-` plus the current time in base 36. The flow leaves any routine it was already in. */
export function createRoutine(
  state: FlowHabitState,
  name: string,
  flowIds: readonly string[],
  slot: DaySlot | null,
): FlowHabitState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  const ids: string[] = [];
  for (const id of flowIds) {
    if (typeof id === 'string' && id && !ids.includes(id)) ids.push(id);
  }
  let stamp = Date.now();
  let id = `r-${stamp.toString(36)}`;
  while (state.routines.some(routine => routine.id === id)) {
    stamp += 1;
    id = `r-${stamp.toString(36)}`;
  }
  const routines = state.routines.map(routine => {
    const next = routine.flowIds.filter(flowId => !ids.includes(flowId));
    return next.length === routine.flowIds.length ? routine : { ...routine, flowIds: next };
  });
  return {
    ...state,
    routines: [
      ...routines,
      { id, name: trimmed, flowIds: ids, slot: isDaySlot(slot) ? slot : null },
    ],
  };
}

export function renameRoutine(state: FlowHabitState, routineId: string, name: string): FlowHabitState {
  const trimmed = name.trim();
  if (!trimmed) return state;
  let changed = false;
  const routines = state.routines.map(routine => {
    if (routine.id !== routineId || routine.name === trimmed) return routine;
    changed = true;
    return { ...routine, name: trimmed };
  });
  return changed ? { ...state, routines } : state;
}

/** Removes the routine. Its flows stay in the habit record. */
export function deleteRoutine(state: FlowHabitState, routineId: string): FlowHabitState {
  if (!state.routines.some(routine => routine.id === routineId)) return state;
  return { ...state, routines: state.routines.filter(routine => routine.id !== routineId) };
}

/** Puts the flow in this routine and takes it out of every other one. */
export function addToRoutine(state: FlowHabitState, routineId: string, flowId: string): FlowHabitState {
  if (!flowId || !state.routines.some(routine => routine.id === routineId)) return state;
  if (routineOf(state, flowId)?.id === routineId) return state;
  return {
    ...state,
    routines: state.routines.map(routine => {
      if (routine.id === routineId) return { ...routine, flowIds: [...routine.flowIds, flowId] };
      if (!routine.flowIds.includes(flowId)) return routine;
      return { ...routine, flowIds: routine.flowIds.filter(id => id !== flowId) };
    }),
  };
}

export function removeFromRoutine(
  state: FlowHabitState,
  routineId: string,
  flowId: string,
): FlowHabitState {
  if (!state.routines.some(routine => routine.id === routineId && routine.flowIds.includes(flowId))) {
    return state;
  }
  return {
    ...state,
    routines: state.routines.map(routine =>
      routine.id === routineId
        ? { ...routine, flowIds: routine.flowIds.filter(id => id !== flowId) }
        : routine,
    ),
  };
}

/** `YYYY-MM-DD` in the device's local timezone. */
export function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Counts per branch, e.g. "3 Fitness · 1 Tech · 1 Lifestyle". */
export function branchSummary(branches: readonly { title: string; count: number }[]) {
  return branches
    .filter(branch => branch.count > 0)
    .map(branch => `${branch.count} ${branch.title}`)
    .join(' · ');
}

/** Morning, Workout, Evening, Night, then Unscheduled. Empty branches are omitted. */
export function dayBranches(
  flows: readonly { id: string }[],
  slots: Readonly<Record<string, DaySlot | undefined>>,
) {
  const buckets: Record<DaySlot | 'unscheduled', string[]> = {
    morning: [],
    workout: [],
    evening: [],
    night: [],
    unscheduled: [],
  };
  for (const flow of flows) {
    const slot = slots[flow.id];
    if (isDaySlot(slot)) buckets[slot].push(flow.id);
    else buckets.unscheduled.push(flow.id);
  }
  return [
    ...daySlots.map(id => ({ id, title: daySlotTitle[id], flowIds: buckets[id] })),
    { id: 'unscheduled' as const, title: 'Unscheduled', flowIds: buckets.unscheduled },
  ].filter(branch => branch.flowIds.length > 0);
}

/** "· today", "· 3d ago", or "· not opened yet". */
export function openedLabel(iso: string | undefined, now: number) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return '· not opened yet';
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return '· today';
  return `· ${days}d ago`;
}

export function notOpenedInTwoWeeks(iso: string | undefined, now: number) {
  if (!iso || !Number.isFinite(Date.parse(iso))) return false;
  return now - Date.parse(iso) >= 14 * 86_400_000;
}

export function openedWhen(iso: string, now: number) {
  const elapsed = Math.max(0, now - Date.parse(iso));
  if (!Number.isFinite(elapsed)) return 'opened just now';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'opened just now';
  if (minutes < 60) return `opened ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `opened ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `opened ${days}d ago`;
}

/** "Card N of M · opened 2h ago", or only the opened time when the card position is unknown. */
export function continueDetail(
  position: number | undefined,
  total: number,
  iso: string,
  now: number,
) {
  const when = openedWhen(iso, now);
  if (position == null || total < 1) return when;
  const card = Math.min(total, Math.max(1, position + 1));
  return `Card ${card} of ${total} · ${when}`;
}

export function recentFlowIds(lastOpened: Readonly<Record<string, string>>, limit = 2) {
  return Object.entries(lastOpened)
    .filter(([, iso]) => Number.isFinite(Date.parse(iso)))
    .sort((left, right) => Date.parse(right[1]) - Date.parse(left[1]))
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Up to two flows from category groups the member has not added anything to.
 * Each suggestion is the first catalogue flow in that group.
 */
export function gapSuggestions(
  groups: readonly FlowCategoryGroup[],
  added: readonly HabitFlow[],
  catalogue: readonly HabitFlow[],
  focuses: readonly { id: string; flowIds: readonly string[] }[],
) {
  const filled = new Set(flowMindMap(added, groups, focuses).map(branch => branch.id));
  const addedIds = new Set(added.map(flow => flow.id));
  const suggestions: { title: string; flow: HabitFlow }[] = [];
  for (const group of groups) {
    if (filled.has(group.id)) continue;
    let pick: HabitFlow | undefined;
    for (const focusId of group.focusIds) {
      const focus = focuses.find(item => item.id === focusId);
      for (const id of focus?.flowIds ?? []) {
        if (addedIds.has(id)) continue;
        const flow = catalogue.find(item => item.id === id);
        if (flow) {
          pick = flow;
          break;
        }
      }
      if (pick) break;
    }
    if (!pick) continue;
    suggestions.push({ title: group.title, flow: pick });
    if (suggestions.length === 2) break;
  }
  return suggestions;
}

/** Products a flow points at, via its story cards and step pick contexts. At most `limit`. */
export function flowPicks(flow: HabitFlow, products: readonly Product[], limit = 3) {
  const published = products.filter(product => product.status === 'published');
  const byId = new Map(published.map(product => [product.id, product]));
  const chosen: Product[] = [];
  const seen = new Set<string>();
  const add = (product: Product | undefined) => {
    if (!product || seen.has(product.id) || chosen.length >= limit) return;
    seen.add(product.id);
    chosen.push(product);
  };
  for (const card of flow.storyCards ?? []) {
    if (card.targetKind === 'pick') add(byId.get(card.targetId));
  }
  const useCases = [
    ...new Set(flow.steps.flatMap(step => (step.pickContext ? [step.pickContext.useCase] : []))),
  ];
  for (const useCase of useCases) {
    for (const product of picksForHabit([...published], useCase)) add(product);
  }
  return chosen;
}
