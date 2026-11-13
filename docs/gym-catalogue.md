# Gym catalogue: how flows are curated

A draft for the founder to approve. Every exercise named here exists in `shared/exercises.ts` and has a how-to loop.
Grok will fill the remaining flows by these rules, and Claude reviews each one before it goes live.

## Curation framework (v1, 12 Nov 2026)
These rules come from the research below, not from preference. Where the evidence is weak or mixed, it says so,
and the rule is kept loose.

### What the evidence says
| Question | Finding | Source |
|---|---|---|
| How often | Train every major muscle group at least 2 days a week | ACSM Position Stand 2026, *Med Sci Sports Exerc* (April 2026): the first update since 2009, an overview of 137 systematic reviews |
| Weekly sets for size | About 10 sets per muscle a week is the baseline. More still helps, with smaller gains each time (a square-root curve) | ACSM 2026; Pelland et al., dose-response meta-regressions (2024) |
| Sets in one session | Hypertrophy stops improving detectably beyond roughly 11 sets per muscle in one session | Per-session analysis of the Pelland et al. dataset (secondary report, treated as a ceiling, not a target) |
| Load for strength | About 80% of 1RM, 2–3 sets per exercise | ACSM 2026 |
| How hard | Size benefits from ending sets close to failure (0–2 reps left), while strength gains look similar across a wide range. For the average adult, going to failure didn't consistently change outcomes | Robinson et al. (2024), *Sports Med*; ACSM 2026 |
| Rest | Rest of more than 60 s gives a small advantage for size, with no detectable gain beyond about 90 s. Heavy compound lifts get longer rest, to protect the load | Singer, Schoenfeld et al. (2024), *Front Sports Act Living* |
| Rest after one set | That class time, scaled by how hard the set just done was. Weight and reps only. Held between 30 s and 5 min | See **Rest follows effort** below |
| Order | Strength improves most on whatever comes first, so the lift a flow is "about" goes first. For size, order makes no detectable difference | Nunes et al. (2021), *Eur J Sport Sci* |
| Range of motion | Full range of motion is the default. Training at long muscle lengths may add a little size, but the evidence is mixed (Wolf 2023 suggestive; Varovic 2024 found trivial differences) | Wolf et al. (2023), *IJSC*; Varovic et al. (2024) |
| Machines or free weights | No consistent difference | ACSM 2026 |
| Periodisation | Complex periodisation didn't consistently change outcomes. Simple progression is enough | ACSM 2026 |

### Rules that follow
1. **Frequency first:** every weekly plan hits each major muscle at least twice, which is **8 or more times a month**. Advanced members get 2–3 times a week (8–12 a month), because strength gains keep rising with frequency, while for size total volume matters more than how it's spread (Pelland et al.). A once-a-week bro split (4 a month) falls short, so a body-part flow is always paired with other sessions that hit the same muscles. A body-part flow (such as Arms) is an add-on, so the weekly view (Body flow) checks the real frequency.
2. **Weekly sets by level** (the main dial):

   | Level | Sets per muscle per week |
   |---|---|
   | Beginner | about 10, the ACSM baseline |
   | Intermediate | 12–16 |
   | Advanced | 16–20 |
3. **Per session:** no muscle gets more than about 10 direct sets in one flow. Above that, the sets are split across days.
4. **Effort by level:**

   | Level | Stop with |
   |---|---|
   | Beginner | 2–3 reps left, to learn the movement |
   | Intermediate | 1–2 reps left |
   | Advanced | 0–1 reps left on the last set of isolation work. Never to failure on heavy compounds |
5. **Rest is set per exercise, by its rest class.** Each exercise is tagged once with its class:

   | Class | Examples | Rest |
   |---|---|---|
   | Heavy compound: big multi-joint lifts, 6 reps or fewer | squat, deadlift, bench, overhead press, weighted pull-up | 2–3 min, up to 3–5 for maximal strength work |
   | Compound: multi-joint, moderate load | rows, pulldowns, leg press, lunges, dips | about 2 min |
   | Isolation: single joint | curls, extensions, lateral raises, leg curls and extensions, calf raises | 60–90 s |
   | Core and carries | planks, crunches, leg raises, farmer carry | 45–60 s |
   | Superset pair | two non-competing exercises done back to back | none between them, then the rest of the slower one |
   | Conditioning | erg sprints, sled, circuits | set by the flow's work-to-rest plan |

   - Why: longer rest protects the load on heavy lifts, while for size there's no measurable gain beyond about 90 s (Singer, Schoenfeld et al., 2024).
   - The class time is the rest for an ordinary set. Once a set is logged, the hint follows that set. See **Rest follows effort**.
   - After a set is logged, a small count runs on the next row. "harder" adds 30 seconds now and "easier" takes 30 seconds off. Each tap also saves the member's factor. A rest they set themselves, as a custom rest number, is kept exactly. The count never holds the screen.
