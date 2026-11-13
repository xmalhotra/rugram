# One app: design rules and the work to get there

Date: 2026-11-13. Scope: the mobile app (`mobile/`).

This page does three things:

1. Says whether the app follows its design language today (it does not), with the evidence.
2. Sets the rules for the whole app. Where this page and `mobile/DESIGN_SYSTEM.md` or
   `docs/journey-framework.md` section 6 give different numbers, this page wins.
3. Splits the work into packages written to be handed to a coding model as they stand.

Product direction is unchanged. `docs/vision.md` still says what the app is for, and
`docs/journey-framework.md` still says how a screen treats a member. This page is about how screens are
drawn and put together.

## Part 1. Where the app stands

The design language lives in two places: `mobile/DESIGN_SYSTEM.md` (colours, type, shared parts) and
`docs/journey-framework.md` section 6 (button words, screen parts, floating layers). The app follows the
colours and little else.

### Against `DESIGN_SYSTEM.md`

Counts across `mobile/src`, `mobile/app` and `mobile/App.tsx`.

| What | The rule | The code |
|---|---|---|
| Text sizes | 7 sizes | 30 sizes in about 1,250 hand-typed places. 9 places use the token. 14 (135 times), 18 (71) and 20 (44) are off the scale. 11, 10 and 9 are below the smallest size (30 places) |
| Section headers | Title is 22 | 15 different sizes. Most used: 18, 22, 20, 28, 17 |
| Corners | Card 20, control 14 | 28 radii in about 300 places. 2 places use the token |
| Spacing | 4 / 8 / 16 / 20 / 24 / 32 | About 1,700 hand-typed values, 25 token uses. 12 (243 times), 10 (120), 14 (99), 6 (93) are off the scale |
| Main button | Shared `Button`, a native capsule | 56 hand-built green rounded rectangles. The shared `Button` is a white capsule in dark mode. The app has two main buttons |
| Icons | `IconButton`, SF Symbols | `IconButton` is used 0 times. Back arrows are typed "←" at sizes 24, 26, 28 and 30. Ticks and chevrons are typed too |
| Loading | `Skeleton` | 2 files use it. "Loading…" as plain text in 17 places |
| Shared parts | listed as available | `SegmentedControl` 0 uses, `FilterChips` 0, `SearchBar` 0, `ProgressRing` 0, `StatusPill` 1, `StickyActionBar` 2 |
| Tap targets | — | 387 hand-built `Pressable`s in 101 files. Pressed opacity is 0.6, 0.7 or 0.8 depending on the file |

The shared parts skip the tokens too: `Chip` has radius 12, `Card` has gap 12, `EmptyState` and
`ReasonLine` type their sizes by hand.

### Against `journey-framework.md` section 6

| The rule | The code |
|---|---|
| Exactly one main action per screen | Home → Yours shows four identical "Add a Map flow" actions. The run screen shows a filled tick and a filled Next exercise together |
| Empty state: what, why, one action, through `EmptyState` | Each empty Map flow slot is a hand-drawn card that repeats the same sentence |
| Sheets: `Sheet` only, main action in `StickyActionBar` | 38 sheets, 2 with `StickyActionBar`. 9 screens outside the design folder open a raw `Modal` |
| Only the tab bar and the workout pill float; neither covers text or buttons | The pill covers the Slot 5 link in the screenshot. `position: 'absolute'` appears 55 times in 31 files |
| Every scrolling screen reserves space for both | Done with hand-typed bottom padding: 80, 120 and 128 in different places |
| Filters: one row, `FilterChips` | `FilterChips` is not used |

The floating rule cannot be met as written. A square that floats over the middle of a list always covers
something while the list scrolls. Space at the end of the page only helps at the end. Part 2 changes
the rule.

### What that looks like on three screens

**Home → Yours, Map flow.** Four empty slots, each a full card with the same sentence and the same green
link. About two screens of nothing. The sentence explaining what a Map flow is belongs under the heading,
once.

**Home → Yours, Share.** Rows sit bare on the background straight after a run of cards. Rows that can be
tapped and rows that cannot look the same. The list offers "Rest" (twice) and "Day 1" as things to share.
A third of the screen below is blank padding. The Yours / For you switch ghosts behind the clock when the
page scrolls.

