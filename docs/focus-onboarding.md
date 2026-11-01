# Focus-first journey

## Current v4 journey

This section supersedes the historical rail-based journey below. Home now uses
`FocusStarter`, distinct from the Flows tab's rail browser:

1. Seven illustrated two-column focus cards. Selection saves through the existing
   authenticated focus action, recording `focus_selected` only on change.
2. Matching starter preview: illustration, steps and per-step duration wording,
   sources and the common health note. Other matching starters can be selected.
   “Try this flow” continues without joining yet.
3. Optional city, Hyderabad preselected when enabled. “Use this city & add flow”
   saves city then joins; “Choose later & add flow” joins without a city change.
   The explicit desired-state flow action records the existing join analytics.

Progress and Back are available. Nothing is purchased or scheduled. Unknown
total durations are not invented. An empty managed focus offers another choice.
The shortest one-starter path takes four taps, excluding OTP, optional choices
and source reading. Device/accessibility testing is still outstanding.

The tab bar stays visible. Members with flows see Today; removing all flows
offers setup again as requested for an empty Home. `/onboarding` redirects Home.
Development test accounts require explicit `EXPO_PUBLIC_DEMO_MODE=true`; mock SMS
still requires a server-issued local-demo challenge. OTP uses six visual boxes
with a single native input for paste, autofill and sequential entry.

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
