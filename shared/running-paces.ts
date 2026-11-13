// Running paces from one recent run, using Daniels & Gilbert's oxygen-cost equations (the VDOT model in
// Daniels' Running Formula), and race predictions from Riegel (1981). See docs/strength-estimates.md.

export const runIntensities = ['easy', 'marathon', 'threshold', 'interval', 'repetition'] as const;
export type RunIntensity = (typeof runIntensities)[number];

/** Share of VDOT each kind of running is done at (Daniels' Running Formula). */
export const intensityShare: Record<RunIntensity, { low: number; high: number; title: string }> = {
  easy: { low: 0.59, high: 0.74, title: 'Easy' },
  marathon: { low: 0.75, high: 0.84, title: 'Marathon' },
  threshold: { low: 0.83, high: 0.88, title: 'Threshold' },
  interval: { low: 0.95, high: 1, title: 'Interval' },
  repetition: { low: 1.05, high: 1.1, title: 'Repetition' },
};

/** Oxygen cost (ml/kg/min) of running at `metresPerMinute`. */
function oxygenCost(metresPerMinute: number) {
  return -4.6 + 0.182258 * metresPerMinute + 0.000104 * metresPerMinute ** 2;
}

/** The share of VO2max that can be held for `minutes`. */
function sustainableShare(minutes: number) {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * minutes) + 0.2989558 * Math.exp(-0.1932605 * minutes);
}

/** Speed (m/min) whose oxygen cost is `vo2`: the inverse of oxygenCost. */
function speedFor(vo2: number) {
  const a = 0.000104;
  const b = 0.182258;
  const c = -(vo2 + 4.6);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** VDOT from a run done hard (a race or a time trial). Null outside 1.5 km–42.2 km or 3.5 min–5 h. */
export function vdot(distanceM: number, seconds: number) {
  if (!(distanceM >= 1500 && distanceM <= 42195) || !(seconds >= 210 && seconds <= 5 * 3600)) return null;
  const minutes = seconds / 60;
  const value = oxygenCost(distanceM / minutes) / sustainableShare(minutes);
  return Number.isFinite(value) && value > 10 && value < 90 ? Math.round(value * 10) / 10 : null;
}

/** Seconds per km for a share of VDOT. */
export function paceSeconds(vdotValue: number, share: number) {
  return 60000 / speedFor(vdotValue * share);
}

/** The pace range for a kind of running, slower end first, in seconds per km. */
export function paceRange(vdotValue: number, intensity: RunIntensity) {
  const share = intensityShare[intensity];
  return { slow: Math.round(paceSeconds(vdotValue, share.low)), fast: Math.round(paceSeconds(vdotValue, share.high)) };
}

/** Riegel: a time over `distanceM` from one over `fromM`. Most reliable for distances not far apart. */
export function riegel(fromM: number, fromSeconds: number, distanceM: number) {
  return fromSeconds * (distanceM / fromM) ** 1.06;
}

export function clockText(seconds: number) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}

export function paceText(range: { slow: number; fast: number }) {
  return range.slow === range.fast ? `${clockText(range.fast)} /km` : `${clockText(range.fast)}–${clockText(range.slow)} /km`;
}

/** Swim pace per 100 m from a 400 m swim: a stand-in for critical swim speed when only one time is known. */
export function swimPace(seconds400: number) {
  return seconds400 / 4;
}
