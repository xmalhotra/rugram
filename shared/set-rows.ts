/**
 * What the workout screen shows for one exercise.
 * The flow's set count is a guide. The screen shows sets already logged and one next row.
 */

export type SetRowValues = {
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
};

function hasValue(row: SetRowValues) {
  return row.weightKg != null || row.reps != null || row.seconds != null;
}

/**
 * Values for the one open row.
 * Once this workout has a logged set of the exercise, the next row copies it.
 * Otherwise `first` is used. The caller builds `first` in the existing order:
 * the member's last time, then their estimate, then the flow.
 */
export function nextRowValues(logged: readonly SetRowValues[], first: SetRowValues): SetRowValues {
  for (let index = logged.length - 1; index >= 0; index -= 1) {
    const row = logged[index];
    if (row && hasValue(row)) return { weightKg: row.weightKg, reps: row.reps, seconds: row.seconds };
  }
  return { weightKg: first.weightKg, reps: first.reps, seconds: first.seconds };
}

/**
 * Moving on never depends on matching the plan.
 * Zero sets, fewer than planned, and more than planned are all fine.
 */
export function canMoveOn(loggedSets: number, plannedSets: number) {
  return loggedSets >= 0 && plannedSets >= 0;
}

/** The flow's count, once, as a quiet line. "3 planned". */
export function plannedLine(sets: number) {
  const count = Math.max(0, Math.round(Number.isFinite(sets) ? sets : 0));
  return `${count} planned`;
}
