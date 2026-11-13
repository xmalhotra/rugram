# 03 · Body flow as a picture

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3B.

## Goal

Body flow opens on the figure alone: worked areas in one colour, missed areas in a second, clearly
different colour. No numbers on that view. A member should know what they missed this week in three
seconds. Numbers move behind a details panel.

## Read

`mobile/src/BodyFlow.tsx`, `mobile/src/BodyMap.tsx`, `mobile/src/body-flow.ts`, `shared/body-flow.ts`,
`shared/body-flow-actions.ts`, `shared/focus-targets.ts`, `mobile/src/design/tokens.ts`, `docs/focus-planner.md`.

## Build

1. **Three states per area**, decided in `shared/body-flow.ts` and tested: *worked* (deeper with more
   work, in three steps), *missed* (planned or due, and not done in the range), *quiet* (neither).
   "Missed" uses the same targets the planner uses; do not add a second rule. Keep the rule behind one
   function, because prompt `07` changes its input to "what the followed Map flow planned by now".
2. **Colours.** Add a "missed" colour to the tokens for light and dark. It must be distinct from the
   brand colour for colour-blind members (check contrast; do not rely on red against green). Add a
   two-item legend: Worked, Missed.
3. **The opening view**: the figure, the range switch (this week by default), one line naming the most
   important thing with one action, and nothing else.
4. **Details**: a pull-up panel holding everything that is on screen today (sets per area, bands, ranges,
   mobility joints, priorities). Nothing is deleted, only moved.
5. **Tapping an area** shows flows that cover it: from the member's plan first, then the catalogue.
6. **A reusable figure.** Export one small component (figure plus optional legend, sized by a prop) so
   other screens can show it. Use it on the workout finish screen from `02`, lighting today's work.
7. Mobility joints keep working on the figure. Accessibility: each area has a spoken label with its state.

## Tests

`tests/body-flow.test.ts`: the three states, the step boundaries, a priority area that is behind counts
as missed, conditioning adds no muscle work (existing rule).

## Done when

The checks pass and the opening view has no digits on it apart from dates.
