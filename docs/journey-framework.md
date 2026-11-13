# Journey framework

How every screen in Qram should treat a member: what it asks, what it gives back, and what it offers next.
This is the rule set new screens are built against and old screens are checked against.
It sits above the feature docs (`focus-planner.md`, `gym-catalogue.md`, `customflows.md`, `focus-onboarding.md`).
What the app is for, its names (Daily flow, Map flow, Body flow) and the order of work are in `vision.md`.
Where this page says "routine", read Daily flow; section 8 here is replaced by the order in `vision.md`.

Status: agreed direction, not built. The "Today" column in section 3 describes the app on 2026-11-13.

## 1. The problem this fixes

The features work one by one, but the member cannot see them work together.

- The first questions ("What are you here for?", place, time) save their answers and close. The member then
  sees a bare **Start** button that opens the same catalogue they would have seen anyway.
- A suggestion appears only when the member has no routine and no logged day. Everyone else gets nothing.
- Whatever the member picks (Better sleep, Coding, Supplements), the next step is two gym questions.
- Home → Yours showed **Start** while a workout was 79 minutes in.

## 2. The rule: ask, confirm, result, next

Every time the app takes input, it owes the member four things, in this order.

| Step | What the member sees | Fails when |
|---|---|---|
| **Ask** | One question, with why we ask in one line. Skippable unless the app cannot continue without it. | The question doesn't fit what they chose before. |
| **Confirm** | Their answer, said back in plain words, with a way to change it. | The answer vanishes and the screen just closes. |
| **Result** | What changed because of the answer: a plan, a filtered list, a number, an added exercise. | The app looks the same as before the answer. |
| **Next** | Exactly one main action. Other paths are quieter. | The button is a generic word, or there are several equal buttons. |

Three rules follow from it.

1. **No question without a result.** If we cannot show what an answer changed, we do not ask it yet.
2. **Every result carries its reason.** One line: "Because you train at home", "Chest is behind this week".
   Use `ReasonLine`. A reason names the member's own answer or their own logged data.
3. **Every answer can be found and changed later** in one place (Personalise), and changing it shows the
   result again.

## 3. Input ledger

Each input the app takes, and the response it owes. A new input is added here before it is built.

| Input | Where it is asked | Owed result | Today |
|---|---|---|---|
| Focus ("What are you here for?") | First visit to Yours | A Map flow for that purpose, with a reason, and Use this | One purpose, then only its questions. Gym place and time only when that purpose leads to gym flows. Use this fills slot 1. |
| Place (gym, home kit) | First visit for a gym purpose, Personalise | How many flows now fit | Asked on the first run only for a gym purpose. Personalise says the count after a change. |
| Time per workout | First visit for a gym purpose, Personalise | How many flows now fit | Same as place. |
| Lifts, body weight, lifestyle | Personalise, Your strength | How many flows now fit at the level those inputs set | The line shows after a lift or body weight is saved. |
| Priority areas | Personalise | "Added to 4 flows", with the count from the catalogue | The line shows after the areas are saved. The finisher is still tagged on the flow. |
| Adding a flow to the routine | Series sheet | The week it changes, and what it does to weekly sets | Calendar updates. No effect line on the save itself. |
| Swapping or removing an exercise | Equipment check, flow page | "This is now your version", with Put back | Done. |
| Finishing a workout | Run | What moved in Body flow, and what is next | Body flow updates. It is not shown from the finish screen. |
| Graduation choice (move up, not now) | Graduation card | The new flow in the routine, from which date | Done for "Switch". "Not now" is kept on the phone only. |
| Weekly review answers | Focus review, Sundays | Next week's plan, changed and labelled | Done, but visible on Sundays only. |

## 4. One surface for "what now": Today

Home → Yours answers one question: **what should I do now?** It shows one main card, picked by the first
rule that matches.

1. **A workout is in progress** → "Continue {flow}", with exercise 2 of 5 and the timer.
2. **First questions are not finished** → the next question.
3. **Something is on today's Daily flow** → a flow, with Start, or a lifestyle item, with Tick.
4. **Nothing is on today's Daily flow, and an area was planned by now and not done** → the suggestion, with its reason. A day that is already finished stays the result, even if an area is still missed.
5. **No Daily flow yet** → the starter for their focus, with Start and Add to routine.
6. **Everything is done** → today's result, and tomorrow's item.

The figure sits above that card: where the member is now, with the followed Map flow's predicted figure as a faint outline. Below the card, in order: today's remaining Daily flow entries, then anything waiting for a decision (the weekly review, which carries a graduation offer), then the Map flow shelf. Five slots. One is followed. An empty slot adds a Map flow.

