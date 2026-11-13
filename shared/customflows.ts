/**
 * Customflows: a member's own version of a flow they didn't write.
 *
 * A Customflow points at a source (a Qram flow, a Qram session, or later a community flow) and holds only
 * what the member changed. The source stays as written for everyone else; whenever the source is shown or
 * run for this member, their changes are applied on top. Clearing every change deletes the Customflow, and
 * the member is back on the original.
 *
 * Changes today: the order of the items, a swap of one exercise for another, and leaving an item out.
 * A priority finisher is not part of the source. It is added for this member, and these same changes
 * apply to it. The `changes` object is where later ones go (own set targets), each optional, so older
 * Customflows stay valid.
 * See docs/customflows.md.
 */
import { applyOrder } from './item-order';

export const customflowSources = {
  'qram-flow': { title: 'Qram flow', itemKey: 'exercise id', versioned: false },
  'qram-session': { title: 'Qram session', itemKey: 'block id', versioned: false },
  /** Not wired into the app yet: community flows are versioned, so a Customflow remembers which one it changed. */
  'community-flow': { title: 'Community flow', itemKey: 'card id', versioned: true },
} as const;

export type CustomflowSourceKind = keyof typeof customflowSources;
export const customflowSourceKinds = Object.keys(customflowSources) as [CustomflowSourceKind, ...CustomflowSourceKind[]];

export type CustomflowSource = { kind: CustomflowSourceKind; id: string; /** Community flows only. */ version: number | null };

export type CustomflowChanges = {
  /** Item keys in the member's order. Items it doesn't mention keep the source order, at the end. */
  order?: string[];
  /**
   * Source item key → the exercise the member does instead.
   * On a flow the key is the exercise the flow was written with. On a session it is the block id.
   * The item keeps its sets, reps, scheme, superset label and place. Rest stays when the item set
   * `restSeconds`; otherwise it comes from the replacement's rest class. Weights are never copied:
   * the replacement is a different exercise, so history and estimates are its own.
   */
  swaps?: Record<string, string>;
  /** Item keys left out. On a flow the key is the source exercise id, including a priority finisher. */
  removed?: string[];
};

export type Customflow = {
  source: CustomflowSource;
  changes: CustomflowChanges;
  createdAt: string;
  updatedAt: string;
  /** Set when this Custom flow started as someone else's, kept as "from q_name". */
  fromName?: string;
};

/** Every Customflow a member has, by `customflowKey`. */
export type Customflows = Record<string, Customflow>;

export const maxCustomflowItems = 60;

export function customflowKey(kind: CustomflowSourceKind, id: string) {
  return `${kind}:${id}`;
}

/** Nothing changed: the Customflow can go. */
export function hasChanges(changes: CustomflowChanges) {
  return Boolean(changes.order?.length) || Boolean(changes.swaps && Object.keys(changes.swaps).length) || Boolean(changes.removed?.length);
}

function replacementFor(swaps: Record<string, string> | undefined, key: string) {
  const next = swaps?.[key];
  return next && next !== key ? next : null;
}

function withExerciseId<T>(item: T, exerciseId: string): T {
  if (!item || typeof item !== 'object' || !('exerciseId' in item)) return item;
  return { ...(item as Record<string, unknown>), exerciseId } as T;
}

/** The source exercise a swap replaced, when `exerciseId` is that replacement. */
export function swappedFrom(changes: CustomflowChanges | undefined, exerciseId: string) {
  const swaps = changes?.swaps;
  if (!swaps) return null;
  for (const [source, replacement] of Object.entries(swaps)) {
    if (replacement === exerciseId && source !== exerciseId) return source;
  }
  return null;
}

/**
 * Each source item in the member's order, with `item.exerciseId` already replaced when they swapped it.
 * `sourceId` stays the key the flow was written with, so order and undo still find the slot.
 */
export function customflowSlots<T extends { exerciseId: string }>(
  items: readonly T[],
  customflow: Customflow | undefined,
): { sourceId: string; item: T }[] {
  const removed = new Set(customflow?.changes.removed ?? []);
  const kept = removed.size ? items.filter(item => !removed.has(item.exerciseId)) : items;
  const ordered = applyOrder(kept, customflow?.changes.order, item => item.exerciseId);
  return ordered.map(item => {
    const next = replacementFor(customflow?.changes.swaps, item.exerciseId);
    return { sourceId: item.exerciseId, item: next ? withExerciseId(item, next) : item };
  });
}

/** The source's items as this member has them. */
export function applyCustomflow<T>(items: readonly T[], customflow: Customflow | undefined, keyOf: (item: T) => string): T[] {
  const removed = new Set(customflow?.changes.removed ?? []);
  const kept = removed.size ? items.filter(item => !removed.has(keyOf(item))) : [...items];
  if (!customflow) return kept;
  const ordered = applyOrder(kept, customflow.changes.order, keyOf);
  const swaps = customflow.changes.swaps;
  if (!swaps || !Object.keys(swaps).length) return ordered;
  return ordered.map(item => {
    const next = replacementFor(swaps, keyOf(item));
    return next ? withExerciseId(item, next) : item;
  });
}

/** A versioned source moved on since the member customised it (they may want to look again). */
export function sourceMovedOn(customflow: Customflow, currentVersion: number | null) {
  return customflow.source.version != null && currentVersion != null && currentVersion !== customflow.source.version;
}

/** Applies one change; `null` clears it. Check `hasChanges` on the result before saving. */
export function withChange<K extends keyof CustomflowChanges>(
  changes: CustomflowChanges,
  field: K,
  value: CustomflowChanges[K] | null,
): CustomflowChanges {
  const next = { ...changes };
  if (value == null) delete next[field];
  else next[field] = value;
  return next;
}
