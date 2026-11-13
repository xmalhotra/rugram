# Focus-first journey

## Current first run

This section supersedes the historical journeys below. A member with no series and no Map flow sees it on Home → Yours. A member who already has series skips it.

1. One screen: Qram means sequence. This app gives you a sequence for your day, starting with training. One button, Continue.
2. One purpose from `offeredPurposes()` in `shared/purposes.ts`. Saving it stores `purposeId`, `purposeStartedOn`, and that purpose's catalogue focus.
3. Only the questions that purpose needs (`questionsForPurpose` in `shared/first-run.ts`). Gym place and workout time are added only when the purpose leads to gym flows. Stepper, Back, and Skip. A skip is kept.
4. The answers said back on one screen. Each row can be changed.
5. Ready Map flows that fit, best first (`firstRunResult`), with the reason and the predicted figure. "Use this" creates that Map flow in slot 1, follows it from today, and lands on Today. Start there begins the workout.
6. A purpose with no ready Map flow shows the starter for its focus and the line "More is coming for {purpose}."

The shortest path, Do a handstand (two questions, none skipped), is seven taps from the opening screen to a workout starting: Continue, the purpose, two answers, Continue, Use this, Start. Gain muscle, which also asks gym time, is nine taps the same way.

Changing place, time, or a level input in Personalise shows how many flows now fit. Changing priority areas shows how many flows gained one. The numbers come from the catalogue.

The tab bar stays visible. `/onboarding` redirects Home. Development test accounts require explicit `EXPO_PUBLIC_DEMO_MODE=true`; mock SMS still requires a server-issued local-demo challenge. OTP uses six visual boxes with a single native input for paste, autofill and sequential entry. The screen was not opened on a phone.

## Historical journey (before v4)

After phone OTP sign-in, a user without added flows starts with discovery in Home:
“What would you like to focus on right now?”

The choices are Better sleep, Workout, Running, HYROX, CrossFit, Coding and
Nutrition. Cooking is not a category. Fitness/Tech are no longer a required
first selection; they remain internal library metadata for compatibility.

The user chooses one focus, then taps “Show my starter flows”. The focus saves
through the authenticated `focus` action on the existing mobile API. Only IDs
from `shared/focus.ts` are accepted. Profile JSON stores `focusId`, so no new SQL
column or migration is needed. Repeated saves do not duplicate analytics.
The last focus is preselected when returning to discovery; the person can pick
something else. Focus selection does not join a flow, schedule activity, or
require a purchase. Flow preview uses an explicit “Add flow” action, then returns
to the Home feed. Returning users with added flows see Home and use + to explore.

Each focus has at least one working starter flow. Workout and Coding offer a
few more specific existing choices rather than forcing a second questionnaire.
New sleep, workout-preparation, running, CrossFit and nutrition starters are
editorial frameworks with context/safety notes and primary background links.
They are not personalised clinical treatment, nutrition prescriptions, or
certified coaching programmes. Existing saved flow/step IDs are unchanged.

The tab bar is still available; this is a lightweight default journey, not a
mandatory onboarding gate that blocks Picks, Events or profile access. Physical
iPhone interaction and accessibility verification are still required.
