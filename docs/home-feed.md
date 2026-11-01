# Home feed and flow stories

The first tab is now Home (the existing index route; no extra tab was added).
A new user without added flows still starts with focus discovery after OTP.
After previewing a flow or recipe, the only primary enrollment action is “Add
flow”. It explicitly sets membership true, is idempotent, closes the preview,
and returns to Home. Already-added flows show a disabled “Added to Home” button;
removal lives in the profile with confirmation, not in the enrollment CTA.

Home renders only added flows, newest addition first. Each feed card opens its
flow/recipe, with an optional expandable habits checklist. The + button reopens
focus/category discovery; Back to Home returns without changing membership.
Feed cards initially render ten items with a Show more control.

Above the feed, circular story buttons represent added flows, using labelled
initials rather than invented creator profile photographs. Tapping one opens
manual Previous/Next story cards in the shared native sheet. Action cards point
to canonical flow, Pick or event IDs. Routing resolves those IDs against the
latest client payload and rejects unavailable/archived/expired targets.
Flow adoption still uses the authenticated backend; product saves and external
registration use their existing paths. There are no duplicate story-only
product or event records.

Stories are deterministic editorial suggestions tied to added flows, not paid
advertisements, influencer updates, live daily publishing, AI-generated daily
workouts or a 24-hour service. An explicit label says so. Empty groups are hidden.
Read rings use per-card content fingerprints stored in the user's profile; all
current cards read means grey, while changed/new content restores the active
ring. Stories do not autoplay or expire. First views of a given version are
recorded for item analytics, without implying engagement outcomes.

Everyday protein discovery now offers original recipe flows matching the chosen
food preference. Three initial recipes include ingredient lists, preparation
steps, suitability notes and no invented nutrient totals. Adding one creates a
normal flow membership; its feed/story can lead to another relevant nutrition
flow. Existing non-recipe nutrition starters remain accessible for saved users
and as related educational flows. Recipes are not individual dietary plans.

Verification includes empty feed behaviour, membership order/deduplication,
contextual flow/Pick/event story targets, food-preference isolation, excluding
already-added recommendations, and stale-target rejection. Native bundling and
backend membership tests do not replace physical-device layout/accessibility
checks. Admins can now publish explicit story content and manage related-flow
links through forms; see `admin-workspace.md`. Physical-device and public-release
gates still apply.
