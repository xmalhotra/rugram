# Qram vision and instruction set

Qram (क्रम) means sequence. The app's promise: **to reach a goal, follow a sequence of things that matter,
day after day.** It is a lifestyle app. Fitness is the first area it covers fully.

This document is the instruction set for building towards that. It was set down from the founder's
description on 2026-11-13. Where it disagrees with an older doc, this one wins (section 8 lists what changed).
Screen behaviour follows `journey-framework.md`.

## 1. The words

Six things, and only these names are used in the app.

| Name | What it is | Exists today as |
|---|---|---|
| **Catalogue** | Every exercise, movement, food, supplement and habit Qram knows. Raw material. | Exercise library, routine items, Picks catalogue |
| **Flow** | A sequence written by Qram (later, by creators). The baseline. | 57 gym flows, running, HYROX, other flows |
| **Custom flow** | A member's own version of a flow: swaps, order, sets, weights. | Customflows (built) |
| **Daily flow** | One day of a regime: the flows for that day, plus the few lifestyle items that matter. | "Routine" (series calendar) and "Daily" (checkpoint items), as two separate things |
| **Map flow** | A regime: Daily flows repeating in a pattern, with a stated way of training. One dimension of a member's life. Its picture is the **predicted Body flow**. A member keeps up to five and follows one at a time. | Storage, API, and Home → Yours (`docs/map-flow.md`). The mind map is gone. |
| **Body flow** | A picture of the member's body: what their flows have worked, what they have missed, and what a Map flow will do. The centre of the app. | Figure on Home → Yours and from the icon by the bell. Missed areas come from the followed Map flow. |

Around them: **Picks** (the best product for an item in a Daily flow), **Community** (sharing a Custom flow,
Daily flow or Map flow), **Events** (a host runs a flow at a place; people sign up and check in).

How they connect:

```
Catalogue → Flow → Custom flow → Daily flow → Map flow
                        │             │           │
                        └── doing it ─┴→ Body flow (what happened)
                                      Map flow → predicted Body flow (what will happen)
Daily flow item → Picks (which one to buy)
Custom flow / Daily flow / Map flow → shared in Community → followed by others
Flow → Events (done together, at a place)
```

## 2. Principles

1. **Sequence first.** Every screen shows where the member is in a sequence and what comes next.
2. **Qram gives the baseline; the member owns the result.** We write the starting structure. Sets, rest,
   order and exercises are the member's call, and nothing they set is overridden.
3. **Tracking is the smallest part.** Logging a set is one tap. Nothing about logging opens another screen.
4. **Body flow is the centre.** Every choice (a flow, an item, a Map flow) shows what it does to the picture.
   It is a picture, not a table. Numbers are one tap away for those who want them.
5. **Only what matters goes in a Daily flow.** "5 g creatine" belongs. "Drink water" does not.
6. **We do the planning.** A member states a purpose; Qram proposes the Daily flow and Map flow. Catalogues
   are for swapping, not for building a life from scratch.
7. **Name the best one.** When a Daily flow item is a product, Picks says which brands are worth buying.
8. **Everything can be copied, and everything can be undone.** Following someone else's flow is easy,
   time-boxed, and the member can always go back to base.

## 3. Instructions by area

Each area lists what exists, what to do, and when it is done.

### A. Doing a workout (tracking)

Exists: run screen with a set table, wheels for reps and weight in a separate sheet, a fixed number of set
rows from the flow, a rest timer from the rest class (a weighted pull-up is "heavy compound", 150 s),
and an equipment check that offers swaps once the workout has begun.

Do:

- **Swap before starting.** Equipment cannot be counted on, so every exercise can be swapped. The place for
  it is the flow's page, before Start, where the result becomes the member's Custom flow. The workout does
  not open with an equipment step. A quiet swap stays on each exercise not yet begun, for a machine that
  turns out to be taken; it is never a prompt.
- **Edit in place.** Tapping a set highlights that row and opens the scroll wheel right there, on the same
  screen, at the same moment. No sheet opens and nothing else moves away.
- **One set at a time.** Show the sets already done and one next row. Logging it brings the next row.
  No empty rows for sets not yet done.
- **The plan is a guide, not a quota.** The flow's set count shows as a quiet line ("3 planned").
  Doing fewer or more is fine, and nothing is marked incomplete. Moving to the next exercise is always available.