- Yours never shows a button with no context. An empty state says what is missing and offers one way to fill it.
- The Flow map mind map and the Flow map / Daily switch are gone. Today is the day. Map flows are the shelf.
- Body flow opens from the figure and from the header icon. The weekly review sits under Today.

## 5. The journey by stage

| Stage | Member's question | What the app must show |
|---|---|---|
| Day 0 | "Is this for me?" | Their focus said back, one starter, one action. Under two minutes to the first Start. |
| First workout | "Am I doing it right?" | The run, then a finish screen: what they did, what it counted towards. |
| First week | "What do I do next?" | Today, with a routine made from the starter. Body flow begins to fill. |
| Each week | "Am I on track?" | The review: what was covered, what is behind, next week's change with reasons. |
| Each month | "Am I getting better?" | Graduation offers, level changes, Body flow since start. |

A member who chose a focus other than Workout follows the same stages with that focus's flows.
Gym questions are asked only when a gym flow is about to be shown.

## 6. Design language

How screens are drawn and put together (tokens, shared parts, layout, colour, floating layers) is in
`design-consistency.md`, Part 2. Its section 2.6 replaces "Floating layers" below.

The parts already exist in `mobile/src/design` (`Sheet`, `EmptyState`, `FilterChips`, `StickyActionBar`,
`ReasonLine`, `Stepper`, `Toast`, `Chip`, `Card`, tokens). The newer screens draw their own buttons and
sheets by hand. The rule is to use the shared part, and to add a part there when one is missing.

### Button words

A word means one thing everywhere.

| Word | Means | Never used for |
|---|---|---|
| **Start** | Begin this workout now | Opening a list or the catalogue |
| **Continue** | Go back into a workout in progress, or the next step of a form | |
| **Browse flows** | Open the catalogue | |
| **Add to routine** | Open the series sheet for this flow | Adding to the map |
| **Save** | Keep what is on this sheet and close it | |
| **Done** | Close; nothing left to save | |
| **Skip** | Leave this question unanswered | Dismissing a result |

### Screen parts

- **Questions.** One per screen, `Stepper` showing "2 of 3", Back always available, Skip where allowed.
  The last step is always a result screen, never a silent close.
- **Results.** Title says what we worked out. Then the reason line. Then one filled button, and at most
  one plain text action.
- **Empty states.** `EmptyState` with three parts: what this place is for, why it is empty, one action.
- **Filters.** One row. "For you" chips are the default state of that row, not a second row above it.
  A line under the row says what is applied: "Beginner · Gym · from your answers". Clearing is one tap.
  Level labels on a card are relative to the member only when the filter is theirs.
- **Lists to pick from** (for example, Add to Wednesday). Suggested for you first, with reasons. Then
  grouped by body part. Each row shows level, minutes and exercise count. Flows that share a name are one
  row with a level choice, not three rows.
- **Sheets.** `Sheet` only. A sheet covers the header and tabs behind it. Title on the left, close on the
  right, main action in a `StickyActionBar`.
- **Floating layers.** Only two things float: the tab bar and the in-progress workout pill. Every scrolling
  screen reserves space for both, so neither covers text or buttons. Nothing else is placed with
  `position: absolute` above content.
- **Feedback after a save.** A `Toast` for small changes ("Saved"). A result screen or an inline result
  line for anything that changes what the member is shown.

### Words

Plain words, short sentences, the member's own terms. Say "chest is behind this week", not "volume deficit".
A number always has its unit and its period ("8 sets this week").

## 7. Checklist for any screen

A screen is done when all of these are true.

- [ ] If it asks something, the ledger in section 3 names the result, and the result is on screen after the answer.
- [ ] Every suggestion or filter shows its reason.
- [ ] There is exactly one main action, and its word matches the table in section 6.
- [ ] The empty state says what, why, and what to do.
- [ ] Nothing is covered by the tab bar or the workout pill, with a workout running.
- [ ] It uses shared parts from `mobile/src/design`.
- [ ] The member can get back to change what they answered.
- [ ] It was opened on a phone, with a new account and with an account that has history.

## 8. Order of work

1. **Today on Home → Yours** (section 4), including the workout-in-progress case.
2. **First questions**: a follow-up and a result for each focus; gym questions only for gym focuses.
3. **Result lines for Personalise**: place, time, level and priority areas each say what they changed.
4. **Catalogue filters**: one row, with the "from your answers" line.
5. **Add to day picker**: suggested first, grouped, one row per flow name.
6. **Floating layers**: reserved space; the Flow map / Daily switch goes away with step 1.
7. **Finish screen → Body flow → next**: close the loop after every workout.
8. **Sweep**: move hand-drawn buttons and sheets in the newer screens onto the shared parts; fix button words.