**Workout run.** Five green things compete: the set outline, the tick, Next exercise, the back arrow and
the sound icon. Two clocks with no labels: 3:51 is rest, 0:06 is elapsed. "+30 s" and "−30 s" are buttons
that look like captions. The bottom bar takes a quarter of the screen and the Focus area picture is
smeared under its blur. Four button shapes on one screen.

### Why it happened

- The tokens were optional. Nothing fails when a screen types `fontSize: 18`.
- The scale was missing sizes people needed (12 spacing, a 20 header), so they typed them.
- The rules covered parts but not layout: no shared section header, no shared row, no shared glass
  surface, no rule for how much green a screen may hold.
- The shared `Button` is a native host that is awkward inside a row, so screens drew their own. (This is
  my reading of the code, not something recorded anywhere.)

## Part 2. The rules

### 2.1 Tokens

All in `mobile/src/design/tokens.ts`. A screen never types a number for these.

**Type.** Ten roles. Nothing below 12.

| Role | Size | Weight | Used for |
|---|---|---|---|
| `display` | 34 | semibold | The one big number or title on a screen (timer, finish screen) |
| `title` | 28 | semibold | Page title on a pushed screen, result title |
| `heading` | 22 | semibold | Sheet title, card title when the card is the main thing |
| `section` | 20 | semibold | Section header on a page |
| `headline` | 17 | semibold | Row title, card title, button label |
| `body` | 17 | regular | Reading text |
| `callout` | 16 | regular | Secondary text in a card |
| `subhead` | 15 | regular | The line under a title |
| `footnote` | 13 | regular | Reasons, units, labels |
| `caption` | 12 | regular | The smallest text. Tags, counts |

Two weights: regular (400) and semibold (600). Bold (700) only on `display` numbers. Numbers that change
(clocks, weights, reps) use tabular figures.

**Spacing.** `2 / 4 / 8 / 12 / 16 / 20 / 24 / 32`, named `xxs / xs / sm / ms / md / lg / xl / xxl` in
`space`. 12 (`ms`) is added because it is the real step between 8 and 16. Page layout values have their
own names in `layout`: `margin`, `section`, `cards`, `inset`, `inner`, `lines`.

**Corners.** `small` 10 (thumbnails, tags), `control` 14 (buttons, inputs, set rows, chips), `card` 20
(cards, sheets, anything that floats), `pill` 999 (circles, bars, capsules).

**Borders.** 1 point in the line colour. 2 points in the action colour marks the one active thing on a
screen. No 1.5.

**Heights.** `hit`: 44 on iPhone, 48 on Android, for anything tappable. `button`: 52 for a main or
secondary button.

**Pressed.** One value, opacity 0.6, set in the shared parts.

**Glass.** One recipe: blur 30, the background colour at 15% over it, 1 point line border, card radius.

### 2.2 Shared parts

A screen is built from these. If a screen needs something that is not here, the part is added to
`mobile/src/design` first.

| Part | State | What it is |
|---|---|---|
| `Text` with `variant` | change | Takes the ten role names. Screens stop passing `fontSize` |
| `Button` | change | One API: `variant` primary, secondary or text; `size` large or regular. Primary is green fill with dark text, 52 high, control radius. Secondary is a 1 point green outline. Text is green semibold with a 44 target. Drawn in React Native so it sizes properly in a row. Native controls stay for pickers, toggles, fields, dates and tabs |
| `IconButton` | change | SF Symbol or Material symbol, never a typed character. Two looks: plain, and outlined circle. Default colour is the text colour, not green |
| `SectionHeader` | new | Title in `section`, optional one line in `subhead` muted, optional text action on the right |
| `Row` | new | Title in `headline`, optional detail in `subhead` muted, optional leading picture, optional trailing value. Shows a chevron when it can be tapped and none when it cannot |
| `RowGroup` | new | The card that holds `Row`s and draws the hairlines between them |
| `Card` | change | Tokens only. Takes `onPress` so screens stop wrapping it in a `Pressable` |
| `GlassSurface` | new | The glass recipe. Used by the header, the run footer and the run bar |
| `TimerBar` | new | A labelled clock with a fill. The word (Rest, Elapsed, Hold) is required |
| `ProgressSteps` | new | The segmented step bar from the run footer, so other sequences can use it |
| `PageBar` | change | The header of every pushed screen and every full-screen sheet: back symbol, title, actions |
| `Skeleton`, `EmptyState`, `Banner`, `Toast` | keep | Tokens only. `EmptyState`'s action becomes a text `Button` |
| `Chip`, `FilterChips`, `SegmentedControl`, `StickyActionBar`, `ReasonLine`, `Stepper`, `StatusPill` | keep | Tokens only |

