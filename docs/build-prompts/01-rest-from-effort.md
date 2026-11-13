# 01 · Rest that follows the set just done

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3A.

## Goal

After a set, the app suggests a rest that fits **that set**. One easy pull-up earns about a minute.
Twenty pull-ups to the limit earn up to five. Today every set of an exercise gets the same number from
its rest class. This prompt is logic only; the screen comes in `02`.

## Read

`shared/exercise-rest.ts` (`restFor`, the classes), `shared/flow-run.ts`, `shared/set-detail.ts`,
`shared/strength.ts`, `shared/exercise-progress.ts`, `docs/gym-catalogue.md` (rest classes and sources).

## Build

1. New `shared/rest-hint.ts`, pure. One function, roughly:
   `restHint({ exerciseId, set, earlierSets, range, best, estimate, memberFactor, customRest })`
   → `{ seconds, reason }`.
2. The rule is: class time × effort × member factor, then clamped to 30–300 s and rounded to 5 s.
   - `customRest` set by the member wins outright (Custom layer).
   - Effort is worked out from **weight and reps only**. Do not use the time between sets or any other
     timing; the founder ruled it out as unreliable. Signals, each optional: reps against the flow's
     range; reps against the member's best at that weight; weight against their estimate; a drop in reps
     from the previous set. For a hold, the held seconds are the "reps".
   - With no signals, effort is 1 and the result equals today's class time.
   - Keep the weights of each signal in one exported table, with a comment naming the source for each.
     Find the sources yourself (rest and proximity to failure, for example Schoenfeld, Grgic, Refalo);
     put them in `docs/gym-catalogue.md` under a new "Rest follows effort" section. If the evidence for a
     signal is thin, say so there and keep its weight small.
3. `reason` is a short plain line for the screen: "A hard set. Take a little longer." / "An easy one."
4. `memberFactor`: a number near 1 that moves when the member taps "harder" or "easier" on the hint.
   Add `shared/rest-factor.ts` with the update rule (small steps, bounded 0.6–1.6), and store it as a
   personal metric (`shared/personal-metrics.ts`, key `gym.restFactor`), demo and Postgres.

## Tests

`tests/rest-hint.test.ts`: one bodyweight pull-up is near the floor; a set at the top of the range near
the member's best is clearly longer than the class time; a rep drop lengthens it; no signals equals
`restFor`; a custom rest is returned untouched; the clamp holds; conditioning and mobility stay short.

## Done when

The checks pass, the doc section exists with sources, and nothing on screen has changed yet.
