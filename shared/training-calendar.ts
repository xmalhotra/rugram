// The training calendar on the profile: a year of days, one square each, darker on busier days.

export type CalendarDay = {
  /** Local date, YYYY-MM-DD. */
  date: string;
  count: number;
  /** 0 is nothing; 1 to 4 get darker. */
  level: 0 | 1 | 2 | 3 | 4;
  /** After today: drawn empty. */
  future: boolean;
};

export type CalendarWeek = { days: CalendarDay[]; /** Short month name when this week starts a new month. */ month: string | null };

export type TrainingCalendar = { weeks: CalendarWeek[]; total: number; activeDays: number };

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function localKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** One finished workout is level 1; four or more on a day is the darkest. */
export function dayLevel(count: number): CalendarDay['level'] {
  if (count <= 0) return 0;
  return Math.min(4, count) as CalendarDay['level'];
}

/**
 * The last `weeks` weeks as columns of seven days, Monday at the top, ending with the week that holds `now`.
 * Days are counted in the member's local time.
 */
export function trainingCalendar(finishedAt: readonly string[], now: number, weeks = 53): TrainingCalendar {
  const counts = new Map<string, number>();
  for (const iso of finishedAt) {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) continue;
    const key = localKey(new Date(time));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayKey = localKey(today);
  // Monday of this week, then back to the first week shown.
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (weeks - 1) * 7);
  const result: CalendarWeek[] = [];
  let total = 0;
  let activeDays = 0;
  const cursor = new Date(start);
  for (let week = 0; week < weeks; week += 1) {
    const days: CalendarDay[] = [];
    // A month is named over the first week whose Monday falls in it.
    const month = cursor.getDate() <= 7 ? monthNames[cursor.getMonth()] : null;
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const key = localKey(cursor);
      const future = key > todayKey;
      const count = future ? 0 : (counts.get(key) ?? 0);
      days.push({ date: key, count, level: dayLevel(count), future });
      total += count;
      if (count > 0) activeDays += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    result.push({ days, month });
  }
  return { weeks: result, total, activeDays };
}
