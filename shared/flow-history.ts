import { formatKg } from './progression';

export type HistorySet = {
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  status?: 'done' | 'skipped';
  /** The rest planned after this set, as the person last set it. */
  restPlannedSeconds?: number | null;
};

export type HistoryCardStatus = 'pending' | 'done' | 'skipped';

export type HistoryCard = {
  cardId: string;
  title: string;
  status: HistoryCardStatus;
  seconds: number | null;
  exerciseId: string | null;
  sets: HistorySet[];
};

export type HistoryRunStatus = 'running' | 'finished' | 'posted' | 'abandoned';

export type HistoryRun = {
  id: string;
  status: HistoryRunStatus;
  startedAt: string;
  updatedAt: string;
  cards: HistoryCard[];
  effort?: number | null;
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function clock(date: Date) {
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const hours24 = date.getHours();
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours = hours24 % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

/** "Today, 7:40 PM" or "Mon 3 Nov, 7:40 PM". */
export function formatRunWhen(iso: string, now: Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = clock(date);
  const today =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (today) return `Today, ${time}`;
  return `${weekdays[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}, ${time}`;
}

/** "1 of 5 done", or "2 of 5 done · Not finished" when the run was left. */
export function formatRunCount(done: number, total: number, unfinished = false) {
  const line = `${done} of ${total} done`;
  return unfinished ? `${line} · Not finished` : line;
}

function oneLoggedSet(set: HistorySet) {
  if (set.status === 'skipped') return 'Skipped';
  if (set.weightKg != null && set.reps != null) return `${formatKg(set.weightKg)} kg × ${set.reps}`;
  if (set.weightKg != null && set.durationSeconds != null) return `${formatKg(set.weightKg)} kg × ${set.durationSeconds} sec`;
  if (set.reps != null) return `${set.reps} reps`;
  if (set.durationSeconds != null) return `${set.durationSeconds} sec`;
  return '';
}

/** "40 kg × 12, 45 kg × 11, 50 kg × 10", "10, 9, 8 reps", or "40, 35, 30 sec". A skipped set reads "Skipped". */
export function formatLoggedSets(sets: HistorySet[]) {
  if (!sets.length) return '';
  if (sets.some(set => set.status === 'skipped')) return sets.map(oneLoggedSet).filter(Boolean).join(', ');
  if (sets.every(set => set.durationSeconds != null && set.reps == null && set.weightKg == null)) {
    return `${sets.map(set => set.durationSeconds).join(', ')} sec`;
  }
  if (sets.every(set => set.weightKg == null && set.reps != null && set.durationSeconds == null)) {
    return `${sets.map(set => set.reps).join(', ')} reps`;
  }
  return sets
    .map(set => {
      if (set.weightKg != null && set.reps != null) return `${formatKg(set.weightKg)} kg × ${set.reps}`;
      if (set.weightKg != null && set.durationSeconds != null)
        return `${formatKg(set.weightKg)} kg × ${set.durationSeconds} sec`;
      if (set.reps != null) return `${set.reps} reps`;
      if (set.durationSeconds != null) return `${set.durationSeconds} sec`;
      return '';
    })
    .filter(Boolean)
    .join(', ');
}

/** What a card shows once it has been done or skipped. Pending cards stay blank. */
export function formatCardDetail(
  card: { status: HistoryCardStatus; seconds: number | null },
  sets: HistorySet[],
) {
  if (card.status === 'skipped') return 'Skipped';
  if (card.status !== 'done') return null;
  const logged = formatLoggedSets(sets);
  if (logged) return logged;
  if (card.seconds != null) return `${Math.round(card.seconds)} sec`;
  return null;
}

export function formatCardMark(
  status: HistoryCardStatus,
  upNext: boolean,
): '✓' | 'Skipped' | 'Up next' | null {
  if (status === 'done') return '✓';
  if (status === 'skipped') return 'Skipped';
  if (upNext && status === 'pending') return 'Up next';
  return null;
}

/** Sum of completed cards, only when every done card recorded a time. */
export function formatKnownTotal(cards: { status: string; seconds: number | null }[]) {
  const done = cards.filter(card => card.status === 'done');
  if (!done.length || done.some(card => card.seconds == null)) return null;
  const total = done.reduce((sum, card) => sum + (card.seconds ?? 0), 0);
  if (total <= 0) return null;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds} sec`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}

/** "Felt 7/10" when the person rated the run. */
export function formatEffort(effort: number | null | undefined) {
  if (effort == null || !Number.isInteger(effort) || effort < 1 || effort > 10) return null;
  return `Felt ${effort}/10`;
}
