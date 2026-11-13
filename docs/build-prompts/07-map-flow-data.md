# 07 · Map flow: storage and API

Read `README.md` in this folder first. Vision: `docs/vision.md`, sections 3D and 5. Needs `04`–`06`.

## Goal

A Map flow is a regime: Daily flows repeating in a pattern, with a stated style (single body-part days,
supersets, hybrid, calisthenics alongside gym movements). It is not a week and not seven items. Its
picture is its predicted Body flow. A member has five slots; slot 1 is their base; one is followed at a
time. This prompt builds the data and the API, with no screens.

## Read

`shared/flow-series.ts`, `src/lib/flow-series-store.ts`, `src/app/api/mobile/series/route.ts`,
`db/migrations/045_flow_series.sql`, `shared/predicted-body-flow.ts`, `shared/daily-flow.ts`,
`docs/migrations.md`, and the Next.js route handler guide named in `AGENTS.md`.

## Build

1. Migration `048`: `map_flows` (owner, slot 1–5 unique per owner, name, style, purposes, how the pattern
   repeats: in turn or pinned to weekdays, source kind and id, timestamps); `map_flow_days` (the Daily
   flows of a Map flow, in pattern order, each with its flows and items; a rest day is a Daily flow too);
   `map_flow_follows` (owner, map flow, from date) for which one is followed; a `map_flow_id` on series
   and on the member's daily items. Style values are data in `shared/map-flow-styles.ts`. Backfill: every member with series gets slot 1, named
   "Base", holding everything they have. The migration must be safe to run twice.
2. `shared/map-flow.ts`, pure: schemas; `followedMapFlow(follows, date)` (the latest follow on or before
   the date, then slot 1); `dailyFlowOn(mapFlow, followedFrom, done, date)` (which Daily flow
   of the pattern falls on a date). Two ways of repeating: *in turn*, the default, where the pattern is a
   loop of any length and the next Daily flow is the first one not yet done, so a missed day shifts the
   plan and skips nothing; and *pinned to weekdays*, allowed only for a seven-day pattern, where a missed
   Daily flow is offered again on the next rest day or let go by the member, never dropped silently; `plannedByNow` (what the pattern planned up to a date,
   which is the input for "missed" in Body flow); `copyMapFlow(source, slot)` producing new series and items with no private
   data (no weights, no logs); slot rules.
3. `src/lib/map-flow-store.ts`, demo and Postgres: list with predicted figure for each, create in a free
   slot from a template or a copy, rename, clear a slot (never slot 1 while it is the only one), follow
   from a given date, go back to base.
4. `src/app/api/mobile/map-flows/route.ts`: the actions above, authenticated like the series route.
5. Series reads take the followed Map flow into account: the calendar for a date shows the Daily flow of the
   Map flow followed on that date. Body flow's "missed" now compares against `plannedByNow`. Past days keep what was done, whatever is followed now.
6. Ready Map flows from Qram, as data: `shared/map-flow-templates.ts`, each with its purposes, style, level,
   place, minutes and its Daily flows in pattern order (reuse the written Daily flows from `06`). At least
   one per purpose and level, and between them at least four different styles and patterns of three,
   five and seven days. Each style in `shared/map-flow-styles.ts` carries its spacing rules as data (for
   hybrid: heavy lower-body work apart from hard runs, at least one rest or easy day), with a source for
   each rule that you find and cite in `docs/map-flow.md`. A test checks every template against its
   style's rules. A Map flow must be reproducible: copying one yields the same pattern and style.

## Tests

Slot limits; backfill shape in demo mode; `dailyFlowOn` for a three-day pattern in turn and for a
weekday-pinned one; following from a later date leaves earlier days alone; history survives a
switch; back to base; a copy carries no private fields; a template's predicted figure covers its purpose.

## Done when

The checks pass, the API works in demo mode (show the calls in the report), and the app is unchanged.