6. **Order:** the flow's main lift first, then other compounds, then isolation.
7. **Exercise choice:**
   - Machines and free weights count equally, so choose by level. Beginners get stable machines and cables, and intermediate and advanced add barbell compounds.
   - Every muscle gets at least one full-range exercise. A long-length option (incline curl, overhead extension) is preferred when it's equal in every other way, but it isn't required, since that evidence is mixed.
8. **Number of exercises and length:** follow from the sets above (see the next section). They're never picked first.
9. **Smaller muscles** (forearms, calves, neck) get work indirectly. Forearms work in every curl and pull, and hard in hammer and reverse curls. Direct work is added only when a member marks the area as a **priority**, a personalisation setting (for example, the founder trains forearms with every arm session). It isn't added to everyone's flows.
10. **Progression:** simple. Add reps within the range, then weight. No complex periodisation.

### Rest follows effort

The class time above is the rest for an ordinary set of that exercise (`shared/exercise-rest.ts`). After a set is logged, the hint (`shared/rest-hint.ts`) is:

**class time × effort × the member's factor**

then held between 30 seconds and 5 minutes, and rounded to the nearest 5 seconds.

A rest the member sets themselves is kept exactly, even outside that band. That is the Custom layer. The calculated hint does not replace it.

Effort is read from the weight and the reps of the set just done. The time since the previous set is not used. On a hold, the seconds held are the reps.

With nothing to go on, effort is 1, so the hint equals the class time. Mobility's class is 20 seconds, under the 30 second floor, so a mobility rest with nothing to go on is 30 seconds. Conditioning stays on its 30 second class until a hard set nudges it, and even then it stays well under a heavy lift. One easy pull-up, well under the flow's range and far from the member's best, comes out near a minute. A pull-up that matches their best, at or past the top of the range, runs up to 5 minutes.

Each signal is optional. Missing ones drop out and the others share the weight.

| Signal | Weight | Why this weight | Source |
|---|---|---|---|
| Reps against the member's best at that weight | 0.45 | The strongest sign of how close the set came to failure. Fatigue rises sharply in the last reps, so this moves the hint the most | Refalo, Helms et al. (2023), *Sports Med*; Helms, Cronin, Storey and Zourdos (2016), *Strength Cond J* |
| Reps against the flow's range | 0.25 | The top of a prescribed range is the harder end when the weight stays put. A range is a plan, not a measured max, so this weighs less than a real best | ACSM Position Stand 2026 (rep ranges as load zones). Indirect: the range is not the member's limit |
| Weight against the member's estimate | 0.20 | Heavier work, relative to what they can do, needs longer rest if the next set is to keep its load. The class already separates a squat from a curl, so this only nudges inside one exercise | Grgic, Schoenfeld et al. (2018), *Sports Med*; de Salles et al. (2009), *Sports Med* |
| A drop in reps from the previous set | 0.10 | A fall in reps at the same weight is a coaching sign the set was fatiguing. The evidence is thin: no trial sets the next rest from the size of that drop, so the weight stays small | Willardson (2006), *J Strength Cond Res*, on lost reps when rest is too short. Used here only as a weak proxy |

An ordinary set, around the middle of the range with about a quarter of their best still in hand, keeps the class time. The class times themselves stay the ones from Singer, Schoenfeld et al. (2024). Effort only moves them.

The member's factor starts at 1 (`shared/rest-factor.ts`). On the workout screen, "harder" and "easier" each move the count by 30 seconds and move the factor by 0.05. The factor stays between 0.6 and 1.6. It is the personal metric `gym.restFactor` (`{ factor }`), kept in demo memory and in `personal_metrics` (migration 044, one row per metric). No new table. Those taps are not a custom rest number. A custom rest still wins outright.

### Other references (ideas and cross-checks, never copied)
- **Boostcamp, *State of Lifting 2025*:** what lifters actually do. Upper/Lower is the most-logged split, the median member trains 2.7 days a week, and the common pairings (leg curl + leg extension, lat pulldown + seated row) feed the supersets.
- **StrengthLog and Muscle & Strength:** comparable workouts by level, used to sense-check each flow.
- **How to do each exercise:** the source already on each exercise in `shared/exercises.ts`, such as NASM and the NHS.

### How the length and number of exercises are worked out
1. **Sets this flow gives each muscle** = its weekly sets for the level ÷ how many times a week the plan trains it, capped at about 10.
2. **Number of exercises** = those sets ÷ sets per exercise: 2–3 for beginners, 3 for intermediate, 3–4 for advanced.
3. **Length** = sets × (about 45 s of work + rest) + 5–8 min of warm-up and setup.
   - Beginner arms: 12 sets × (45 s + 90 s) is about 27 min, so about 35 min in total.
   - Intermediate: 16 sets, so about 45 min.
   - Advanced: about 24 sets. Supersets bring it to about 60 min.
