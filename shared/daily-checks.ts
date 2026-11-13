/** Daily check-ins: routines a person picked, ticked per serving on this device. */
import { routineCheckpoints, type RoutineCheckpoint } from './routines';

export type DailyCheckpoint = RoutineCheckpoint | 'anytime';

export type DailyItem = {
  id: string;
  name: string;
  timesPerDay: number;
  /** Missing on data saved before checkpoints existed. Those show under Anytime. */
  checkpoint?: DailyCheckpoint;
  routineId?: string;
};

export type DailyChecks = {
  items: DailyItem[];
  /** Local date → item id → servings ticked that day. */
  ticks: Record<string, Record<string, number>>;
};

const maxTimes = 6;
const keptDays = 14;
/** iOS SecureStore rejects a value at 2048 bytes. Chunks stay under that. */
export const secureStoreByteLimit = 2048;

const checkpointNames = new Set<string>(routineCheckpoints);

export function emptyDailyChecks(): DailyChecks {
  return { items: [], ticks: {} };
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function cleanCheckpoint(value: unknown): DailyCheckpoint | undefined {
  if (value === 'anytime') return 'anytime';
  if (typeof value === 'string' && checkpointNames.has(value)) return value as RoutineCheckpoint;
  return undefined;
}

/** Stored JSON, ignoring anything that isn't an item or a tick count. */
export function parseDailyChecks(value: unknown): DailyChecks {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const items = Array.isArray(record.items)
    ? record.items.flatMap(item => {
        const { id, name, timesPerDay, checkpoint, routineId } = (item ?? {}) as Partial<DailyItem>;
        if (typeof id !== 'string' || typeof name !== 'string' || !Number.isInteger(timesPerDay)) return [];
        const parsed: DailyItem = { id, name, timesPerDay: clampTimes(timesPerDay as number) };
        const slot = cleanCheckpoint(checkpoint);
        if (slot) parsed.checkpoint = slot;
        if (typeof routineId === 'string' && routineId) parsed.routineId = routineId.slice(0, 80);
        return [parsed];
      })
    : [];
  const ticks: DailyChecks['ticks'] = {};
  if (record.ticks && typeof record.ticks === 'object') {
    for (const [day, counts] of Object.entries(record.ticks)) {
      if (!counts || typeof counts !== 'object') continue;
      ticks[day] = {};
      for (const [id, count] of Object.entries(counts))
        if (typeof count === 'number' && Number.isInteger(count) && count > 0) ticks[day][id] = count;
    }
  }
  return { items, ticks };
}

export function clampTimes(times: number) {
  return Math.min(maxTimes, Math.max(1, Math.round(times)));
}

export function dailySlot(item: DailyItem): DailyCheckpoint {
  return item.checkpoint ?? 'anytime';
}

function sameSlot(item: DailyItem, name: string, checkpoint: DailyCheckpoint | undefined, routineId?: string) {
  if (dailySlot(item) !== (checkpoint ?? 'anytime')) return false;
  if (routineId && item.routineId === routineId) return true;
  return item.name.toLowerCase() === name.toLowerCase();
}

/** Adds an item, unless the name is blank or already in that checkpoint. */
export function addDailyItem(
  state: DailyChecks,
  name: string,
  timesPerDay: number,
  id: string,
  checkpoint?: DailyCheckpoint,
  routineId?: string,
) {
  const clean = name.trim().slice(0, 40);
  if (!clean || state.items.some(item => sameSlot(item, clean, checkpoint, routineId))) return state;
  const next: DailyItem = { id, name: clean, timesPerDay: clampTimes(timesPerDay) };
  if (checkpoint) next.checkpoint = checkpoint;
  if (routineId) next.routineId = routineId;
  return { ...state, items: [...state.items, next] };
}

export function removeDailyItem(state: DailyChecks, id: string) {
  return { ...state, items: state.items.filter(item => item.id !== id) };
}

export function setDailyTimes(state: DailyChecks, id: string, timesPerDay: number) {
  if (!state.items.some(item => item.id === id)) return state;
  return {
    ...state,
    items: state.items.map(item =>
      item.id === id ? { ...item, timesPerDay: clampTimes(timesPerDay) } : item,
    ),
  };
}

/** Moves an item to another checkpoint. A name already there stays where it is. */
export function moveDailyItem(state: DailyChecks, id: string, checkpoint: DailyCheckpoint) {
  const item = state.items.find(entry => entry.id === id);
  if (!item || dailySlot(item) === checkpoint) return state;
  if (state.items.some(other => other.id !== id && sameSlot(other, item.name, checkpoint, item.routineId)))
    return state;
  return {
    ...state,
    items: state.items.map(entry => (entry.id === id ? { ...entry, checkpoint } : entry)),
  };
}

/** Keeps the checkpoint and the ticks, and swaps the routine in that row. */
export function replaceDailyItem(
  state: DailyChecks,
  id: string,
  next: { name: string; routineId?: string },
) {
  const clean = next.name.trim().slice(0, 40);
  const item = state.items.find(entry => entry.id === id);
  if (!item || !clean) return state;
  return {
    ...state,
    items: state.items
      .filter(
        other =>
          other.id === id ||
          dailySlot(other) !== dailySlot(item) ||
          (other.routineId !== next.routineId && other.name.toLowerCase() !== clean.toLowerCase()),
      )
      .map(entry =>
        entry.id === id
          ? { ...entry, name: clean, ...(next.routineId ? { routineId: next.routineId } : { routineId: undefined }) }
          : entry,
      ),
  };
}

export function dailyRoutine(
  state: DailyChecks,
  routineId: string,
  checkpoint: DailyCheckpoint,
) {
  return state.items.find(item => item.routineId === routineId && dailySlot(item) === checkpoint);
}

export function dailyCount(state: DailyChecks, id: string, day: string) {
  return state.ticks[day]?.[id] ?? 0;
}

/** One more serving ticked. After the last one it starts over, so a mistaken tap can be undone. */
export function tickDailyItem(state: DailyChecks, id: string, day: string) {
  const item = state.items.find(entry => entry.id === id);
  if (!item) return state;
  const next = (dailyCount(state, id, day) + 1) % (item.timesPerDay + 1);
  const days = Object.keys(state.ticks).filter(key => key !== day).sort().slice(-(keptDays - 1));
  const ticks: DailyChecks['ticks'] = Object.fromEntries(days.map(key => [key, state.ticks[key]]));
  ticks[day] = { ...state.ticks[day], [id]: next };
  return { ...state, ticks };
}

export type DailySection = { checkpoint: DailyCheckpoint; items: DailyItem[] };

/** Checkpoints in day order. Empty ones stay hidden until the person is editing. Anytime is last. */
export function dailySections(items: DailyItem[], editing: boolean): DailySection[] {
  const sections: DailySection[] = routineCheckpoints.map(checkpoint => ({
    checkpoint,
    items: items.filter(item => item.checkpoint === checkpoint),
  }));
  const visible = editing ? sections : sections.filter(section => section.items.length > 0);
  const anytime = items.filter(item => dailySlot(item) === 'anytime');
  if (anytime.length) visible.push({ checkpoint: 'anytime', items: anytime });
  return visible;
}

function ticksFor(state: DailyChecks, items: DailyItem[]) {
  const ids = new Set(items.map(item => item.id));
  const ticks: DailyChecks['ticks'] = {};
  for (const [day, counts] of Object.entries(state.ticks)) {
    const kept = Object.entries(counts).filter(([id]) => ids.has(id));
    if (kept.length) ticks[day] = Object.fromEntries(kept);
  }
  return ticks;
}

/** One SecureStore value, or several chunks that each fit the platform limit. */
export function packDailyChecks(state: DailyChecks): string[] {
  const single = JSON.stringify(state);
  if (byteLength(single) <= secureStoreByteLimit) return [single];
  const parts: string[] = [];
  let batch: DailyItem[] = [];
  const emit = (items: DailyItem[]) => {
    const json = JSON.stringify({ items, ticks: ticksFor(state, items) });
    if (byteLength(json) > secureStoreByteLimit) {
      const smaller = items.map(item => ({ ...item, name: item.name.slice(0, 24) }));
      const trimmed = JSON.stringify({ items: smaller, ticks: ticksFor(state, smaller) });
      if (byteLength(trimmed) > secureStoreByteLimit) throw new Error('A daily item does not fit on this device.');
      parts.push(trimmed);
      return;
    }
    parts.push(json);
  };
  for (const item of state.items) {
    const next = [...batch, item];
    if (byteLength(JSON.stringify({ items: next, ticks: ticksFor(state, next) })) > secureStoreByteLimit) {
      if (batch.length) emit(batch);
      batch = [item];
    } else batch = next;
  }
  if (batch.length) emit(batch);
  return parts;
}

export function unpackDailyChecks(parts: string[]): DailyChecks {
  if (parts.length === 1) return parseDailyChecks(JSON.parse(parts[0]));
  const merged = emptyDailyChecks();
  for (const part of parts) {
    const parsed = parseDailyChecks(JSON.parse(part));
    merged.items.push(...parsed.items);
    for (const [day, counts] of Object.entries(parsed.ticks))
      merged.ticks[day] = { ...merged.ticks[day], ...counts };
  }
  return merged;
}
