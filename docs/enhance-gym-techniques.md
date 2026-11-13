# Enhance gym techniques

Added 2026-10-24. Location: **Flows → Fitness → Workout → Enhance gym techniques**.

## Experience

One flow (`workout-enhance-gym-techniques`) contains eight swipeable technique cards. Each has five visual phases, male/female illustrations, the existing Tilt/Slider controls, benefits first under ⓘ, and the existing Add to Flow integration. These are practical options, not secret methods or promises of better results.

| Card | Focus | Primary reference |
| --- | --- | --- |
| Find your neutral grip | Neutral-grip light dumbbell floor press | [Human Kinetics](https://us.humankinetics.com/blogs/excerpt/how-to-perform-a-dumbbell-bench-press), [PureGym floor-press variation](https://www.puregym.com/exercises/chest/bench-press/dumbbell-bench-press/) |
| Let the backrest support you | Supported seated press setup | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/) |
| Support the chest, focus the row | Chest-supported row | [PureGym](https://www.puregym.com/exercises/back/rows/incline-row/) |
| Cushion the contact point | Rear-knee pad in half-kneeling | [ACE](https://www.acefitness.org/resources/everyone/blog/5681/3-stretches-for-opening-up-tight-hips/) |
| Match your breath to the squat | Comfortable breathing and gentle bracing | [NSCA](https://www.nsca.com/education/articles/kinetic-select/anatomical-core-neural-integration/) |
| Own the lowering phase | Controlled seated curl return | [ACE](https://www.acefitness.org/resources/everyone/exercise-library/44/seated-biceps-curl/) |
| Pad the hip-thrust bar | Secure purpose-made hip-crease pad | [PureGym](https://www.puregym.com/exercises/glutes/hip-thrusts/barbell-hip-thrust/) |
| Use a box as a depth reference | Controlled bodyweight box touch | [Prehab](https://theprehabguys.com/vimeo-video/box-squat-2/) |

Sources were checked while authoring. They support the relevant cue/setup, not an endorsement of these generated images. The squat breathing rhythm is a starting option for light/moderate practice, not a universal heavy-lifting instruction. Pads and supports do not make painful positions or excessive loading appropriate. Card-specific cautions and source links are available in the information disclosure.

## Implementation

- `shared/gym-techniques.ts`: canonical catalog, five captions per card, benefits, cues, cautions, equipment, references.
- `shared/fitness-guides.ts`: Workout shelf and collection mapping.
- `shared/visual-flows.ts`: release-owned visual hydration after CMS validation; personal collections reuse the same cards.
- `shared/fitness-media-layout.ts`: measured atlas boundaries and full-body crop bounds.
- `shared/flow-frame-sequences.ts`: atlas prompt integration.
- `mobile/src/GymTechniqueNotes.tsx`: information disclosure reused by catalog and personal-flow viewers.
- `mobile/src/fitness-media.ts`: bundled local assets; no remote-image dependency.

The existing square viewer stage stays fixed across cards. The atlas cells retain full body/support contacts and fit into that stage without changing its dimensions.

## Assets and provenance

Mode: **built-in image generation**. Four final local PNG atlases, each 1402 × 1122, four technique rows × five phase columns. No generated celebrity likenesses. These are AI-generated illustrations, not filmed or coach-verified demonstrations. Visual inspection and crop checks do not establish biomechanical or clinical validation.

Absolute workspace paths:

- /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-gym-support-male-v1.jpg
- /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-gym-support-female-v1.jpg
- /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-gym-focus-male-v1.jpg
- /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-gym-focus-female-v1.jpg

SHA-256 hashes in the same order:

```
857cd23615469a04e9a213976e1af2cb93fccb416fec1852aebf10b31439529c
2dd0b3822a803b77abb3da21ee154ecbd13d0370c3d959b987ae4089429bcdb5
cf86b32f1fbea76bf3b9915fb4b4c51aa826536f861d24e6f3cfdabbaab8e5a6
2819b9b9547484fd56d529e0f793525f92ddb5c5a4838bbcaeb371eb8166b587
```

### Prompt set

Each initial generation combines the following shared prompt, the relevant row group, and one demonstrator suffix.

Shared prompt:

```text
Use case: scientific-educational. Asset type: sequential photorealistic exercise illustrations for a mobile technique card viewer, not a UI screenshot. EXACTLY FOUR horizontal rows and FIVE equal square columns, twenty cells total; landscape 5:4 canvas. No text, numbers, labels, arrows, logos, watermarks or extra panels. Dark forest-green gym with a non-slip charcoal floor, softly lit. Same generic adult demonstrator in teal short-sleeve sports top and charcoal lower garments, natural anatomy. Same person, clothes, equipment and FIXED three-quarter SIDE camera and scale throughout every row. Full relevant body, all hands/feet, supports, dumbbells, bench and contact points remain visible inside each cell. No ghosts, motion blur, changes of room, magical equipment or disappearing pads. Five genuinely consecutive phases per row; show start, change, peak, return, finish. Modest LIGHT training equipment; no maximal lifting or spotter-dependent barbell presses. No belt, straps, wrist wraps, celebrity likenesses or unstable cushions beneath feet. Each row must visibly illustrate its assigned technique, not substitute a different exercise.
```

Support group:

```text
ROW 1: NEUTRAL-GRIP DUMBBELL FLOOR PRESS. Demonstrator lying on a floor mat, knees bent and feet flat, TWO small dumbbells, palms facing EACH OTHER throughout, thumbs securely around handles, wrists straight. Panels: upper arms resting lightly on mat and elbows bent; press halfway; dumbbells above chest with arms nearly straight; lower halfway; upper arms gently back to mat. Never flare elbows at 90 degrees. Camera shows the hand orientation and wrist/forearm line, entire torso and feet. The floor is the range limit, no bench in this row.
ROW 2: BACK-SUPPORTED SEATED DUMBBELL PRESS. Stable adjustable bench backrest near vertical, head/upper back and butt supported, feet flat on firm floor throughout. Five panels: seated with two LIGHT dumbbells at shoulder height; press halfway; press overhead without extreme locked elbows; lower halfway; back at shoulder level. Back stays in contact with backrest, no large back arch, no leg drive, no unstable foot blocks.
ROW 3: CHEST-SUPPORTED DUMBBELL ROW. Stable bench incline about 45 degrees. Torso CHEST DOWN against the incline pad (not lying on back), head above bench top, both feet securely on floor, one light dumbbell in each hand. Panels: arms hanging straight under shoulders; elbows bending alongside torso; elbows drawn back with dumbbells near ribs; lowering halfway; arms hanging again. Chest stays on bench, hips quiet, no torso swing. Five distinct elbow positions.
ROW 4: CUSHIONED HALF-KNEEL. Firm small gym knee pad remains on floor throughout. Person is kneeling with REAR knee on the pad, FRONT foot flat on bare firm floor; front knee about 90 degrees, torso upright. Panels: arrange pad while on hands and knees; settle into half-kneel with rear knee centered on pad; gently shift body slightly forward without arching back; return to centered half-kneel; stable tall half-kneel with hands resting at hips. No weights, no kneeling directly on bare floor, no thick pillow or wobble pad. Clearly show that cushioning is under the knee ONLY, never under the standing foot.
```

Focus group:

```text
ROW 1: BODYWEIGHT SQUAT BREATHING RHYTHM. Fixed side view, no weights, feet stay flat on firm floor, hands in front for balance. Five panels: tall relaxed start; begin controlled descent with torso gently braced; comfortable bottom with no forced deep squat; rise halfway while mouth relaxed slightly open as if exhaling; tall relaxed finish. No exaggerated cheeks, no extreme spine arch, no mouth puffing or breath-holding visuals. Captions will explain breathing in the app, so do NOT draw words or breath symbols.
ROW 2: CONTROL THE LOWERING IN A SEATED DUMBBELL CURL. Sit tall on a flat bench, feet flat, small light dumbbells in both hands, palms up, elbows remain alongside torso and wrists straight. Five panels: elbows almost straight with dumbbells by thighs; curl halfway up; top curl without moving shoulders; lower halfway slowly; return to nearly straight elbow. No swinging, leaning or motion blur. Endpoints must show the complete return.
ROW 3: HIP-THRUST PAD COMFORT. Fixed side view, stable low bench anchored to wall, LIGHT training bar with tiny equal technique plates, purpose-made thick black barbell PAD securely centered on hip crease and staying on the bar in every panel. Five panels: seated on floor with upper back against bench and padded bar across hips, knees bent and feet on floor; lift hips a little; hips reach level with torso without lumbar overextension, shins approximately vertical; lower hips halfway; hips return low under control. Both hands hold bar steady outside pad. No bar on abdomen or neck, no bare bar contacting hips, no heavy weights, no bench sliding.
ROW 4: BOX AS SQUAT DEPTH REFERENCE. Bodyweight only, stable knee-height gym box on non-slip floor behind person, same box and position in every panel. Five panels: stand just in front of box with feet flat; controlled squat halfway toward box, hands forward; butt touches box LIGHTLY while torso stays engaged and feet flat; rise halfway without rocking or bouncing; stand tall. Do not collapse onto box, do not show jump or box-step exercise, do not move the box.
```

Demonstrator suffixes:

```text
All 20 cells use the same adult man with short dark hair, teal T-shirt and charcoal shorts.
All 20 cells use the same adult woman with tied-back dark hair, teal T-shirt and full-length charcoal leggings.
```

Corrective built-in edits:

1. Female support atlas: widened the fixed camera for row 3 to retain the entire woman, both shoes, dumbbells, bench, and all support contacts. Kept a chest-down row rather than a press, with hanging/half-row/ribs/lowering/hanging phases. Other rows retained.
2. Female focus atlas: increased standing head/shoe margins in row 1 and made the purpose-made hip-thrust bar pad clearly visible in muted teal across all row-3 phases. Kept the pad at the hip crease, hands outside it, light load, and stable support. Other rows retained.

## Verification

- Automated unit/domain/component suite: **407 passed, 0 failed**.
- Root and mobile TypeScript checks: passed.
- Targeted shared/mobile lint: passed.
- Universal visual-flow audit: 140 flows, 41 converted flows, **0 text-only flows**, no issues.
- Personal-flow route checks: passed.
- Final iOS Expo export: passed, output `/private/tmp/betterhabits-gym-techniques-final-20261024` (Hermes bundle `entry-08c172ecf882638de16c0fce04683e9c.hbc`).
- Four final atlases visually inspected and measured; crops checked for separation and stable square-stage fitting.
- **Not verified on a physical phone:** sensor direction/sensitivity, animation smoothness, perceived readability, and device performance.
- No production deployment or independent exercise-coach approval performed.