- **Carry values forward.** The next row starts with the last set's reps and weight. A new exercise starts
  from the member's last time, then the estimate, then the flow.
- **Rest is a hint, never a gate.** After a set, a small count runs on the row. The next set can be logged at
  any moment. No full-screen rest, no "skip rest" step.
- **Rest follows the set just done.** The hint is the rest class time, scaled by how hard that set was.
  One easy pull-up earns about a minute; twenty to the limit earns up to five. Effort is read from **weight
  and reps only**, with nothing extra to enter. Timings between sets are not used; they are not reliable.
  - reps against the flow's range and against the member's best at that weight
  - weight against their estimate for the exercise
  - a drop in reps from the previous set (a sign of fatigue)
- One optional tap on the hint, "harder" or "easier", moves it by 30 s and teaches the member's own factor.
- The hint stays between 30 s and 5 min. A rest the member sets themselves is kept (Custom layer).
- **Finish is short.** One screen: the body figure with today's work lit, and what is next in the Daily flow.

Done when: a full exercise can be logged with one tap per set and no screen change, on a phone, one-handed.

### B. Body flow

Exists: front-and-back figure, areas shaded by sets against a target band, joints for mobility, ranges
(week, month, since start), counts and target bands on screen, priority tags. Reached from the top of Home → Yours and from an icon by the bell. Missed areas are what the followed Map flow planned by now and was not done.

Do:

- **Open on the figure alone.** Worked areas in the brand colour, deeper with more work. **Missed areas in a
  second, clearly different colour.** No numbers, no bands, no tables on this view.
- One line under the figure: the most important thing ("Legs are missed") and one action.
- **Details behind a pull-up panel**: the matrix of sets per area, target bands, ranges, trends.
- Tapping an area shows what would cover it: flows from the member's Map flow first, then the catalogue.
- **Predicted Body flow.** Given a Daily flow, the app draws the figure that following it produces: the
  same colours, from the planned sets instead of logged ones. This is the picture of a Map flow.
- **Present wherever a choice is made**, not only behind the icon:

| Place | What the figure shows |
|---|---|
| Home → Yours, top | Where the member is now, with the followed Map flow's predicted figure as a faint outline to fill |
| A flow's page | What this flow adds to the member's Map flow |
| Adding or removing a flow in a Daily flow | Before and after |
| A Map flow card | The predicted figure for that Map flow |
| Switching Map flow | The two predicted figures side by side |
| End of a workout | Today's work lighting up |
| A shared Map flow or Daily flow | Its predicted figure |
| Weekly review | Predicted against actual |

Done when: a member can say what they have missed in three seconds without reading a number,
and can see what a change to their plan will do before they make it.

### C. Daily flow

Exists: flow series on a calendar (recurrence, exceptions, done marks), and separately a checkpoint day
(Wake up … Before bed) with routines and items, ticked per serving. Picks and supplement shortlists exist.

Do:

- **Rename Routine to Daily flow** everywhere, and merge the two into one day: flows and other items in one
  sequence, in day order.
- **A bar for what gets in.** An item enters a Daily flow only if it changes the outcome for the member's
  purpose and the science backs it. Hygiene items (water, steps) are left out.
- **Every item says what it helps.** An item carries: what it is, how much and when, **the areas it helps**
  for this member's purpose ("Strength · Muscle size"), and the study behind that. Qram says it first; the
  member should not have to look it up. Creatine at 5 g is one example of the pattern, not a special case.
- **A purpose is asked only if Qram can tailor the journey for it.** Purposes are many and are data: do a
  handstand, compete in HYROX, get visible abs, get stronger, move better, gain muscle. A purpose appears
  in the app only when it has its own ready Map flow, written Daily flows and questions; a test enforces
  this. Otherwise there is no point in asking. Each Map flow serves a purpose, so a member with several
  purposes holds several Map flows, or one whose style combines them (hybrid). For each
  purpose there is a written Daily flow: the flows plus the few items. The member starts from it and swaps.
  Building from the catalogue is the fallback, not the main path.
- **One day of a regime.** A Daily flow answers: for this regime, which flows and which lifestyle items
  fall on this day. Several Daily flows repeating in a pattern make a Map flow.
