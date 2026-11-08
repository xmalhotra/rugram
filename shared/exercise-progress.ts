// How one exercise has gone over time: one point per session, for the ⓘ sheet's chart.
import { oneRepMax } from './strength';

export type ProgressSet = {
  runId: string | null;
  loggedAt: string;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
};

export type ProgressPoint = {
  loggedAt: string;
  sets: number;
  /** The heaviest set by estimated one-rep max, or by weight when the reps were too many to estimate. */
  bestWeightKg: number | null;
  bestReps: number | null;
  /** Longest hold, for timed exercises. */
  bestSeconds: number | null;
  /** Most reps in a set, for bodyweight exercises. */
  mostReps: number | null;
  oneRepMaxKg: number | null;
  /** Weight × reps over the session. */
  volumeKg: number;
};

function localDay(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Sessions oldest first. Sets from one run are one session; sets logged outside a run group by day. */
export function progressPoints(sets: readonly ProgressSet[]): ProgressPoint[] {
  const groups = new Map<string, ProgressSet[]>();
  for (const set of sets) {
    const key = set.runId ? `run:${set.runId}` : `day:${localDay(set.loggedAt)}`;
    const list = groups.get(key) ?? [];
    list.push(set);
    groups.set(key, list);
  }
  const points: ProgressPoint[] = [];
  for (const list of groups.values()) {
    let best: { weightKg: number; reps: number; max: number | null } | null = null;
    let bestSeconds: number | null = null;
    let mostReps: number | null = null;
    let volumeKg = 0;
    for (const set of list) {
      if (set.durationSeconds != null) bestSeconds = Math.max(bestSeconds ?? 0, set.durationSeconds);
      if (set.reps != null) mostReps = Math.max(mostReps ?? 0, set.reps);
      if (set.weightKg == null || set.reps == null) continue;
      volumeKg += set.weightKg * set.reps;
      const max = oneRepMax(set.weightKg, set.reps);
      const better =
        !best ||
        (max != null && (best.max == null || max > best.max)) ||
        (max == null && best.max == null && set.weightKg > best.weightKg);
      if (better) best = { weightKg: set.weightKg, reps: set.reps, max };
    }
    points.push({
      loggedAt: list.reduce((at, set) => (set.loggedAt > at ? set.loggedAt : at), list[0].loggedAt),
      sets: list.length,
      bestWeightKg: best?.weightKg ?? null,
      bestReps: best?.reps ?? null,
      bestSeconds,
      mostReps,
      oneRepMaxKg: best?.max == null ? null : Math.round(best.max * 10) / 10,
      volumeKg: Math.round(volumeKg),
    });
  }
  return points.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
}

/** The number a chart follows for this kind of exercise, per point. */
export function progressValue(point: ProgressPoint): number | null {
  return point.oneRepMaxKg ?? point.bestWeightKg ?? point.bestSeconds ?? point.mostReps;
}
