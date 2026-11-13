// Where the strength numbers come from. Anything not listed here is a coaching rule of thumb, reviewed for
// sense but not measured. See docs/strength-estimates.md.

export type Evidence = { basis: 'study' | 'formula'; source: string; finding: string };

/** Formulas used for every estimate. */
export const formulaEvidence: Record<'oneRepMax' | 'reserve', Evidence> = {
  oneRepMax: {
    basis: 'formula',
    source: 'Epley (1985); accuracy compared in LeSuer et al. (1997), J Strength Cond Res 11(4)',
    finding: 'weight × (1 + reps/30) predicts a one-rep max reasonably under about 10 reps; less reliable above',
  },
  reserve: {
    basis: 'study',
    source: 'Zourdos et al. (2016), J Strength Cond Res 30(1)',
    finding: 'reps in reserve is a validated way to set effort; first weights leave 2 in reserve',
  },
};

/** Reference lifts measured against the deadlift, from competition data. */
export const patternEvidence: Record<'squat' | 'press', Evidence & { median: number }> = {
  squat: {
    basis: 'study',
    source: 'OpenPowerlifting data, 7 Nov 2026 export (public domain), https://www.openpowerlifting.org',
    finding: 'median squat ÷ deadlift 0.85 across 419,959 raw lifters with all three lifts (men 0.86, women 0.83)',
    median: 0.85,
  },
  press: {
    basis: 'study',
    source: 'OpenPowerlifting data, 7 Nov 2026 export (public domain), https://www.openpowerlifting.org',
    finding: 'median bench ÷ deadlift 0.53 across 419,959 raw lifters (men 0.57, women 0.455)',
    median: 0.53,
  },
};

/** Exercise ratios measured in studies, against the pattern's reference lift. */
export const ratioEvidence: Record<string, Evidence> = {
  'dumbbell-bench-press': {
    basis: 'study',
    source: 'Saeterbakken et al. (2011), J Sports Sci 29(5)',
    finding: 'dumbbell 1RM (both dumbbells) 17% below the barbell bench press: about 0.41 per hand',
  },
  'smith-bench-press': {
    basis: 'study',
    source: 'Saeterbakken et al. (2011), J Sports Sci 29(5)',
    finding: 'dumbbells 14% below the Smith machine and 17% below the barbell: Smith about 0.96 of the barbell',
  },
  'seated-dumbbell-shoulder-press': {
    basis: 'study',
    source: 'Saeterbakken & Fimland (2013), J Strength Cond Res 27(7)',
    finding: 'standing dumbbells 7% below the standing barbell press and 10% below seated dumbbells: about 0.52 per hand',
  },
};