### 2.3 How a page is put together

- Side margin 16. Between sections 24. Between cards in a section 12. Inside a card 16, with 12 between
  parts and 8 between lines of text that belong together.
- A page is a list of sections. A section is a `SectionHeader` and then cards. Text does not sit bare on
  the page background, apart from the header's one subhead line.
- A list is one `Card` holding `Row`s, not a stack of separate cards, unless each item has a picture and
  is a thing to open (a flow, a pick, an event).
- One empty state per section. Never one per item.
- First load shows `Skeleton`. An error shows `Banner` with Retry. A small save shows `Toast`.

### 2.4 Actions and colour

- One primary button visible at a time. Everything else is secondary or text.
- Green means "tap here" or "this is on". A screen has at most one filled green element.
- Navigation and utility symbols (back, close, search, bell, sound, info) are the text colour.
- Green in a picture (worked muscles, the brand mark) is not counted, but nothing else on that screen
  should be green apart from the primary button.
- A tappable row shows a chevron. Text that is not a `Button` is never tappable.
- Button words follow `journey-framework.md` section 6.

### 2.5 Getting around

- **Main tabs** use the glass header with the brand mark and the sub-tab switch. The header has a solid
  cover over the status bar area so nothing shows behind the clock.
- **A thing** (flow, pick, event, member, exercise) opens as a pushed screen with `PageBar`.
- **A task** (add, edit, choose, confirm) opens as a `Sheet`, with its main action in a
  `StickyActionBar`.
- **A workout run** is the only full-screen cover.
- No screen opens a raw `Modal`.
- **Yours** means one thing on every tab: the member's own part of that area. The other sub-tabs are the
  shared side: what Qram and the community offer. Yours is always the first sub-tab, in the same place.
  Today Events puts it second (Upcoming / Yours / Hosting); it becomes Yours / Upcoming / Hosting.
- When Yours is empty, the tab opens on the shared side, and Yours shows one `EmptyState` saying what
  will appear there and how to add it.
- Home's second sub-tab is the community feed but is labelled "For you", which reads as another word for
  Yours. It becomes **Community**.

### 2.6 Things that float

This replaces the "Floating layers" rule in `journey-framework.md` section 6.

- Three things float: the header, the tab bar, and the run bar. Nothing else.
- The in-progress square becomes a **run bar**: full width, docked directly above the tab bar, on
  `GlassSurface`. It shows the state word, the clock, "3 of 5 · Day 1" and a chevron. Because it is
  docked to the edge, it never sits over the middle of a list.
- One hook, `useFloatingInsets()`, gives every scrolling screen the top and bottom space it must leave.
  The hand-typed 80, 120 and 128 paddings go.
- On Home → Yours the Today card already says Continue. The run bar still shows there, so the way back
  to a workout is in the same place on every tab.

### 2.7 The workout run

The run is the one screen where the member is busy and looking away. It gets its own rules.

- One clock at a time, in the bottom bar, with its word. Resting: "Rest 3:51" with the fill, and
  "+30 s" and "−30 s" beside it as secondary buttons. Otherwise: "Elapsed 0:06". The set card holds no
  clock.
- One filled green element. While sets remain, the tick on the active set is filled and Next exercise is
  outlined. When every set is done, Next exercise is filled.
- The active set keeps its 2 point outline. Done sets are plain rows.
- The bottom bar holds the clock, the step bar and the buttons. "Exercise 3 of 5" moves up under the
  exercise name.
- The scroll area leaves room for the bar. Nothing readable sits under the blur.
- Back, sound, info and play are `IconButton`s in the text colour.

## Part 3. Work packages

Each package stands alone and can be handed to a model as it is. Run them in order. P6 and P7 are large
and mechanical and can run in batches.

How to run one with Cursor:

```bash
cursor-agent -p --model grok-4.7-high --force "Read docs/build-prompts/README.md, then docs/design-consistency.md. Do package P2 exactly as written and nothing else."
```

### Status, 2026-11-13

P1 to P9 are built. Typecheck and both app bundles pass; the test suite has only the 30 server API
failures that were there before. Nothing has been checked on a device yet (Part 4 still applies).