- **It moves over time.** A Daily flow has stages by week (for example, week 1 has two items, week 3 adds a
  third). Changes are proposed in the weekly review with a reason, never applied silently.
- **Items link to Picks, by one framework.** A product item has "See picks". The list is ranked by stated
  criteria (tested by a third party, dose per serving, price per dose, sold in India), each pick shows why it
  ranks where it does, and no placement is paid. A pick opened from a Daily flow returns to it, and a saved
  or bought pick shows on the item. The same framework serves every item; brands are data.
- Ticking an item is one tap. Flows are ticked by doing them.
- Later: the member describes their purpose in their own words and Qram drafts the Daily flow. The written
  Daily flows above are what that draft is made from.

Done when: a new member with the purpose "build muscle" sees one day containing their workout and
"Creatine · 5 g", and can reach a named brand in two taps.

### D. Map flow

Exists: storage, the mobile API (`docs/map-flow.md`), and Home → Yours. The top of Yours is the Body flow figure, with the followed Map flow's predicted figure as a faint outline. Under it is one Today card, then the five-slot shelf. The Flow map mind map and the Flow map / Daily switch are gone.

Do:

- A **Map flow** is a regime. Daily flows repeat, with different flows and items in each, and the pattern
  they form is the Map flow. It is not seven days and it is not a list of seven things. It has:
  - a **name** and the **purposes** it serves
  - a **style**, stated in plain words: single body-part days or full body; supersets or straight sets;
    hybrid training; calisthenics alongside chosen gym movements; and so on. Style is data, so new ones
    can be added.
  - its **Daily flows**, in the order they repeat. The pattern can be any length: three days, five, seven.
    Rest days are part of it.
  - its **predicted Body flow**
- **The picture of a Map flow is its predicted Body flow**: what the body looks like when the pattern is
  followed. The prediction belongs to the Map flow as a whole, one full pass of its pattern. There is no
  separate day or week prediction. Change a Daily flow and the picture redraws.
- **It is reproducible.** A Map flow is fully described by its pattern and style, so anyone who copies it
  gets the same regime. That is what makes it a dimension of its own, and what makes it shareable.
- **How a pattern repeats** (see section 9 for where this comes from):
  - *In turn* is the default. The pattern is a loop: after the last Daily flow comes the first, whatever
    the weekday. A missed day does not skip anything; the member picks up at the next Daily flow.
  - *Pinned to weekdays* is offered for a seven-day pattern, for members with a fixed calendar
    ("Monday strength, Tuesday run"). A missed day is offered again on the next rest day, or let go by
    the member's choice. It is never dropped silently.
- **Spacing rules belong to the style**, as data, and every ready Map flow is tested against them. For
  hybrid training: heavy lower-body work sits apart from hard runs, an upper-body day can buffer between
  them, and there is at least one rest or easy day.
- A member has **five slots**: five dimensions. Slot 1 is their **base**. One is followed at a time.
  The calendar, Today and the review read from the one being followed. Past days keep their history.
- **Switching** is choosing another picture. The two predicted figures and the two styles are shown side by
  side first, so the member sees what changes. Going back to base is always one tap.
- **Missed** in Body flow means: the followed Map flow planned it by now, and it was not done.
- **Starting out**: Qram offers a shelf of ready Map flows for the member's purposes, level, place and time.
  Choosing one fills slot 1. This is the result the first questions owe.
- An empty slot is filled by copying a Qram Map flow, copying one's own, or copying another member's.
- Home → Yours becomes: the Body flow figure and Today (from the followed Map flow) on top, the Map flow
  shelf below. The old Flow map mind map and the Flow map / Daily switch go away.

Done when: a member can hold a body-part-split regime and a calisthenics regime, see what each does to
their body before choosing, and move between them without rebuilding either.

### E. Following someone else's Custom flow

Exists: community flows can be added to a series; Customflows are private to their owner.

Do: one sheet, three questions, each with a default already chosen.

1. **Where?** "Replace {flow}" (default: the flow in the active Map flow that trains the same areas),
   or "Add on {day}".
2. **For how long?** 1 session, 4 sessions (default), or until I stop.
3. **Then?** "Go back to {my flow}" (default) or "Keep it".

- The member's own flow is paused, never deleted. When the sessions run out, it comes back by itself,
  and the weekly review says so.
