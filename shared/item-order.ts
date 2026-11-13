// Ordering items by a saved list of keys. Used by Customflows (see shared/customflows.ts); anything the
// saved order doesn't mention (added to the source later) keeps its place at the end.

/** Items in the member's order. Unknown keys in the saved order are skipped. */
export function applyOrder<T>(items: readonly T[], saved: readonly string[] | undefined, keyOf: (item: T) => string): T[] {
  if (!saved?.length) return [...items];
  const byKey = new Map(items.map(item => [keyOf(item), item]));
  const placed = new Set<string>();
  const result: T[] = [];
  for (const key of saved) {
    const item = byKey.get(key);
    if (item && !placed.has(key)) {
      result.push(item);
      placed.add(key);
    }
  }
  for (const item of items) if (!placed.has(keyOf(item))) result.push(item);
  return result;
}

/** A copy with the item at `from` moved to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
  return next;
}

/** True when the order differs from the default one. */
export function isCustomOrder(defaultKeys: readonly string[], keys: readonly string[]) {
  return defaultKeys.length !== keys.length || defaultKeys.some((key, index) => key !== keys[index]);
}
