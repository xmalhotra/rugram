# 08 · Home → Yours: the figure, Today, and the Map flow shelf

Read `README.md` in this folder first. Vision: `docs/vision.md`, sections 3B and 3D;
`docs/journey-framework.md`, section 4. Needs `07`.

## Goal

Home → Yours answers "what do I do now?" and shows the member's dimensions. Body flow stops being only an
icon by the bell: it is the top of this screen. The Flow map mind map and the floating Flow map / Daily
switch go away.

## Read

`mobile/src/HomeFeed.tsx` (the Yours parts), `mobile/src/ColdStart.tsx`, `mobile/src/RunPip.tsx`,
`mobile/App.tsx` (header, `BodyFlowHeaderButton`), `mobile/src/BodyFlow.tsx`, `mobile/src/FocusReview.tsx`,
`mobile/src/YouProfile.tsx` (it links to Flow map), `shared/today.ts`.

## Build

1. **Top: the figure.** Where the member is now, with the followed Map flow's predicted figure as a faint outline
   being filled in. Tapping opens Body flow. The header icon stays as a shortcut.
2. **Today: one main card**, chosen by the first rule that matches (put the rule in `shared/today.ts`, tested):
   a workout is in progress → Continue; first questions unfinished → next question; something is on
   today's Daily flow → that item with Start; nothing today and an area is missed → the
   suggestion with its reason; no Daily flow yet → the starter; everything done → today's result and
   tomorrow's item. Never a bare button with no context.
3. **Below**: today's remaining Daily flow entries, then anything waiting for a decision (graduation,
   weekly review).
4. **Map flow shelf**: five cards. Each shows its predicted figure, name, style in a few words, and
   "Following" on the followed one. Opening a card shows its Daily flows in pattern order. An empty slot offers "Add a Map flow" (Qram's shelf, or a copy of one's own).
5. **Switching**: tapping another card shows the two predicted figures side by side with the comparison
   lines and the two styles, then "Follow from today" / "Follow from tomorrow". "Back to base" is always present when the
   followed one is not slot 1. After the choice, show the result: the next few days under the new regime.
6. Remove the mind map and the switch from Yours. Keep the mind map code only if something else uses it;
   say which in the report. Update the profile link.
7. Reserve space so neither the tab bar nor the workout pill covers anything, with a workout running.

## Tests

`tests/today.test.ts` for the six rules and their order.

## Done when

The checks pass and the report walks through Yours for three members: brand new, mid-workout, and one
with two Map flows. Say plainly that the screen was not opened.
