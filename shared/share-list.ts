/**
 * How the Share list on Home → Yours is put together.
 * - A rest day is never offered: there is nothing in it to share.
 * - Two rows that would read the same get the name of the Map flow they belong to as a detail line.
 */

/** A Map flow day with no flows is a rest day. */
export function isRestDay(day: { flows: readonly unknown[] }) {
  return day.flows.length === 0;
}

/**
 * Adds `detail` to each row: the Map flow name (`from`) when another row has the same title,
 * otherwise null. Titles are compared without case or surrounding spaces.
 */
export function withShareDetails<T extends { title: string; from?: string }>(rows: readonly T[]) {
  const key = (title: string) => title.trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row.title), (counts.get(key(row.title)) ?? 0) + 1);
  return rows.map(row => ({
    ...row,
    detail: (counts.get(key(row.title)) ?? 0) > 1 && row.from ? row.from : null,
  }));
}