| Count (outside `mobile/src/design`) | Before | After |
|---|---|---|
| Hand-typed sizes, corners, spacing | 2,736 | 83 |
| Hand-built tap targets (`<Pressable`) | 356 | 250 |
| Typed symbols (← › ✓) | 83 | 22 |
| Raw `Modal` | 11 | 1 (StoryViewer, exempt) |
| Plain "Loading…" text | 13 | 3 |

`tests/design-literals.test.ts` now holds these as the ceiling: no count may grow, and no new raw
`Modal` is allowed. What is left is deliberate: chips, toggles, rows holding pictures, values above 32,
computed sizes, and icons the shared set does not have yet (✕ ↗ ⌄ ⌖ ··· 🔔 in Events). The remaining
`Pressable`s are mostly chips, toggles and picture rows, which have no shared part yet.

### Rules for every package

- Read `docs/build-prompts/README.md`, then Parts 1 and 2 of this page, then every file the package
  names, in full, before changing anything.
- In `mobile/App.tsx` the tab called `'Flows'` in code is the **Home** tab on screen, and `'Discover'`
  is the **Flows** tab. Do not rename them as part of this work.
- Change how things look and are laid out. Do not change what a screen does, its data, its words (unless
  the package says so) or its accessibility labels.
- Colour only ever comes from `useTheme()`.
- Run `npm run typecheck` in `mobile/` and the test suite from the repo root before finishing. Say
  plainly what was not checked on a phone.
- Do not commit. List every file changed and anything left undone.

| Package | What | Kind | Suggested model |
|---|---|---|---|
| P1 | Tokens, `Text` roles, shared parts | Foundation | Strongest available; review on phone |
| P2 | A test that counts hand-typed values | Tooling | Grok high |
| P3 | Run bar, floating insets, header cover | Screen, shared | Strongest available; review on phone |
| P4 | Home → Yours: Map flow shelf and Share | Screen, small API change | Strongest available |
| P5 | Workout run screen | Screen | Strongest available; review on phone |
| P6 | Move every screen onto the tokens | Mechanical | Grok high, in batches |
| P7 | Buttons, icons, loading, sheets | Mostly mechanical | Grok high, then review |
| P8 | Pushed screens, raw modals, sub-tab order | Navigation | Strongest available |
| P9 | Turn the test into a gate; preview route; docs | Tooling, docs | Grok high |

### P1. Tokens, `Text` roles, shared parts

**Goal.** Everything in sections 2.1 and 2.2 exists in `mobile/src/design` and is shown on the
`/design-system` route. No screen changes yet.

**Read.** All of `mobile/src/design/`, `mobile/app/design-system.tsx`, `tests/neon-theme.test.ts`,
`mobile/src/RunFooter.tsx` (source of the glass recipe, timer bar and step bar).

**Build.**

1. `tokens.ts`: the type roles, spacing, corners, border, heights, pressed and glass values from 2.1.
   Keep the old names as aliases so nothing breaks.
2. `Text`: accept the ten role names in `variant`. A role sets size, line height and weight. A `style`
   colour still applies.
3. `Button`: the API in 2.2, drawn in React Native for both platforms. The old props (`secondary`,
   `destructive`, `disabled`) keep working.
4. `IconButton`: symbol names for both platforms, the two looks, a `tone` prop defaulting to the text
   colour.
5. New parts: `SectionHeader`, `Row`, `GlassSurface`, `TimerBar`, `ProgressSteps`. `Card` takes
   `onPress`.
6. Every existing shared part uses tokens only.
7. Add each part to `ComponentCatalogue.tsx`, in light and dark.

**Done when.** The design folder contains no hand-typed size, radius or spacing outside `tokens.ts` and
`NumberWheels.tsx`. Typecheck and tests pass. The app looks the same except that shared buttons are
green.

### P2. A test that counts hand-typed values

**Goal.** A number that shows the work shrinking, and later stops it growing back.

**Read.** `tests/neon-theme.test.ts` for the style of the existing tests.

**Build.** `tests/design-literals.test.ts`. It scans `mobile/src`, `mobile/app` and `mobile/App.tsx`,
skipping `mobile/src/design/`, and counts: number literals for `fontSize`, `borderRadius`, `gap`,
`padding*`, `margin*`; hex and `rgba()` colours; `<Pressable` outside the design folder; typed symbol
characters (← › ‹ → ✓) inside `<Text>`; `<Modal`. It prints the counts by file, and fails only if a count
is higher than the number stored in `tests/design-literals.baseline.json`. A flag rewrites the baseline.
Illustration files may be exempt by name, listed in the test.