- The followed flow arrives as written by its owner. Changing it makes it the member's own Custom flow,
  with "from q_name" kept on it.
- Following a shared Daily flow works the same way for one day; a shared Map flow is copied into a free slot.

Done when: trying a friend's flow for four sessions and returning to one's own takes no manual clean-up.

### F. Sharing

Exists: posts come only from finished runs; share links for flows.

Do:

- **Sharing is earned by doing.** Every member's experience is personal, and a post says "this helped me".
  A flow can be shared only after the member has genuinely done it: a flow finished at least once, a
  Daily flow followed for a day, a Map flow's pattern completed once. The numbers are data and stay low;
  the point is honesty, not a hurdle. A flow that came with the app and was never done cannot be posted.
- **A post is something others can act on.** Sharing means nothing if nobody can interact with it, so
  every shared flow can be opened in full, followed, and talked about:
  - **Follow**: do it yourself, time-boxed (section E)
  - **Remark**: anyone can write under a shared flow: a question, a thought, how it went for them
  - the author of the shared flow can delete any remark under it
  - the owner and readers see how many follow it and how many finished it
- **Posting starts from Home → Yours only.** Yours lists what the member has earned the right to share.
  There is no Share button on a Custom flow's page or in the catalogue. What is not yet earned shows how
  far there is to go ("1 more session").
- A post carries **one attachment** (a Custom flow, a Daily flow or a Map flow) and the member's own words
  if they want to add them.
- The attachment shows as a card: its predicted Body flow figure, name, style, level, time, how long the
  member has followed it, and **Follow**. Follow opens the sheet in E (or copies into a slot, for a Map flow).
- Private numbers stay private: weights, body weight and logs never travel with an attachment. Sets, reps,
  exercises, items and amounts do.
- A shared copy is a snapshot. Later edits by the owner are offered as an update, not pushed.
- The owner sees how many people follow it.

Done when: a member who has done their push day three times can post it from Yours with "try this", and a
follower is doing it soon after.

### G. First run

Built, for a member with no series and no Map flow. One screen says Qram means sequence: a sequence for the day, starting with training. Then one purpose from `offeredPurposes()`, and only the questions that purpose needs. Gym place and workout time are asked only when that purpose leads to gym flows. Back and Skip work, and the answers are said back, each changeable. The result is the ready Map flows that fit, best first, with the reason and the predicted figure. "Use this" fills slot 1 and lands on Today, where Start begins the workout. A purpose with no ready Map flow shows the starter for that focus and says more is coming. Personalise says how many flows fit after place, time, or level change, and how many flows gained a priority. A member who already has series skips this.

Done when: the first two minutes end with a Map flow on screen and one Start button that starts a workout.

### H. Events (later)

Exists: hosted events, invites, registration, questions, check-in pieces.

Do, after sharing has traction: an event is a flow, a host, a place and a time. The event page shows the
flow, who is going and the discussion. Checking in starts the flow as a group session, and it counts in
each person's Body flow like any other workout. No work on this until A–F are in members' hands.

## 4. Order of work

Ordered by where a member meets each thing in their journey. Each step has a ready prompt in
`docs/build-prompts/`.

| Step | Prompt | Area | The member meets it |
|---|---|---|---|
| 1 | `01`, `02` | A. Doing a workout: effort-based rest, then the set rows | Every session |
| 2 | `03` | B. Body flow as a picture | After every session |
| 3 | `04` | B. Predicted Body flow | Before every choice |
| 4 | `05`, `06` | C. Daily flow: one day, then items that say what they help, with Picks | Every day |
| 5 | `07`, `08` | D. Map flow: data, then Home → Yours | Whenever they look at where they are heading |
| 6 | `09` | G. First run | Day 0 |
| 7 | `10`, `11` | E. Following and F. Sharing | Once they have genuinely done something worth sharing |
| 8 | — | Purpose described in words; H. Events | Later |

Each step is checked on a phone against the checklist in `journey-framework.md` before the next begins.

## 5. Data this needs

