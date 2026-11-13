# Fitness visual guides — 24 October 2026

## Implemented catalogue

- Workout: **Cindy** and **Animal movements** only.
- Running: one **Running styles** flow with five swipeable guides: run/walk, easy, tempo, intervals and hills. These are training styles, not universal foot-strike techniques.
- HYROX: **Full HYROX** and **Half HYROX**. Half is an editorial half-volume training version, not an official race category.
- No CrossFit navigation section. Existing saved legacy flows remain in the library.

All four new parent flows reuse the Animal movements viewer: fixed controls outside the swipe pager, global demonstrator appearance, per-card Tilt/Slider mode with Tilt default, one square viewport, glass highlight, heart/back header and written material under ⓘ. Running and station cards remain in the proper alternating order in each HYROX deck.

## Format sources

- [CrossFit Cindy benchmark](https://www.crossfit.com/benchmark/cindy): 20-minute AMRAP, 5 pull-ups, 10 push-ups, 15 squats. The beginner option remains in ⓘ. The generated pull-up depicts a strict variation; no kipping instruction is inferred.
- [England Athletics / RunTogether](https://www.englandathletics.org/runtogether/support/runner-frequently-asked-questions/) and [NHS beginner running](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/): context for different efforts and run/walk progression, not a personal programme.
- [HYROX Singles rulebook, season 26/27](https://maintain.hyrox.com/rulebooks/HYROX_RulebookSingles_EN.pdf): eight run/station pairs. Full uses 1 km runs and the published station distances/repetitions. Half uses 500 m runs and half those station distances/repetitions. Loads are not automatically halved and changing the pictured demonstrator never selects a race division or equipment load.

## Assets and quality boundary

Built-in image generation produced six locally bundled preview sheets in [mobile/assets/fitness](../mobile/assets/fitness). Files are `cindy-male-v1.jpg`, `cindy-female-v1.jpg`, `running-male-v1.jpg`, `running-female-v1.jpg`, `hyrox-male-v1.jpg`, and `hyrox-female-v1.jpg`. Original outputs remain in the generation directory. No image host, live provider call or new dependency is needed for these images.

The sheets were inspected visually. Generated grid geometry did not exactly match the requested layout: the female Cindy sheet contains five columns, the others six, and several row heights differ. Measured source rectangles are recorded in `shared/fitness-media-layout.ts`; no adjacent pose is included by assuming equal-height rows. Each crop is contained, never stretched, in the same square display surface. Thus a source sheet is **not** a canonical 1024×1024 approved movement asset. New sheets are not submitted as passing the strict frame-quality checker or a qualified technique review. Do not describe these as filmed humans, verified coaching, biomechanically validated interpolation or smooth video.

The appearance switch intentionally uses the actual five/six frame count. The slider and pose indicators use that count instead of hard-coding four; tilt still steps sequentially through the full sequence. No crossfade overlays are added. Preview limitations, technique guidance, scaling and sources remain under ⓘ, not as a replacement for the visual card.

Before a public instructional release: commission consistent individual square frames or filmed demonstrations and obtain the qualified technique/framing/comprehension reviews required by `docs/movement-image-generation.md`. Device tilt, native layout, image decode timing and battery/performance still need a physical-phone check. Local tests and an iOS export do not establish those properties.

## Verification

- 330 local automated tests pass, including catalogue curation, legacy IDs, content-schema validation, HYROX run/station order, exact half-volume arithmetic, atlas dimensions, crop bounds and square stage geometry.
- Root and mobile TypeScript checks pass.
- Targeted ESLint checks report no errors; two existing App effect-dependency warnings remain.
- Expo SDK 58 iOS export succeeded and lists all six new assets in the bundle.
- Development packager health responded on port 8081. No physical-device gyro, image-load timing, native layout or coaching validation is claimed.

## Generation prompt set

All six images used the built-in image-generation tool. Prompts below are the final submitted generation instructions; generated output may depart from them as noted above.

### fitnessCindyMale

```text
Use case: scientific-educational. Asset type: square-cell exercise sprite atlas for BetterHabits mobile fitness preview. Generate a precisely aligned landscape contact sheet, overall aspect 2:1, target 3072 by 1536 pixels, EXACTLY SIX equal columns and THREE equal rows, NO GUTTERS or borders. Every cell is square, with its own identical flat dark charcoal-green studio background #0b1510, fixed floor, locked side/three-quarter camera. One consistent photorealistic adult male human, dark teal fitted T-shirt and charcoal athletic shorts, athletic but natural proportions. No text, labels, overlays or watermarks. Every cell contains the entire person including hands, feet AND all exercise equipment within an 8% safe margin. Same person, camera, scale, clothing, light and facing direction across ALL six phases of each row. Show distinct consecutive key poses of one complete repetition, read left to right, not six copies.
ROW 1: strict pull-up using a secured fixed horizontal bar on a simple visible rack. Phases: straight-arm controlled hang with feet clear; initiate pull; elbows bending halfway; chin clears bar without neck craning; controlled halfway descent; return to straight-arm hang. Hands always grip the SAME bar at the SAME height, no kipping, no swinging, no extra limbs.
ROW 2: floor push-up. Phases: high plank arms straight; begin controlled descent; halfway down; chest near floor with bent elbows; halfway press; high plank reset. Straight trunk, hands planted in same place, no detached feet, no kneeling variant sneaking in.
ROW 3: bodyweight squat. Phases: standing; hinge/bend begins; halfway down; comfortable bottom with heels grounded; halfway up; standing finish. Knees track with toes, feet planted same position; no weights.
Keep the entire rack visible in every top-row square by using a sufficiently wide stable camera. Do not crop the bar or person. These are illustrative previews, not filmed or certified coaching demonstrations. Accuracy, cell alignment and distinguishable phases matter more than decorative detail.
```

### fitnessCindyFemale

```text
Use case: scientific-educational. Asset type: square-cell exercise sprite atlas for BetterHabits mobile fitness preview. Generate a precisely aligned landscape contact sheet, overall aspect 2:1, target 3072 by 1536 pixels, EXACTLY SIX equal columns and THREE equal rows, NO GUTTERS or borders. Every cell is square, with its own identical flat dark charcoal-green studio background #0b1510, fixed floor, locked side/three-quarter camera. One consistent photorealistic adult female human, dark teal fitted athletic T-shirt and charcoal leggings, tied-back hair, athletic but natural proportions. No text, labels, overlays or watermarks. Every cell contains the entire person including hands, feet AND all exercise equipment within an 8% safe margin. Same person, camera, scale, clothing, light and facing direction across ALL six phases of each row. Show distinct consecutive key poses of one complete repetition, read left to right, not six copies.
ROW 1: strict pull-up using a secured fixed horizontal bar on a simple visible rack. Phases: straight-arm controlled hang with feet clear; initiate pull; elbows bending halfway; chin clears bar without neck craning; controlled halfway descent; return to straight-arm hang. Hands always grip the SAME bar at the SAME height, no kipping, no swinging, no extra limbs.
ROW 2: floor push-up. Phases: high plank arms straight; begin controlled descent; halfway down; chest near floor with bent elbows; halfway press; high plank reset. Straight trunk, hands planted in same place, no detached feet, no kneeling variant sneaking in.
ROW 3: bodyweight squat. Phases: standing; hinge/bend begins; halfway down; comfortable bottom with heels grounded; halfway up; standing finish. Knees track with toes, feet planted same position; no weights.
Keep the entire rack visible in every top-row square by using a sufficiently wide stable camera. Do not crop the bar or person. These are illustrative previews, not filmed or certified coaching demonstrations. Accuracy, cell alignment and distinguishable phases matter more than decorative detail.
```

### fitnessRunningMale

```text
Use case: scientific-educational. Asset type: mobile running-guide sprite atlas. Generate ONE precise contact sheet, exactly SIX equal columns by FIVE equal rows, overall 6:5 aspect, target 3072 by 2560. Each cell is square with no gutters, no lines, NO text/labels/watermarks. Photorealistic adult man with short dark hair wearing dark teal athletic T-shirt and charcoal shorts, running shoes. Fixed side camera, full person including both feet within 8% margin in EVERY cell; same identity/clothes/light/scale/floor across each row. Plain #0b1510 studio background fills each entire cell. SIX distinct consecutive phases read left-to-right, a coherent motion sequence, not unrelated copies. Row1 run/walk transition: relaxed walk; preparatory brisk step; gentle jog right-leg support; gentle jog left-leg support; ease pace; relaxed walk. Row2 easy running: six consecutive phases of a comfortable relaxed jog through both right and left support and flight, no exaggerated stride. Row3 tempo running: six phases of a controlled steady quicker run, relaxed hands, no sprint or exaggerated lean. Row4 interval running: easy jog; acceleration; controlled brisk right support; controlled brisk left support; deceleration; easy jog. Row5 uphill running: same shallow 8-degree rising slope from left to right in ALL six squares; six distinct short-stride uphill phases through both supports. Uphill posture natural slight whole-body lean, not bent at waist. Never change camera or direction or person between phases; no cropping, no anatomy errors, no fake speed lines. Realistic people, not stick figures. These are illustrative previews, not verified coaching footage.
```

### fitnessRunningFemale

```text
Use case: scientific-educational. Asset type: mobile running-guide sprite atlas. Generate ONE precise contact sheet, exactly SIX equal columns by FIVE equal rows, overall 6:5 aspect, target 3072 by 2560. Each cell is square with no gutters, no lines, NO text/labels/watermarks. Photorealistic adult woman with tied-back dark hair wearing dark teal athletic T-shirt and charcoal leggings, running shoes. Fixed side camera, full person including both feet within 8% margin in EVERY cell; same identity/clothes/light/scale/floor across each row. Plain #0b1510 studio background fills each entire cell. SIX distinct consecutive phases read left-to-right, a coherent motion sequence, not unrelated copies. Row1 run/walk transition: relaxed walk; preparatory brisk step; gentle jog right-leg support; gentle jog left-leg support; ease pace; relaxed walk. Row2 easy running: six consecutive phases of a comfortable relaxed jog through both right and left support and flight, no exaggerated stride. Row3 tempo running: six phases of a controlled steady quicker run, relaxed hands, no sprint or exaggerated lean. Row4 interval running: easy jog; acceleration; controlled brisk right support; controlled brisk left support; deceleration; easy jog. Row5 uphill running: same shallow 8-degree rising slope from left to right in ALL six squares; six distinct short-stride uphill phases through both supports. Uphill posture natural slight whole-body lean, not bent at waist. Never change camera or direction or person between phases; no cropping, no anatomy errors, no fake speed lines. Realistic people, not stick figures. These are illustrative previews, not verified coaching footage.
```

### fitnessHyroxMale

```text
Use case: scientific-educational. Asset type: mobile HYROX station demonstration atlas. ONE contact sheet exactly SIX equal columns and EIGHT equal rows. Overall portrait aspect 3:4, target 1536 by 2048, each cell exactly square, no gutters, dividers, text or labels. Consistent photorealistic adult man with short dark hair in dark teal athletic T-shirt, charcoal shorts and trainers. Plain dark studio #0b1510 fills every cell. Full body AND relevant equipment inside every square with 8% safe margin. Lock camera, scale, floor, equipment position, light and facing direction for each row. Each row shows SIX sequential phases from setup through action to return/check. Do not morph equipment or invent missing limbs.
Row1 SkiErg: upright reach with handles overhead; hinge and pull; mid-pull; handles low near thighs with knees softly bent; controlled return; tall reach. A recognizable ski erg machine stays fixed.
Row2 sled push: stable sled held by upright posts; prepare; small first pushing step; opposite pushing step; next controlled step; stable finish. Palms on same posts, sled grounded.
Row3 sled rope pull: stand facing grounded sled on rope; load rope tension; hand-over-hand first pull; opposite hand pulls; gather rope safely; stable finish, no rope through body.
Row4 burpee broad jump: stand; hands down; plank with chest lowered; return feet near hands; small controlled forward jump; soft stable landing. Whole body stays in frame, no hyperextension.
Row5 rowing erg: catch knees bent and arms extended; leg drive starts; mid-drive; finish legs extended with hands near lower ribs; arms extend and knees recover; catch. Recognizable rowing erg fixed throughout, no machine morphing.
Row6 farmers carry: stand between two kettlebells; hinge grip; stand with one kettlebell in each hand; first short walking step; opposite walking step; stable standing hold. Weights remain below hands and outside legs.
Row7 sandbag lunge: sandbag across upper back/shoulders with hands stabilizing; step; controlled lowered split stance; rise; step feet together; stable stand. No bag on neck, no joint contortion.
Row8 wall ball: stand holding medicine ball at chest facing a wall target visible within each square; descend squat; drive upward; throw ball at target; receive ball to chest; stable reset. Do not confuse ball with kettlebell.
No logos, floating equipment, extra objects, trophies or decorative text. These are unreviewed visual previews, not certified technique footage.
```

### fitnessHyroxFemale

```text
Use case: scientific-educational. Asset type: mobile HYROX station demonstration atlas. ONE contact sheet exactly SIX equal columns and EIGHT equal rows. Overall portrait aspect 3:4, target 1536 by 2048, each cell exactly square, no gutters, dividers, text or labels. Consistent photorealistic adult woman with tied-back dark hair in dark teal athletic T-shirt, charcoal leggings and trainers. Plain dark studio #0b1510 fills every cell. Full body AND relevant equipment inside every square with 8% safe margin. Lock camera, scale, floor, equipment position, light and facing direction for each row. Each row shows SIX sequential phases from setup through action to return/check. Do not morph equipment or invent missing limbs.
Row1 SkiErg: upright reach with handles overhead; hinge and pull; mid-pull; handles low near thighs with knees softly bent; controlled return; tall reach. A recognizable ski erg machine stays fixed.
Row2 sled push: stable sled held by upright posts; prepare; small first pushing step; opposite pushing step; next controlled step; stable finish. Palms on same posts, sled grounded.
Row3 sled rope pull: stand facing grounded sled on rope; load rope tension; hand-over-hand first pull; opposite hand pulls; gather rope safely; stable finish, no rope through body.
Row4 burpee broad jump: stand; hands down; plank with chest lowered; return feet near hands; small controlled forward jump; soft stable landing. Whole body stays in frame, no hyperextension.
Row5 rowing erg: catch knees bent and arms extended; leg drive starts; mid-drive; finish legs extended with hands near lower ribs; arms extend and knees recover; catch. Recognizable rowing erg fixed throughout, no machine morphing.
Row6 farmers carry: stand between two kettlebells; hinge grip; stand with one kettlebell in each hand; first short walking step; opposite walking step; stable standing hold. Weights remain below hands and outside legs.
Row7 sandbag lunge: sandbag across upper back/shoulders with hands stabilizing; step; controlled lowered split stance; rise; step feet together; stable stand. No bag on neck, no joint contortion.
Row8 wall ball: stand holding medicine ball at chest facing a wall target visible within each square; descend squat; drive upward; throw ball at target; receive ball to chest; stable reset. Do not confuse ball with kettlebell.
No logos, floating equipment, extra objects, trophies or decorative text. These are unreviewed visual previews, not certified technique footage.
```

