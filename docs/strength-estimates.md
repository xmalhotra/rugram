# Personal estimates: where the numbers come from

Personalised weights (see `docs/customflows.md`, layer 2) are built from a member's lifts, body weight and
logged sets. This page says which parts are measured and which are rules of thumb, so nobody mistakes a guess
for a fact. Sources are also recorded in code, in `shared/strength-evidence.ts`.

## Measured or established

| What | Value used | Source |
|---|---|---|
| One-rep max from a set | weight × (1 + reps/30), sets of 12 or fewer reps only | Epley (1985); LeSuer et al. (1997), *J Strength Cond Res* 11(4): reasonably accurate under about 10 reps for bench, squat and deadlift, less reliable above |
| First-time effort | 2 reps in reserve | Zourdos et al. (2016), *J Strength Cond Res* 30(1): reps in reserve as a way to set effort |
| Dumbbell bench press | 0.41 of the barbell bench, per hand | Saeterbakken et al. (2011), *J Sports Sci* 29(5): dumbbell 1RM 17% below the barbell |
| Smith machine bench press | 0.96 of the barbell bench | Same study: dumbbells 14% below the Smith machine, 17% below the barbell |
| Seated dumbbell shoulder press | 0.52 of the standing barbell press, per hand | Saeterbakken & Fimland (2013), *J Strength Cond Res* 27(7): standing dumbbells 7% below the standing barbell, 10% below seated dumbbells |
| Back squat to deadlift | 0.85 | OpenPowerlifting, 7 Nov 2026 export: median across 419,959 raw lifters (men 0.86, women 0.83; middle half 0.78–0.92) |
| Bench press to deadlift | 0.53 | Same data: median 0.53 (men 0.57, women 0.455; middle half 0.47–0.60). The app doesn't know a member's sex, so it uses everyone's median |

## Running and endurance

| What | How | Source |
|---|---|---|
| Fitness from one run | VDOT from distance and time (oxygen cost of the pace ÷ share of VO2max holdable for that long) | Daniels & Gilbert (1979) equations, as used in *Daniels' Running Formula*. Checked in tests against the tables: a 19:57 5K is VDOT 50 |
| Training paces | Easy 59–74%, marathon 75–84%, threshold 83–88%, interval 95–100%, repetition 105–110% of VDOT | *Daniels' Running Formula*. At VDOT 50 this gives threshold about 4:15/km and interval about 3:55/km, as the tables do |
| Race predictions | T₂ = T₁ × (D₂ ÷ D₁)^1.06 | Riegel (1981), *American Scientist* 69(3); most reliable between nearby distances |
| Swim pace | 400 m time ÷ 4 per 100 m | A stand-in for critical swim speed (Wakayoshi et al., 1992), which needs two timed swims |

Personal metrics live in `shared/personal-metrics.ts` (one registry of questions per category) and the
`personal_metrics` table (migration 044). Running sessions mark each block's intensity, so the session screen
shows the member's own pace for it.

## Rules of thumb (not measured)

- **The other reference lifts against the deadlift**: overhead press 0.4, row 0.5, pulldown 0.5, curl 0.25 and
  pushdown 0.2. Common coaching ratios; individuals vary by 20–30% or more. (Squat and bench are measured, above.)
- **The other exercise ratios** in `shared/strength-map.ts` (322 of 325). Written from coaching guidance and
  reviewed for sense, not measured.
- **Body-weight fallback**: deadlift 0.6, 0.8, 1.0 or 1.3 × body weight for sedentary, lightly active, active
  or athlete. Deliberately cautious; the weakest estimate, used only until the member gives a lift. For
  comparison, competitive raw lifters deadlift far more (10th percentile 1.54 × body weight, median 2.28), but
  they aren't the general population, so their numbers aren't used here.

## Known limits

- One formula serves every exercise, but reps at a given share of a one-rep max differ by exercise: more on
  leg press and squat, fewer on curls (Hoeger et al., 1990; Shimano et al., 2006). Estimates from long sets on
  big machines may run high.
- Ratios between lifts depend on build and training history. Estimates are a starting point: a member's own
  logged sets replace them within a session or two.

## How to improve them

1. **Squat and bench from real data: done.** `scripts/openpowerlifting-ratios.py` recomputes the medians from a
   newer export. This uses data from the OpenPowerlifting project, https://www.openpowerlifting.org; a copy of
   the data is at https://gitlab.com/openpowerlifting/opl-data.
2. **Every other lift**: Strength Level holds standards for 287 exercises from about 195 million logged lifts,
   but use in another product needs a written commercial licence (https://strengthlevel.com/data-licensing).
3. **Trainer review** of the rule-of-thumb ratios before launch.
