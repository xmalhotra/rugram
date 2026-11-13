# 05 · Routine becomes Daily flow

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3C.

## Goal

Today there are two half-features: a series calendar ("Routine") holding flows, and a checkpoint day
("Daily") holding routines and items. They become one thing called **Daily flow**: one day, in order,
with flows and lifestyle items together. A Daily flow is one day of a regime. Several of them repeating
in a pattern form a Map flow, which comes in `07`; do not build the pattern here.

## Read

`mobile/src/HomeFeed.tsx` (`DailyTab`), `mobile/src/RoutineCalendar.tsx`, `mobile/src/SeriesSheet.tsx`,
`mobile/src/RoutineCatalog.tsx`, `mobile/src/routines.ts`, `mobile/src/daily-checks.ts`,
`shared/flow-series.ts`, `shared/routines.ts`, `shared/daily-checks.ts`, `shared/today.ts`,
`src/lib/flow-series-store.ts`, `docs/calendar.md`.

## Build

1. **Words.** Every member-facing "Routine" becomes "Daily flow" ("Add to routine" → "Add to Daily flow").
   Internal names may stay; list in the report any you renamed.
2. **One day.** `shared/daily-flow.ts`, pure: merge a day's series occurrences and its checkpoint items into
   one ordered list, by time then checkpoint order. Each entry is a flow or an item, open or done.
3. **The day view** shows that list. A flow is done by doing it. An item is ticked with one tap.
   Day, week and month spans stay; the week view shows both kinds.
4. **The add sheet** ("Add to Wednesday"): suggested for the member first, each with a reason; then grouped
   by body part; one row per flow name with a level choice inside the row, not three rows named "Arms";
   each row shows level, minutes and exercise count. The sheet covers the header behind it (`Sheet`).
5. **After adding**, show the result on the sheet before it closes: the day it lands on and what it does
   to the predicted figure (use `comparePredictions` from `04`).
6. Nothing stored is lost. Existing series and ticks appear unchanged in the merged day.

## Tests

`tests/daily-flow.test.ts`: ordering, done states, a day with only items, a day with only flows, a rest day.

## Done when

The checks pass, the word "Routine" no longer appears to a member, and `docs/calendar.md` describes the
merged day.