**Done when.** The test passes with today's counts as the baseline.

### P3. Run bar, floating insets, header cover

**Goal.** Section 2.6. Nothing is covered on any tab while a workout is running.

**Read.** `mobile/src/RunPip.tsx`, `mobile/src/active-run.ts`, `mobile/App.tsx` (the header, `RootList`
and the `s.page` style), `mobile/src/HomeHeader.tsx`, `mobile/src/RootList.tsx`,
`mobile/src/HomeFeed.tsx` line 283, `mobile/app/(tabs)/_layout.tsx`.

**Build.**

1. `RunPip` becomes the run bar from 2.6. Same data, same tap, same spoken label. Paused uses the
   warning colour for the dot and the word only.
2. `useFloatingInsets()` in `mobile/src/design`: top is the header height, bottom is the tab bar plus
   the run bar when one is showing. `RootList` and every scrolling sheet use it.
3. Remove the hand-typed bottom paddings that existed for the pill or the tab bar (`HomeFeed.tsx`,
   `App.tsx`).
4. `HomeHeader` gets a solid cover in the background colour over the status bar area.

**Done when.** With a workout running, scroll each main tab top to bottom: the last item clears the run
bar, nothing shows behind the clock, and no page has a blank gap at the end.

### P4. Home → Yours: Map flow shelf and Share

**Goal.** The two sections read as one page built from the same parts.

**Read.** `mobile/src/MapFlowShelf.tsx`, `mobile/src/ShareFlow.tsx`, `mobile/src/HomeFeed.tsx`,
`docs/map-flow.md`, the share list route under `src/` that `ShareFlow.tsx` calls, and its tests.

**Build.**

1. Both sections start with `SectionHeader`.
2. Map flow shelf: filled slots stay as cards. All empty slots become one card. With nothing in Base it
   reads "Base" with the explaining sentence and a primary "Add a Map flow". Otherwise it reads
   "{n} empty slots" with a text "Add a Map flow" that fills the lowest free slot. The explaining
   sentence shows only while the member has no Map flow.
3. Share: one `Card` of `Row`s. Things ready to share come first, with a chevron. Things not yet ready
   follow with no chevron, the "2 more sessions" line and a thin progress bar. Show three of those, then
   a text "Show all".
4. Share list (server and demo store): leave out rest days. Where two entries have the same title, send
   the Map flow name as the detail line. Add tests for both.

**Done when.** With one Map flow followed and a workout running, Home → Yours shows the shelf in under
one screen, and Share lists no rest days and no two rows that read the same.

### P5. Workout run screen

**Goal.** Section 2.7.

**Read.** `mobile/src/FlowRun.tsx`, `mobile/src/RunFooter.tsx`, `mobile/src/ExerciseRunMedia.tsx`,
`mobile/src/SoundToggle.tsx`, `docs/build-prompts/02-set-rows.md`, `docs/vision.md` section 3A.

**Build.** Apply 2.7 line by line using `TimerBar`, `ProgressSteps`, `GlassSurface`, `Button` and
`IconButton`. Rest length rules, set logging and the spoken labels do not change. A paused run shows the
warning colour on the clock's word and border only.

**Done when.** On a phone, mid-rest and mid-set: one clock with a word, one filled green element, the
Focus area picture fully visible above the bar, and the rest buttons look like buttons.

### P6. Move every screen onto the tokens

**Goal.** No hand-typed type, corner or spacing value outside the design folder. Purely mechanical.

**Read.** `mobile/src/design/tokens.ts` after P1.

**Build.** Replace literals using this table. Do not redesign anything.

| Property | Old value → token |
|---|---|
| `fontSize` | 9, 10, 11, 12 → `caption`. 13 → `footnote`. 14, 15 → `subhead`. 16 → `callout`. 17, 18 → `body`, or `headline` when the weight is 600 or 700. 19, 20, 21 → `section`. 22, 23, 24 → `heading`. 25 to 29 → `title`. 30 to 36 → `display`. Above 36: leave, and list it |
| `fontWeight` | 500 → 400. 700 → 600, except on `display` |
| `borderRadius` | 6 to 12 → `small`. 13 to 17 → `control`. 18 to 26 → `card`. Half the element's height, or above 26 → `pill`. 5 and under: leave |
| `gap`, `padding*`, `margin*` | 2 → 2. 3, 4, 5 → 4. 6, 8 → 8. 10, 12 → 12. 14, 16, 18 → 16. 20 → 20. 22, 24, 28 → 24. 32 → 32. Above 32: leave, and list it |
| `borderWidth` | 1.5 → 1 |
| `minHeight` on a tap target | 40 to 48 → `hit`. 52 to 56 → `button` |

