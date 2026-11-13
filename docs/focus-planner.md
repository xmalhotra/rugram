# Focus planner: progress built from the flows a member does

The member shouldn't have to work out which part of the body they've neglected. Qram records what each finished
flow worked, shows the week on a body map, and plans the next week. One tap applies that plan to the routine.
The planning comes from Qram, not from the member's memory.

## The parts

| Part | What it is | Built on |
|---|---|---|
| Record | Counted per exercise, not per flow. Each set logged for an exercise adds to that exercise's muscle areas: 1 for a main area, 0.5 for a helper. A flow is only the container: two flows with the same exercises count the same, and a skipped set or skipped exercise counts for nothing. Flows matter only when suggesting what to do next. | `shared/muscle-map.ts` (24 areas, every exercise tagged main and helper); run and training logs |
| Week | Monday to Sunday, in the member's local dates, like the routine calendar | `shared/flow-series.ts` |
| Body map | Front and back figures, each area shaded by its sets this week against its target band | `shared/body-map-paths.ts` |
| Target band | Hard sets per area per week. Beginner 6–10, regular 10–20, which is the well-supported range for growth (Schoenfeld et al., 2017, dose-response meta-analysis). Small areas (forearms, neck, shins, abductors and adductors) only need "some" | A new `shared/focus-targets.ts`; sources go in this doc, like `docs/strength-estimates.md` |
| Recovery | An area with 4 or more main sets isn't suggested again for 48 hours | The same file |
| Suggestion | Next week's changes, each with one plain reason | A new `shared/focus-planner.ts`, pure and tested |
| Apply | One button turns the suggestions into changes to next week's occurrences, which the member can undo one by one | Series exceptions (`move-one`) and Customflows variations |

Rules that keep it honest:
- **Day zero is the benchmark.** Nothing is assumed before the first finished flow. Week 1 suggestions are mild and say so.
- **Only real options.** It suggests only flows the member can run: live ones that suit their place and equipment.
- **The member's own choices win.** A day the member set by hand, or a Customflows change they made, is never overwritten. It's shown as a suggestion they can accept instead.
- **Runs and other cardio** count towards a separate "cardio minutes" line (150 minutes a week is the WHO guideline), not towards muscle sets.

## One member's month

**Arjun** goes to a gym 3 days a week and runs on Saturdays. He has never used Qram.

### Week 1: day zero
- **Monday:** the Yours tab has no routine. A card says "Do any flow and your map starts today." He does **Back + Biceps**.
- **The finish screen** shows "Worked today": the figure lights the areas he just trained, then the lines for the sets he logged.
- **The routine:** he taps "Add to routine" on Back + Biceps and picks Repeat Every week on Monday. He adds Upper Body at Home on Wednesday, a 5 km run on Saturday, and rest on Sunday. The Week view now shows his week.
- **"This week" button** in the Week view header: the body map shows what's done so far, with a list ordered by gap: "Chest 0 of 6–10 · Legs 0 · Shoulders 2 · Lats 9 ✓".
- **Wednesday:** he does Upper Body at Home. Chest and triceps fill in. **Saturday:** the run, so cardio is 32 of 150 minutes.

### Sunday evening: the first review
A notification and a card on Yours say "Your week is ready to review". It shows:
- **Done against planned:** 3 of 3, with a ✓ on each day.
- **The body map for the week:** back and chest covered, shoulders light, legs empty.
- **Next week's suggestions**, each a row with its reason and a toggle, all on:
  1. *Friday: add Lower Body.* "Legs had 0 sets this week."
  2. *Wednesday: use the Push variation of Upper Body.* "Shoulders had 2 sets. This version adds 2 overhead presses."
  3. *Monday: keep Back + Biceps.* "On target. Swapped the wide pulldown for a seated row so mid back gets more."
- **"Apply to next week"** shows the before and after for each day, then applies only the rows still switched on.

### Week 2: following and slipping
- **Monday and Friday:** done. **Wednesday:** missed.
- **Thursday morning:** "You missed Push. Move it to today?" One tap moves that occurrence; the series is unchanged.
- **The week's map:** legs now covered, back well covered two weeks running.

### Week 3: balance and variety
- **Suggestion:** "Back + Biceps has used the same 5 exercises for 3 weeks. Rotate to variation B." Rotation keeps the same areas with different exercises.
- **Progression:** weights come from his logged sets (`docs/strength-estimates.md`), so the session screen already asks for a little more.
- **Recovery:** he adds a Thursday flow that's heavy on legs, a day before Friday's legs. The planner suggests "Move to Tuesday: legs need 48 hours."

### Week 4: the month
- **Month view** shows a dot for each finished occurrence, and a streak of 4 weeks.
- **"This month" map:** 4 weekly maps side by side, with a trend line per area such as "Lower back: low all month".
- **Next month:** add one lower-back exercise to Monday (a Customflows variation). Cardio averaged 35 of 150 minutes a week, so suggest a second run.

