# 02 · Workout screen: edit in place, one row at a time

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3A. Needs `01`.

## Goal

Logging a set is one tap and never leaves the screen. The founder's words on today's screen: changing a
set opens a different sheet and breaks focus; the app assumes four sets; a rest of minutes holds the
screen after one easy set.

## Read

`mobile/src/FlowRun.tsx` (large; read all of it), `mobile/src/TrainingSession.tsx`,
`mobile/src/design/NumberWheels.tsx`, `shared/flow-run.ts`, `shared/rest-hint.ts`, `src/lib/flow-run-store.ts`.

## Build

1. **Set rows.** Show the sets already done, and exactly one next row. Logging it adds the next.
   No empty rows for sets not done. The flow's count appears once as a quiet line: "3 planned".
2. **Edit in place.** Reps and weight on the next row are changed on the row itself: tap the number, the
   row is highlighted, and at the same moment a wheel opens inline under that row (reuse `NumberWheels`), with the rest of the screen still visible and
   scrollable. No `Sheet`, no modal, no navigation. A done row can be corrected the same way.
3. **Carry forward.** The next row starts from the last logged set of this exercise in this workout.
   The first row starts from the member's last time, then their estimate, then the flow (existing order).
4. **No quota.** The member can move to the next exercise after any number of sets, including more than
   planned. Nothing is labelled incomplete or skipped because the count differs. Check that Body flow,
   graduation and history read logged sets, not planned ones; fix any that assume the plan.
5. **Rest hint.** After a set is logged, a small count runs on the next row with the `reason` from
   `restHint` (built in `01`; pass the logged set, earlier sets of this exercise, the range, the member's
   best at that weight, their estimate and `gym.restFactor`). It never blocks: the next row is live at
   once. Two small taps on the hint: "harder" adds 30 s to the count now, "easier" takes 30 s off; each
   also saves `nextRestFactor` (`shared/rest-factor.ts`) to `gym.restFactor`. Remove the full-screen rest phase and any "skip rest" step. The workout pill keeps working.
6. **Finish.** One short screen: what was done, and what is next today. (The figure is added in `03`.)
7. **Swaps move before Start.** Remove the equipment step that appears once a workout has begun
   (`mobile/src/EquipmentCheck.tsx`). Put the same check on the flow's page (`mobile/src/FlowCatalogHome.tsx`),
   before Start: each exercise shows its equipment and a Swap, and the result is the member's Custom flow.
   During the workout, keep only a quiet Swap on exercises not yet begun. Never a prompt.
8. Keep everything else the run does today: supersets, how-to loops, the timer, the pill, the
   strength hint, finishers. Supersets alternate rows the same way, one next row per exercise.

## Tests

Logic you move into `shared/` (next-row values, "can move on", superset order with open-ended sets) gets
tests. Update `tests/flow-run-store.test.ts` for runs with fewer and more sets than planned.

## Done when

The checks pass and the report lists, step by step, how to log a three-exercise workout on the phone with
one tap per set. Say plainly that the screen was not opened.