- `map_flows`: owner, slot (1–5), name, style, purposes, source (Qram template or copied from whom).
- The Daily flows of a Map flow, in pattern order, and how the pattern repeats.
- Which Map flow is followed, from which date.
- Purposes as data: name, the areas and skills it needs, the questions it asks.
- What the member has genuinely done (finished sessions per flow, passes per Map flow), for sharing.
- Flow series and daily items each belong to a Map flow. Existing series move into slot 1.
- Predicted Body flow: worked out from a Daily flow's planned sets, not stored.
- A follow record: which series is paused, what replaces it, sessions left, what happens after.
- Daily flow items: amount, timing, areas helped per purpose, source link, optional Picks link, stage (from which week).
- Written Daily flows and Map flows per purpose, held as data (no app release to add one).
- Post attachment: kind, snapshot, owner.
- Per member: an effort factor for rest, learned from the "harder" and "easier" taps.

## 6. What stays as it is

The exercise catalogue and loops, the 57 gym flows and the curation rules, Customflow layers
(Default ← Personalised ← Custom), level and graduation, the Focus planner's reasoning, priority areas,
per-member time zone, Picks ranking. These are the engine. This document changes what sits on top of them.

## 7. Decisions and open questions

Settled by the founder on 2026-11-13:

- **Map flow** is a regime: Daily flows repeating in a pattern, with a stated style. Not a week, not seven
  items. Its picture is its predicted Body flow, and the prediction is for the Map flow as a whole.
- **Daily flow** is one day of that regime: its flows and lifestyle items.
- **Slots**: five dimensions; the member switches which one they follow.
- **Posting**: only what the member has genuinely done, and only from Yours.
- **Rest**: the recommended number is fine. It adapts to the set just done, from weight and reps only.
- **Equipment**: cannot be relied on, so swapping is easy, and it belongs before Start.
- **Set entry**: the row highlights and the wheel opens on the same screen.
- **Purposes** are many and held as data. One is asked only when Qram can tailor the journey for it.
- **Patterns** can be any length (three, five, seven days) and must be reproducible.
- **Sharing** must be something other members can interact with. Anyone can write a remark under a shared
  flow, and its author can delete any remark there.
- **Items**: backed by science; each says what it helps. Creatine was an example.
- **Brands**: the framework and how it connects come first; brands are data.
- **Body flow**: the centre of the app, linked from every place a choice is made.
- **Events**: as written, later.

Still assumed, built this way unless told otherwise:

1. **Sharing is earned after one genuine completion.**
2. **How a pattern repeats.** In turn by default; a seven-day pattern can be pinned to weekdays.
3. **Several purposes.** One per Map flow, or a combined style where Qram has written one.

To revisit after the founder has used it on a phone:

- **Swapping mid-workout.** For now a quiet swap stays on exercises not yet begun, with no prompt.

## 8. What this changes from earlier decisions

- "Routine" becomes **Daily flow**. The series calendar and the checkpoint day become one thing.
- "Flow map" (mind map) is retired; **Map flow** is the regime, with five slots.
- Home → Yours is no longer "two sides and a Start button". It is Today plus the Map flow shelf.
- A post may carry a flow as an attachment, but only one the member has genuinely done, and only from Yours.
- Items in a Daily flow may state an amount, where earlier text said amounts only describe.
- Set rows are open-ended, where the run screen assumed the flow's set count.
- Rest is a hint, where the run screen treated it as a step.

## 9. Where the pattern rules come from

How people describe a training regime in public was checked on 2026-11-13, for ideas only. Nothing was copied.

- Hybrid plans are usually told as a week: four or five training days, lifting split by upper and lower
  body, runs on other days, heavy leg work kept away from hard runs, and at least one rest day.
- A fixed weekly split is predictable, but a missed session leaves a gap. A rolling split treats the
  sequence as a loop, so a missed day shifts the plan and nothing is skipped. Fixed suits a stable
  calendar; rolling suits people who miss days.
- Most pages found were coaching or marketing pages, so these are examples of common practice, not evidence.
  The spacing rules for the ready Map flows are cited in `docs/map-flow.md`.

Pages read: [Rogue Fitness, hybrid athlete plan](https://www.roguefitness.com/gb/theindex/movement-library/how-to-train-as-a-hybrid-athlete-strength-and-endurance-plan),
[StrengthLog, beginner hybrid program](https://www.strengthlog.com/12-week-beginner-hybrid-athlete-program/),
[Healthline, split workout schedule](https://www.healthline.com/health/fitness/split-workout-schedule),
[Gymshark, workout splits](https://eu.gymshark.com/blog/article/the-best-workout-splits-for-every-goal).
