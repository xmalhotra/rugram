import { habitDay } from './format';
/** Replay window matches the visible 28-day history; no future/backfilled fiction. */
export function completionDay(
  value: string | undefined,
  timeZone = 'Asia/Kolkata',
  now = new Date(),
) {
  const today = habitDay(now, timeZone);
  const day = value ?? today;
  const earliest = new Date(`${today}T12:00:00Z`);
  earliest.setUTCDate(earliest.getUTCDate() - 27);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(day)) ||
    new Date(day).toISOString().slice(0, 10) !== day ||
    day > today ||
    day < earliest.toISOString().slice(0, 10)
  )
    throw new Error('Completion date must be today or within the previous 27 days.');
  return day;
}
