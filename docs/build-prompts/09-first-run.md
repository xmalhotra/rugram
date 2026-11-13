# 09 · First run ends on a Map flow

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3G;
`docs/journey-framework.md`, sections 2 and 3. Needs `08`.

## Goal

Today the first questions save their answers and close, and every focus is followed by gym questions.
After this, the first two minutes say what Qram is, ask only what the chosen purpose needs, and end on a
Map flow the member can start.

## Read

`mobile/src/ColdStart.tsx`, `mobile/src/HomeFeed.tsx`, `shared/focus.ts`, `shared/starter-flow.ts`,
`shared/flow-defaults.ts`, `shared/member-level.ts`, `shared/map-flow-templates.ts`,
`mobile/src/PersonaliseFlows.tsx`, `docs/focus-onboarding.md`.

## Build

1. **One opening screen**: Qram means sequence; this app gives you a sequence for your day, starting with
   training. One button: Continue.
2. **Purpose**: chosen from `offeredPurposes()`, which lists only purposes Qram can tailor a journey for.
   One purpose here; more are added later as further Map flows. Then **only the questions that purpose
   needs**, from the same data.
   Gym place and time are asked only for purposes that lead to gym flows. Use `Stepper`; Back and Skip work.
3. **Confirm**: the answers said back in one screen, each changeable.
4. **Result**: Qram's shelf of ready Map flows that fit, the best one first with its reason and its
   predicted figure. One main button: "Use this". It fills slot 1 and lands on Today.
5. A purpose with no ready Map flow yet gets an honest result: the starter flow for that focus, and a
   line saying more is coming. Never a blank screen or a bare button.
6. **Personalise** uses the same rule from now on: changing place, time, level inputs or priority areas
   shows a result line saying what changed ("12 flows now fit", "Added to 4 flows").
7. Members who already have series skip all of this.

## Tests

Purpose → questions mapping; the pick of the recommended template for a set of answers; skipped answers
still give a result.

## Done when

The checks pass and the report gives the tap count from first open to a workout starting.
