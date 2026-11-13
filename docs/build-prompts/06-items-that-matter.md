# 06 · Items that say what they help, linked to Picks

Read `README.md` in this folder first. Vision: `docs/vision.md`, section 3C. Needs `05`.

## Goal

A Daily flow holds only items that change the outcome, and each one says so. Qram writes the Daily flow
for a purpose; the member starts from it. A product item leads to named brands. Creatine at 5 g is the
worked example of the pattern, not a special case in code.

## Read

`shared/routines.ts`, `shared/routine-seed/`, `shared/training-supplements.ts`,
`shared/supplement-picks.ts`, `shared/supplement-shortlists.ts`, `shared/pick-ranking.ts`,
`shared/flow-picks.ts`, `mobile/src/PicksBrowser.tsx`, `mobile/src/PickDetails.tsx`,
`docs/supplement-literacy.md`, `docs/training-supplements.md`, `docs/pick-decision-experience.md`.

## Build

1. **Item fields** (schema in `shared/`, data in a data file): amount, timing, `helps` (per purpose, a
   short list such as Strength, Muscle size, Recovery, Sleep), `source` (a linked study or review), and an
   optional `pickCategory`. An item with no source cannot be in a written Daily flow; a test enforces this.
2. **The bar.** Write the rule in `docs/daily-flow-items.md`: what gets in, what stays out (hygiene items
   such as water and steps), and the evidence grade needed. Apply it to the existing seed and report what
   would be dropped; do not delete seed data, flag it.
3. **Purposes are data** (`shared/purposes.ts`): name, the areas and skills it needs, the questions it
   asks. Start with: gain muscle, get stronger, visible abs, move better (mobility), do a handstand,
   compete in HYROX. Adding one must need no logic change. A purpose is shown to members only when Qram can tailor the
   journey for it: it has questions, written Daily flows and (after `07`) a ready Map flow. Write that as
   one function, `offeredPurposes()`, with a guard test.
   **Written Daily flows by purpose**, as data, for each of those.
   Each lists its flows by slot (for example "upper day") and at most three items to start, with stages
   by week. Research the items yourself from primary sources and position statements (for example ISSN);
   write the reasoning and links in the doc. Amounts are the standard studied dose, worded as what the
   flow contains.
4. **On the item**: name, amount and timing, "Helps: …", a source link, and **See picks** when it has a
   `pickCategory`.
5. **Picks link.** See picks opens the ranked list for that category and returns to the Daily flow.
   The ranking criteria are shown on the list (tested by a third party, dose per serving, price per dose,
   sold in India), each pick says why it ranks there, and nothing is paid. A saved or bought pick shows on
   the item. Brands are data: use what the catalogue has; do not invent products or prices.
6. **Changes over time** are proposed in the weekly review (`mobile/src/FocusReview.tsx`) with a reason,
   and applied only on the member's yes.

## Tests

Schema and source guard; a purpose yields its written Daily flow; stages by week; an item resolves to its
pick list; a saved pick is reflected on the item.

## Done when

The checks pass and a demo member with the purpose "build muscle" has a day containing a workout and one
item that shows what it helps, its source, and a route to named brands.
