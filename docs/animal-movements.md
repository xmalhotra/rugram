# Animal movement memory cards

## Navigation update

Visible copy now says “Movement guide”, not “memory cards”. Each workout guide
includes a native discrete slider, so swiping is optional. An explicit, off-by-default
tilt switch can navigate the same guide cards using local gyroscope readings.
It requests motion access only after a tap, checks availability, filters jitter,
rate-limits page turns, and clamps at either end. Touching the slider turns tilt
off to avoid competing controls. Subscriptions stop on unmount, route blur,
backgrounding and Reduce Motion. No sensor readings are saved or uploaded.

These controls navigate guide pages. The current sketches are static starting
poses, not recorded frames, motion capture, live form assessment or human
demonstration photography. Actual demonstration sequences remain separate content
work and must not be implied by the tilt effect. Test tilt on a physical device;
bundling and simulated samples do not establish its real-device feel.

Navigate to **Flows → Fitness → Workout → Animal movements**. The collection
contains bear crawl, crab walk, lateral ape, frog travel, inchworm walkout and
bird dog. Each opens an illustrated, swipeable reference deck: setup, movement,
easier option and things to watch for. Add/View/Remove from Home uses the existing
flow actions; learning does not require personal workout records.

This is a bounded starter collection, not “all movements everyone should do.”
No compulsory sets, reps or health outcomes are prescribed. Wrist/shoulder-loaded
and hand-balancing patterns are labelled demanding or coaching-helpful. No
certification, brand affiliation, rehabilitation claim or influencer endorsement
is implied. Original static pose sketches are orientation aids, not animations
or automatic form assessment.

Source review: 2026-10-22. The cards paraphrase technique rather than reproducing
licensed photos or a training manual. ACE provides bear crawl, bird dog and
inchworm references; the walkout is explicitly labelled an adaptation of ACE’s
full inchworm. ACE’s crab source is a youth movement resource, clearly labelled
as context rather than a prescription for adults. Animal Flow’s own manual
provides ape/frog nomenclature and travelling-pattern context; our conservative
introductory cues are not a substitute for their coached teaching.

Content lives in the managed flow library with stable IDs. Admins can edit the
collection name, card order, text, illustration, sources and review date through
the existing flow editor. New collections are derived from published guide
metadata, rather than a hardcoded list of filters. Archives and published admin
overrides remain authoritative. No new package or database migration is needed.

Tests cover inclusion, IDs, card structure, source protocols, schema round-trip,
illustration coverage and navigation wiring. Physical-device gestures and visual
layout still need review on the target phone.
