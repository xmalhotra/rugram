# 10 · Following someone else's flow

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3E. Needs `08`.

## Goal

A member can try another member's Custom flow for a few sessions and return to their own with no
clean-up. The same for a shared Daily flow; a shared Map flow is copied into a free slot.

## Read

`shared/flow-series.ts` (exceptions, item kinds, including `community`), `shared/graduation.ts`
(`routineSwitchPlan` is the closest existing pattern), `shared/customflows.ts`, `src/lib/customflow-store.ts`,
`src/lib/flow-series-store.ts`, `shared/community-flows.ts`, `shared/map-flow.ts`, `docs/customflows.md`.

## Build

1. `shared/follow.ts`, pure: `followPlan({ theirFlow, myMapFlow, where, sessions, after })` returning the
   series changes. `suggestReplacement` picks the flow in the member's followed Map flow that trains the
   most similar areas (reuse the muscle maps), with a reason.
2. Migration `049` and store: a follow record (which series is paused, what replaces it, sessions left,
   what happens after). The member's own series is paused, never deleted. Each finished session counts
   one down. At zero the pause lifts by itself, and the weekly review says so.
3. A followed flow is a snapshot of the owner's Custom flow without private data. The member running it
   gets their own weights (Personalised layer). If they change it, it becomes their own Custom flow and
   keeps "from q_name".
4. **One sheet, three questions, each with a default chosen**: Where (replace the suggested flow, or add
   on a day); For how long (1 session, 4 sessions, until I stop; default 4); Then (go back to mine, or
   keep it; default go back). The sheet shows the predicted figure before and after.
5. After confirming: the result, with the dates it applies to and "Stop following" available from the
   Daily flow at any time.

## Tests

Countdown; auto-return; stop early; "keep it" converts cleanly; history is untouched; no private field
crosses; following when there is nothing similar to replace falls back to "add on a day".

## Done when

The checks pass and `docs/customflows.md` has a "Following" section.
