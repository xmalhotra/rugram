function dayKey(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Days in a row with a finished flow, counted in the member's local time. Today still
 * counts as open: yesterday's streak holds until today ends.
 */
export function dayStreak(finishedAt: readonly string[], now: number) {
  const days = new Set(
    finishedAt.map(iso => Date.parse(iso)).filter(Number.isFinite).map(time => dayKey(time)),
  );
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** "Gym 3 · Running 1" pieces, biggest first, ties in the order they first appear. */
export function countBySection(sectionTitles: readonly string[]) {
  const counts = new Map<string, number>();
  for (const title of sectionTitles) counts.set(title, (counts.get(title) ?? 0) + 1);
  return [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}
