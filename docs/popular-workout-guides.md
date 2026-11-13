# Source-linked workout guides

Workout discovery now includes an **In the spotlight** shelf: Cindy, 12-3-30,
Norwegian 4×4 and Annie. Fitness → Workout and first-time focus use the same
library. Stable IDs preserve saved flows. No popularity counts or live trend
rankings are fabricated: the labels distinguish recent coverage, a social-media
favourite, a research-led format and a community classic.

`shared/workout-guides.ts` provides default content, merged through the existing
managed library. Admin flow documents can edit the nested `sessionGuide` object,
including cards, equipment, format, attribution and review date. Published admin
overrides and archives retain priority over defaults in demo and database modes.
No migration, external product, subscription or celebrity account is needed.

`WorkoutGuideDetails` reuses the shared swipe deck, progress controls, scrollable
pages and existing Add/View/Remove from Home actions. One concept is shown per
page, followed by collapsed safety, attribution and source disclosures. No
personal workout log is required to browse. Source rep schemes describe the
named format, not personalised targets or a set-by-set tracking interface.

Reviewed 2026-10-21 against:

- [CrossFit Cindy](https://www.crossfit.com/benchmark/cindy): original and beginner formats.
- [Men’s Health coverage](https://www.menshealth.nl/nieuws/zo-fit-als-spider-man-tom-holland-doe-zijn-bizarre-crossfit-workout-cindy): Tom Holland association, not authorship or app endorsement.
- [Cleveland Clinic](https://health.clevelandclinic.org/12-3-30-workout): treadmill units, origin and adaptations.
- [NTNU CERG](https://www.ntnu.edu/cerg/hrmax): interval structure, preparation and recovery.
- [CrossFit Annie](https://www.crossfit.com/benchmark/annie): original and beginner formats.

Tests cover discovery, stable IDs, source links, attribution, units, content
validation and admin round-trip. An iOS JavaScript bundle export checks compile
integration; it does not replace physical-device gesture and visual testing.
