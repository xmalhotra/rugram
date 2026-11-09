/**
 * Customflows: a member's own version of a flow they didn't write.
 *
 * A Customflow points at a source (a Qram flow, a Qram session, or later a community flow) and holds only
 * what the member changed. The source stays as written for everyone else; whenever the source is shown or
 * run for this member, their changes are applied on top. Clearing every change deletes the Customflow, and
 * the member is back on the original.
 *
 * Changes today: the order of the items. The `changes` object is where later ones go (leaving an item out,
 * swapping an exercise, own set targets), each optional, so older Customflows stay valid.
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
};

export type Customflow = { source: CustomflowSource; changes: CustomflowChanges; createdAt: string; updatedAt: string };

/** Every Customflow a member has, by `customflowKey`. */
export type Customflows = Record<string, Customflow>;

export const maxCustomflowItems = 60;

export function customflowKey(kind: CustomflowSourceKind, id: string) {
  return `${kind}:${id}`;
}

/** Nothing changed: the Customflow can go. */
export function hasChanges(changes: CustomflowChanges) {
  return Boolean(changes.order?.length);
}

/** The source's items as this member has them. */
export function applyCustomflow<T>(items: readonly T[], customflow: Customflow | undefined, keyOf: (item: T) => string): T[] {
  if (!customflow) return [...items];
  return applyOrder(items, customflow.changes.order, keyOf);
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