4. **Time available (proposed):** with 30 minutes, the same flow drops isolation accessories first. The main lift and the full-range exercise for each muscle stay.

## Sample: Arms (a new tile)
The forearm rows are shown as they'd appear for a member who marked forearms as a priority, like the founder.
Without that setting, the flow ends before them.


**Arms · Beginner** (about 38 min). Biceps 6 sets, triceps 6, forearms 2.
| # | Exercise | Sets × reps | Rest |
|---|---|---|---|
| 1 | Machine biceps curl | 2 × 12–15 | 90 s |
| 2 | Rope pushdown | 2 × 12–15 | 90 s |
| 3 | Seated dumbbell curl | 2 × 10–12 | 90 s |
| 4 | Overhead cable extension | 2 × 10–12 | 90 s |
| 5 | Hammer curl | 2 × 10–12 | 90 s |
| 6 | Dumbbell kickback | 2 × 12–15 | 90 s |
| 7 | Reverse dumbbell curl (forearms) | 2 × 12–15 | 90 s |

**Arms · Intermediate** (about 50 min). Biceps 8, triceps 8, forearms 4.
| # | Exercise | Sets × reps | Rest |
|---|---|---|---|
| 1 | EZ-bar curl | 3 × 8–10 | 90 s |
| 2 | Close-grip bench press | 3 × 6–8 | 2 min |
| 3 | Incline dumbbell curl (long length) | 3 × 10–12 | 90 s |
| 4 | Overhead cable extension (long length) | 3 × 10–12 | 90 s |
| 5a | Cable preacher curl | 2 × 12–15 | superset |
| 5b | Rope pushdown | 2 × 12–15 | 90 s after the pair |
| 6 | EZ-bar reverse curl, then a farmer carry (forearms) | 2 × 12 / 2 × 30 m | 90 s |

**Arms · Advanced** (about 65 min). Biceps 12, triceps 12, forearms 5.
| # | Exercise | Sets × reps | Rest |
|---|---|---|---|
| 1 | Close-grip bench press | 4 × 5–7 | 2–3 min |
| 2 | Barbell curl | 4 × 6–8 | 2 min |
| 3a | Skull crusher | 3 × 8–10 | superset |
| 3b | Incline dumbbell curl | 3 × 8–10 | 90 s |
| 4 | Overhead cable extension | 3 × 10–12, drop set on the last | 90 s |
| 5 | Preacher curl | 3 × 10–12, drop set on the last | 90 s |
| 6a | Cross-body hammer curl | 2 × 12 | superset |
| 6b | Single-arm pushdown | 2 × 12 | 90 s |
| 7 | Barbell reverse curl, then the wrist roller (forearms) | 3 × 10 / 2 rounds | 90 s |

## Sample: Back + Biceps superset at all three levels

**Beginner:**
| Pair | Exercise | Sets × reps |
|---|---|---|
| A1 / A2 | Mid-width lat pulldown / Machine biceps curl | 3 × 10–12 / 3 × 12 |
| B1 / B2 | Machine seated row / Hammer curl | 3 × 10–12 / 2 × 12 |
| C | Face pull | 2 × 15 |
| D | Reverse dumbbell curl (forearms) | 2 × 12–15 |

Rest 90 s after each pair.

**Intermediate:**
| Pair | Exercise | Sets × reps |
|---|---|---|
| A1 / A2 | Barbell bent-over row / Incline dumbbell curl | 3 × 8 / 3 × 10 |
| B1 / B2 | Mid-width lat pulldown / Close-grip seated row | 3 × 10 / 3 × 10 |
| C1 / C2 | Face pull / Cable curl | 3 × 15 / 3 × 12 |
| D | Farmer carry (forearms) | 3 × 30 m |

**Advanced:**
| Pair | Exercise | Sets × reps |
|---|---|---|
| A1 / A2 | Pull-up (add weight when 10 are easy) / Barbell curl | 4 × 6–8 / 4 × 8 |
| B1 / B2 | Pendlay row / Incline dumbbell curl | 4 × 6–8 / 3 × 10 |
| C1 / C2 | Chest-supported T-bar row / Cable preacher curl | 3 × 10 / 3 × 12, drop set on the last |
| D1 / D2 | Reverse pec deck fly / Rope hammer curl | 3 × 15 / 3 × 12 |
| E | Barbell reverse curl, then the wrist roller (forearms) | 3 × 10 / 2 rounds |

## Sample: Upper / Lower, 4 days (Intermediate)
Upper/Lower is the most logged split (Boostcamp, 2025). A member does Upper A, Lower A, Upper B, Lower B.

