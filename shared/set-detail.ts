/** Private set timing. Nothing here is shown on a post, a feed, or a member profile. */

export type SetStatus = 'done' | 'skipped';
export type TimeSource = 'clock' | 'typed';

export type SetDetail = {
  status: SetStatus;
  plannedWeightKg: number | null;
  plannedReps: number | null;
  plannedSeconds: number | null;
  schemeId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  restBeforeSeconds: number | null;
  restPlannedSeconds: number | null;
  timeSource: TimeSource | null;
  edited: boolean;
};

export type SetClockInput = {
  status: SetStatus;
  plannedWeightKg: number | null;
  plannedReps: number | null;
  plannedSeconds: number | null;
  schemeId: string | null;
  /** When this set became the open one, or when Start was tapped for a hold. */
  openedAt: number | null;
  /** When it was ticked or skipped. Later edits leave this alone. */
  completedAt: number | null;
  /** Previous set's completed moment. Null on the first set. */
  previousCompletedAt: number | null;
  restPlannedSeconds: number | null;
  durationSeconds: number | null;
  clockRan: boolean;
  typedSeconds: boolean;
  edited: boolean;
};

type LoggedLike = {
  status?: string;
  weightKg?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
};

const dayMs = 24 * 60 * 60 * 1000;
const isoTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

/** Drop skipped rows so prefill, progression, and "Your last" never read them. */
export function setsForProgression<T>(sets: readonly T[] | null | undefined): T[] {
  if (!sets?.length) return [];
  return sets.filter(set => set != null && (set as { status?: string }).status !== 'skipped');
}

/** Actual gap from the previous completion to this set opening. Null on the first set. */
export function restBeforeSeconds(previousCompletedAt: number | null, openedAt: number | null) {
  if (previousCompletedAt == null || openedAt == null) return null;
  return Math.max(0, Math.round((openedAt - previousCompletedAt) / 1000));
}

/** Typing after the clock has run wins. A number entered with no clock is typed. */
export function resolveTimeSource(input: {
  durationSeconds: number | null;
  clockRan: boolean;
  typedSeconds: boolean;
}): TimeSource | null {
  if (input.typedSeconds && (input.clockRan || input.durationSeconds != null)) return 'typed';
  if (input.clockRan) return 'clock';
  if (input.durationSeconds != null) return 'typed';
  return null;
}

export function buildSetDetail(input: SetClockInput): SetDetail {
  const status = input.status === 'skipped' ? 'skipped' : 'done';
  return {
    status,
    plannedWeightKg: input.plannedWeightKg,
    plannedReps: input.plannedReps,
    plannedSeconds: input.plannedSeconds,
    schemeId: input.schemeId,
    startedAt: input.openedAt == null ? null : new Date(input.openedAt).toISOString(),
    completedAt: input.completedAt == null ? null : new Date(input.completedAt).toISOString(),
    restBeforeSeconds: restBeforeSeconds(input.previousCompletedAt, input.openedAt),
    restPlannedSeconds: input.restPlannedSeconds,
    timeSource: status === 'skipped' ? null : resolveTimeSource(input),
    edited: status === 'done' && input.edited,
  };
}

/** Open time with pause removed, and the pause itself. Both are whole seconds. */
export function exerciseTiming(input: { openedAt: number; closedAt: number; pausedMs: number }) {
  const pausedSeconds = Math.max(0, Math.round(input.pausedMs / 1000));
  const openSeconds = Math.max(0, Math.round((input.closedAt - input.openedAt) / 1000));
  return { activeSeconds: Math.max(0, openSeconds - pausedSeconds), pausedSeconds };
}

/** The exercise clock starts when the countdown ends, so the earlier card appearance is dropped. */
export function clockAfterCountdown(phaseStartedAt: number, countdownEndedAt: number) {
  return Math.max(phaseStartedAt, countdownEndedAt);
}

export function effortRating(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10)
    throw new Error('Rate the effort from 1 to 10.');
  return value;
}

/** A stored weight stays put when the person later edits their profile weight. */
export function keptWeight(snapshot: number | null | undefined, current: number | null) {
  return snapshot != null ? snapshot : current;
}

export function assertRecordedTime(iso: string | null | undefined, now: number) {
  if (iso == null) return;
  if (!isoTime.test(iso) || Number.isNaN(Date.parse(iso))) throw new Error('Check the time and try again.');
  if (Date.parse(iso) > now + dayMs) throw new Error('That time is too far ahead.');
}

/** "Your last" copy from done sets only. */
export function yourLastLine(
  sets: readonly (LoggedLike & { weightKg: number | null; reps: number | null; durationSeconds?: number | null })[],
) {
  return setsForProgression(sets)
    .map(set =>
      set.durationSeconds != null && set.reps == null
        ? `${set.durationSeconds} sec`
        : set.weightKg == null
          ? `${set.reps} reps`
          : `${set.weightKg} kg × ${set.reps}`,
    )
    .join(', ');
}
