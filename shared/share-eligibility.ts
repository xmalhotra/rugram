/**
 * What a member may post. It reads finished sessions only.
 * A flow that came with the app and was never done is not earned.
 */
import { thresholdFor, type ShareKind } from './share-thresholds';

export type { ShareKind };

export type FinishedMark = { id: string; date: string };

export type ShareSubject = {
  kind: ShareKind;
  id: string;
  title: string;
  /** Flows that make one Daily flow day. A day counts when each of them was finished that date. */
  dayFlowIds?: readonly string[];
  /** For a Daily flow day: the Map flow it belongs to, to tell same-named days apart. */
  from?: string;
  /** One entry per day of a Map flow. An empty list is a rest day. */
  pattern?: readonly { flowIds: readonly string[] }[];
};

export type ShareStanding = {
  kind: ShareKind;
  id: string;
  title: string;
  earned: boolean;
  done: number;
  need: number;
  left: number;
  line: string | null;
  reason: string;
};

export function gapLine(left: number) {
  if (left <= 0) return null;
  if (left === 1) return '1 more session';
  return `${left} more sessions`;
}

function byDate(finished: readonly FinishedMark[]) {
  const dates = new Map<string, Set<string>>();
  for (const mark of finished) {
    const have = dates.get(mark.date) ?? new Set<string>();
    have.add(mark.id);
    dates.set(mark.date, have);
  }
  return dates;
}

function followedDays(ids: readonly string[], finished: readonly FinishedMark[]) {
  if (!ids.length) return 0;
  let days = 0;
  for (const have of byDate(finished).values()) {
    if (ids.every(id => have.has(id))) days += 1;
  }
  return days;
}

/** Full passes of a pattern, and how many training days are already done in the open pass. */
export function patternProgress(pattern: readonly { flowIds: readonly string[] }[], finished: readonly FinishedMark[]) {
  const training = pattern.filter(day => day.flowIds.length > 0);
  if (!training.length) return { passes: 0, into: 0, training: 0 };
  const dates = [...byDate(finished).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let passes = 0;
  let index = 0;
  for (const [, have] of dates) {
    if (training[index].flowIds.every(id => have.has(id))) {
      index += 1;
      if (index === training.length) {
        passes += 1;
        index = 0;
      }
    }
  }
  return { passes, into: index, training: training.length };
}

function sessionCount(id: string, finished: readonly FinishedMark[]) {
  return finished.filter(mark => mark.id === id).length;
}

export function shareStanding(subject: ShareSubject, finished: readonly FinishedMark[]): ShareStanding {
  const rule = thresholdFor(subject.kind);
  let done = 0;
  let left: number = rule.need;
  if (subject.kind === 'flow' || subject.kind === 'custom-flow') {
    done = sessionCount(subject.id, finished);
    left = Math.max(0, rule.need - done);
  } else if (subject.kind === 'daily-flow') {
    done = followedDays(subject.dayFlowIds ?? [], finished);
    left = Math.max(0, rule.need - done);
  } else {
    const progress = patternProgress(subject.pattern ?? [], finished);
    done = progress.passes;
    left = done >= rule.need ? 0 : Math.max(1, progress.training - progress.into);
  }
  const earned = done >= rule.need && left === 0;
  const line = earned ? null : gapLine(left);
  const reason = earned
    ? subject.kind === 'daily-flow'
      ? 'You followed this day.'
      : subject.kind === 'map-flow'
        ? 'You finished this pattern.'
        : 'You finished this.'
    : (line ?? 'Finish it before you post it.');
  return { kind: subject.kind, id: subject.id, title: subject.title, earned, done, need: rule.need, left, line, reason };
}

export function classifyShares(subjects: readonly ShareSubject[], finished: readonly FinishedMark[]) {
  const rows = subjects.map(subject => shareStanding(subject, finished));
  return {
    earned: rows.filter(row => row.earned),
    close: rows.filter(row => !row.earned),
  };
}