**Upper A:**
| # | Exercise | Sets × reps |
|---|---|---|
| 1 | Barbell bench press | 4 × 6–8 |
| 2 | Barbell bent-over row | 4 × 6–8 |
| 3 | Seated dumbbell shoulder press | 3 × 8–10 |
| 4 | Mid-width lat pulldown | 3 × 10 |
| 5 | Dumbbell lateral raise | 3 × 12–15 |
| 6a / 6b | EZ-bar curl / Rope pushdown | 2 × 10 / 2 × 12 |
| 7 | Reverse cable curl (forearms) | 2 × 12 |

**Lower A:**
| # | Exercise | Sets × reps |
|---|---|---|
| 1 | Barbell back squat | 4 × 6–8 |
| 2 | Romanian deadlift | 3 × 8 |
| 3 | Leg press | 3 × 10–12 |
| 4a / 4b | Lying leg curl / Leg extension | 3 × 10–12 / 3 × 12 |
| 5 | Standing calf raise | 3 × 12 |
| 6 | Hanging knee raise | 3 × 12 |

## The full gym list to fill (by the same rules)
- **Body-part tiles, each at Beginner, Intermediate and Advanced:** Back, Biceps, Chest, Triceps, Shoulders, Legs, Core, and the new **Arms**.
- **Supersets, all three levels:** Back + Biceps, Chest + Triceps, Shoulders + Arms, Legs + Core.
- **Full body:** 3 days at all three levels.
- **New split flows:**
  - Upper/Lower 4-day (A and B)
  - Push/Pull/Legs
  - Power + size upper/lower: heavy days and volume days
  - Strength + conditioning (hybrid): lifts followed by an erg or sled finisher

## Default filters from personalisation (proposed)
When a member browses flows, the filters start set **for them**, shown as a removable chip row:
"For you: Intermediate · Gym · 45 min ✕". Any chip can be changed or cleared, and their choice is remembered over the default.

| Filter | Worked out from (strongest signal first) | Effect |
|---|---|---|
| **Level** | 1. Logged training: more than 8 weeks of sets makes them Intermediate (the same rule as Body flow)<br>2. Lifts they entered, against body weight: deadlift about 1.5× body weight is Intermediate, about 2× Advanced<br>3. Lifestyle in About you: mostly sitting or lightly active means Beginner<br>4. Nothing known: Beginner | **Hides levels they've outgrown** (an Intermediate member doesn't see Beginner flows). Higher levels stay visible, labelled and listed after their own level |
| **Goal** (strength, size, fitness, mobility) | Their focus picks in onboarding | **Hides flows that aren't relevant** to any goal they picked |
| **Where they train** (gym, home with dumbbells, bodyweight only) | What they've run or added before. Otherwise one new essential question, "Where do you train?" | **Never hides.** A flow needing other equipment is labelled ("Needs a gym") and listed after the ones they can do |
| **Time available** | One optional question: 30, 45 or 60 min | **Never hides.** A longer flow shows its length, can be trimmed (see "time available" above), and is listed after the ones that fit |
| **Gaps** | Body flow: areas under target this week | Sort: flows covering their gaps rise, with the reason shown ("Covers mid back, which is behind") |
| **Priority areas** (such as forearms) | Their personalisation setting | Sort, and adds the finisher |

Rules:
- Only two things ever hide a flow: a level the member has outgrown, and a goal they didn't pick. Everything else is shown, with a label and a lower place in the list.
- At most 2 new questions are added (where they train, time available), following "only ask what's essential".
- A filter the member sets is never overridden by a default (the same rule as Customflows).

### Goal tags

Onboarding focus picks (`shared/focus.ts`) map to the goal tags on a gym flow. The code lives in `shared/flow-defaults.ts`.

| Focus | Goal tags |
|---|---|
| Workout | strength, size |
| Running | fitness |
| HYROX | strength, fitness |
| Better sleep, Morning drinks, Supplements, Coding, Nutrition | none. They are not a gym goal, so they don't hide gym flows |

A gym catalogue session is tagged from what it is for:

| Session | Goal tags |
|---|---|
| Power days | strength |
| Size days | size |
| Strength + conditioning | strength, fitness |
| A day whose title says strength or heavy | strength |
| Full body | strength, size, fitness |
| Every other gym catalogue flow | strength, size |

No gym catalogue session is mobility work, so none is tagged mobility. Equipment is the most demanding exercise in the session: a bar, machine, cable or gym cardio machine needs a gym; dumbbells, kettlebells and bands are home dumbbells; bodyweight, rings, suspension and a jump rope are bodyweight. Minutes are `gymEstimatedMinutes`. Areas are the session's main muscles.