Prefer `<Text variant="…">` over a size in `style`. Work in this order, one batch per run: Home
(`HomeFeed`, `HomeHeader`, `MapFlowShelf`, `ShareFlow`, `TodayChecklist`, `BodyFlow*`), Flows
(`Flow*`, `Routine*`, `Training*`, `Workout*`, `Exercise*`), Profile (`YouProfile`, `Profile*`,
`Personal*`, `Strength*`, `About*`, `Account*`), Picks, Events, the rest, then admin and Studio.

**Done when.** `tests/design-literals.test.ts` shows zero for sizes, corners and spacing in the batch's
files, and the baseline is rewritten lower.

### P7. Buttons, icons, loading, sheets

**Goal.** No hand-drawn copies of shared parts.

**Build.** In the same batch order as P6:

1. A `Pressable` filled with the action colour becomes `Button` primary. An outlined one becomes
   secondary. A green text line that is tapped becomes `Button` text. Where a screen then shows two
   primary buttons at once, keep the one that moves the member forward and make the other secondary,
   and list the screen.
2. Typed ←, ›, ‹, →, ✓ become `IconButton` or a symbol. Navigation symbols take the text colour.
3. "Loading…" text becomes `Skeleton` in the shape of what is loading.
4. A sheet's main action moves into `StickyActionBar`.
5. A section title drawn by hand becomes `SectionHeader`. A hand-drawn list row becomes `Row`.

**Done when.** The test's counts for `Pressable`, typed symbols and loading text are at or near zero in
the batch's files, with any that remain listed and explained.

### P8. Pushed screens, raw modals, sub-tab names

**Goal.** Section 2.5.

**Read.** `mobile/App.tsx` (the top bar and the inline detail logic), `mobile/src/design/PageBar.tsx`,
`mobile/src/design/DetailSurface.tsx`, `mobile/app/flow/[id].tsx`, `mobile/app/pick/[id].tsx`,
`mobile/app/event/[id].tsx`, `mobile/app/member/[id].tsx`, `docs/detail-navigation.md`, and the nine
files that open a raw `Modal` (`BodyFlow`, `EquipmentCheck`, `TrainingWeek`, `TrainingSession`,
`ExerciseSequence`, `StoryViewer`, `SeriesSheet`, `RoutineCalendar`, `NotificationCentre`).

**Build.** Every pushed screen and full-screen sheet uses `PageBar`. Each raw `Modal` becomes a `Sheet`,
or a pushed screen where it shows a thing. Sub-tabs: keep the name Yours everywhere. Move Events → Yours
to first place. Rename Home → For you to Community (`mobile/src/HomeHeader.tsx`). A tab whose Yours is
empty opens on its shared side. Update the docs that name them.

**Done when.** Back looks and sits the same on every screen that has it. The test counts no `Modal`
outside the design folder.

### P9. Turn the test into a gate

**Build.** `tests/design-literals.test.ts` fails on any count above zero, apart from the named
exemptions. `mobile/DESIGN_SYSTEM.md` is rewritten to match Part 2. `docs/journey-framework.md` section
6 points here for floating layers. Every shared part is on `/design-system`.

**Done when.** A new screen that types `fontSize: 18` fails the test.

## Part 4. Check on a phone

Typecheck and tests do not show how a screen looks. After P3, P4, P5 and each batch of P6 and P7, open
the changed screens on an iPhone in dark and light, at the default and the largest text size, with a
new account and an account with history, and with a workout running.

## Decisions built into this page

These are my recommendations. Say so if any should go the other way, before P1 starts.

1. The main button is a green rounded rectangle drawn in React Native, not the native white capsule.
2. Empty Map flow slots become one card.
3. The in-progress square becomes a bar docked above the tab bar.
4. Rest days are never offered in Share.
5. Yours stays on every tab as the member's own part, always first. Home → For you becomes Community.
