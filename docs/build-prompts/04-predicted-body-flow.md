# 04 · Predicted Body flow

Read `README.md` in this folder first. Vision: `docs/vision.md`, sections 3B and 3D. Needs `03`.

## Goal

Given a plan (Daily flows in a repeating pattern), draw the Body flow that following it would produce.
The prediction belongs to the plan as a whole. There is no separate day or week prediction. This is the
picture of a Map flow, and it appears wherever a member is about to change their plan.

## Read

`shared/body-flow.ts`, `shared/flow-series.ts` (`occurrences`), `shared/series-impact.ts`,
`shared/priority-finisher.ts` (`memberGymItems`), `shared/customflows.ts`, the figure component from `03`.

## Build

1. `shared/predicted-body-flow.ts`, pure: `predictBodyFlow(plan, member)` returns the same shape the
   figure already takes, built from planned sets over one full pass of the pattern, whatever its length (three days, five, nine).
   It must use what the member would actually run: their Custom flow, swaps and priority finishers.
2. `comparePredictions(before, after)`: the areas that gain, lose, or become missed. Returns plain lines
   ("Adds hamstrings", "Calves are no longer covered").
3. Reuse, do not copy, the counting rules in `shared/body-flow.ts` (main 1, helper 0.5, conditioning 0).
   If that needs a small refactor so logged and planned sets share one function, do it and keep the tests green.
4. Show it in two places now (others come with later prompts):
   - A flow's page (`mobile/src/FlowCatalogHome.tsx`): "What this adds to your Map flow", figure plus lines.
   - The series sheet (`mobile/src/SeriesSheet.tsx`): before and after, when adding or removing a flow.

## Tests

`tests/predicted-body-flow.test.ts`: a three-day plan lights the expected areas; a swap changes the
picture; removing the only leg day marks legs missed in the comparison; an empty plan is all quiet;
prediction for a plan equals the actual figure after logging exactly that plan.

## Done when

The checks pass, and prediction and actual come from one counting function.
