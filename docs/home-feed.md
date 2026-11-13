# Home feed and flow stories

## Posts with a flow attached

A member posts a Custom flow, a Daily flow, or a Map flow from Home → Yours only. There is no Share button on a flow's page or in the catalogue. Sharing is earned by doing: a flow finished once, a Daily flow followed for a day, or a Map flow's pattern completed once. The numbers live in `shared/share-thresholds.ts`. Something that came with the app and was never done cannot be posted. What is not earned yet shows how far there is to go ("1 more session").

The post carries one snapshot: exercises, sets, reps, items and amounts, plus the owner's name. Weights, body weight and logs are not in it. The card shows the predicted Body flow figure, name, style, level, minutes, owner, how long they have followed it, and Follow. Follow opens the same sheet as any other shared flow. A Map flow copies into a free slot, or asks which slot to replace when all five are full. Slot 1 is the one on Today, and replacing it needs a clear warning.

Opening the card shows the whole flow. Any signed-in member can write a remark under it. The author of the shared flow can delete any remark; a member can delete their own. A deleted remark is gone, with no placeholder. Remarks and the optional words on the post use the same length check as other posts. Reporting and blocking apply to these posts and to remarks.

The shared copy stays as posted. When the owner changes theirs, a follower is offered the update and what changed. Nothing is pushed. The post shows how many follow it and how many finished it. Posts made by finishing a workout stay as they are, and both kinds sit in the feed newest first.

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