### Without a routine
Some members never set a routine. Yours then shows **"Today, try…"**: one flow that covers the area least recently trained and isn't still recovering, plus the week's body map. Every finished flow still counts towards the map, so a routine is never required.

## Body flow (the founder's idea and name, 10 Nov 2026)
A **Body flow** button opens one screen, on the figure alone. Each finished set still counts as before: 1 for a main area, 0.5 for a helper. Conditioning and mobility add no muscle sets.

The opening view is the figure, the range switch, and one line. This week is the default. This month and Since start are the other ranges. The line names the most important thing ("Legs are missed this week") and has one action, Start, for a flow that covers it. The member's plan comes before the catalogue. There are no set counts on this view.

Worked areas use the brand colour and deepen in three steps against the same weekly band the planner uses: under the low end, inside the band, and past the high end. Missed areas use a second colour, `missed` in the design tokens, a blue that stays distinct from the green for colour-blind members. Anything else is quiet and stays grey. The legend under the figure is two words: Worked, Missed.

Missed means the plan asked for the area and it was not done, or the member marked it as a priority and it has no work yet. A large area with no sets is quiet unless the plan asked for it. Any work makes the area worked; the three steps show how that work sits against the band. The decision is `areaPicture` in `shared/body-flow.ts`. What the plan asked for is `plannedByNow` on the Map flow followed on that date. Series reads return that Daily flow, so an open row before today is planned and not done. The Body flow screen still reads those open rows.

### Predicted Body flow

`predictBodyFlow` in `shared/predicted-body-flow.ts` draws one full pass of a plan, however many days the pattern is. Planned sets use `muscleSetWeights`, the same function logged sets use: 1 for a main area, 0.5 for a helper, and nothing for conditioning or mobility. The band uses `pictureWeeks`, the same week count as logging that many days, and never less than one week.

A prediction has nothing done yet. `areaPicture` is called with planned and priority left off, so planned areas show as worked steps and a prediction never paints an area missed. Missed stays the word for planned and not done.

`comparePredictions` names the change in plain lines: "Adds hamstrings" when an area gains work, "Calves are no longer covered" when one area drops out, and "Legs are missed" when a whole region loses the work it had.

The flow page shows "What this adds to your Map flow". If the flow is not already in the pass, the figure is the plan with this flow on the first rest day (or a new day when there is no rest), and the lines say what that adds. If it is already there, the figure is the plan as it stands. The series sheet shows the figure before and after, when adding or removing a flow. Both use what the member would actually run: their Custom flow, swaps, and priority finishers. A stored Map flow's picture is `planFromMapFlow`. The flow page and the series sheet still read the member's series as one pass of their repeats until Home → Yours reads the followed Map flow.

Details is a pull-up panel. It holds the dates of the range, the set counts, the target bands, the gap list, cardio minutes, priorities, Plan next week, and the mobility joints. Nothing from the earlier screen was removed. It moved here.

Tapping an area still shows its sets, when it was last trained, the exercises, and the flows that cover it. Flows from the member's plan are listed first, then the catalogue.

The same figure, sized by a prop, is on the workout finish screen. It lights the work just done and does not mark the rest of the body missed.

### Mobility
Mobility and stretching count toward joints, as days per week, and stay off the muscle-set totals. A set adds one day and one set to each joint it moves: neck, shoulders, wrists, spine, hips, knees and ankles. The colour is those days in the chosen range, against 2–3 days a week from ACSM's Guidelines for Exercise Testing and Prescription, 10th edition (2018), scaled by the weeks in the range the same way muscle sets are. The joint figure and its list are in the details panel. Each joint stays tappable, with a spoken label.

## Screens to build
1. The finish screen shows "Worked today": the Body flow figure for the sets just logged, then the lines for what was done.
2. The routine Week view gains a **"This week"** button that opens a sheet with the body map, a gap list and cardio minutes.
3. The **weekly review** card and sheet, with suggestion rows, toggles, a before-and-after view and **Apply to next week**.
4. Month view gains "This month" maps and trends.
5. Yours without a routine shows "Today, try…".
6. A missed-occurrence prompt: "Move it to today?"

## Data
- Per-area sets per day: worked out from logs when asked, not stored twice. The logs are the source of truth.
- `focus_suggestions (user_id, week_start, items jsonb, applied_at)` keeps what was suggested and what was applied, so the next review can say "last week you took 2 of 3".
- Variations: Customflows records for "variation B", tagged as planner-made, so a member's own edits stay first.

## Tests
- Every rule in `shared/focus-planner.ts`: no data, first week, a missed day, the recovery window, rotation after 3 weeks, the member's own changes kept, and only runnable flows suggested.
- A month-long simulation in `npm run test:simulation` that replays Arjun's month and checks that every suggestion makes sense.
