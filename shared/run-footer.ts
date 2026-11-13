/** One set on the workout footer: open, ticked, or skipped. A running hold stays open. */
export type FooterSet = {
  ticked: boolean;
  skipped: boolean;
  running?: boolean;
};

export type RunFooterState = {
  ready: boolean;
  remaining: number;
  /** Null hides Skip. "Skip" drops the exercise. "Skip N sets" marks the open ones and moves on. */
  skipLabel: string | null;
  hint: string;
};

function kindOf(set: FooterSet) {
  if (set.running) return 'open';
  if (set.ticked) return 'ticked';
  if (set.skipped) return 'skipped';
  return 'open';
}

/** Whether Next can leave this exercise, and what Skip should say. */
export function runFooterState(sets: FooterSet[]): RunFooterState {
  let open = 0;
  let ticked = 0;
  for (const set of sets) {
    const kind = kindOf(set);
    if (kind === 'open') open += 1;
    else if (kind === 'ticked') ticked += 1;
  }
  const remaining = open;
  const ready = remaining === 0;
  const hint =
    remaining === 0
      ? ''
      : remaining === 1
        ? 'Finish or skip 1 more set'
        : `Finish or skip ${remaining} more sets`;
  const skipLabel =
    remaining === 0 ? null : ticked === 0 ? 'Skip' : remaining === 1 ? 'Skip 1 set' : `Skip ${remaining} sets`;
  return { ready, remaining, skipLabel, hint };
}
