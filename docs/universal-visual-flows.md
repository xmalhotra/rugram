# Universal visual-flow standard

Implemented 24 October 2026.

Every flow opens as cards containing visual frames. There is no text-and-icon introductory deck, including for older saves. Text guidance stays under the information button, with Benefits first. Back navigation and the reversible heart apply to every flow; tab navigation stays present. The demonstrator choice is global, control mode is per card, and Tilt is the starting mode.

## Verified coverage

- 127 built-in/stored flow records resolved through the shared renderer.
- 41 previously text-led flows converted; zero text-only flows in the catalogue audit.
- All resolved cards have at least five usable image positions in both demonstrator appearances.
- Sleep has four cards: Prepare tomorrow, Put the phone aside, A calmer activity, Notice what helped.
- Existing flow and completion IDs are unchanged. Virtual presentation cards are never saved as new owned flows.
- Read-only local managed-content check also returned 127 flows, with no text-only result.
- All 382 unit/component tests passed. Mobile and root TypeScript checks and targeted lint passed. iOS export succeeded with the bundled assets; no phone installation was performed.
- Automated coverage report: reports/visual-flow-coverage-2026-10-24.json. Rerun: node --import tsx scripts/audit-visual-flow-coverage.ts.

Twelve new atlas PNGs were generated with the built-in image-generation tool (not CLI/API fallback), saved under mobile/assets/flows/, and visually inspected. Existing coding, drink, supplement and fitness assets are reused where their action sequence matches. Several nutrition contexts share the same food/water/planning sequence; this is not a claim of bespoke footage per flow. These are discrete illustrative storyboards, not filmed or coach-approved motion. Sprite row and cell bounds were measured from the actual outputs; full-person movement crops are contained within a fixed square stage rather than stretching or clipping anatomy. Five visible positions may be selected from a generated row with extra panels.

For an unknown future/custom habit, the fallback is explicitly a planning-and-reflection sequence, not a fabricated demonstration of an unknown physical activity. It still has cards and five visual frames. Unknown workout movements are labelled Prepare and explicitly do not claim an exercise demonstration.

Unit/component checks and iOS export are local evidence. Physical-phone layout, sensors, smoothness and performance still require a device check. Browser preview is unavailable in this native checkout because react-native-web is not installed.

## Saved assets and prompt set

### flow-sleep · male

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-sleep-male-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 4 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:4. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult man with short dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Person by bedside gathers keys, folds a shirt, puts essentials into a bag, places it ready, leaves a tidy space.
Row 2: Person seated holding phone, silences it, places it on shelf away from bed, walks away empty-handed, sits calmly without phone.
Row 3: Person selects physical book, sits in armchair, opens book, reads under warm lamp, closes book and rests hands.
Row 4: Morning daylight at breakfast table: person sits with notebook, opens it, pauses thoughtfully, writes a short note, closes notebook.
```

### flow-sleep · female

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-sleep-female-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 4 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:4. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult woman with tied-back dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Person by bedside gathers keys, folds a shirt, puts essentials into a bag, places it ready, leaves a tidy space.
Row 2: Person seated holding phone, silences it, places it on shelf away from bed, walks away empty-handed, sits calmly without phone.
Row 3: Person selects physical book, sits in armchair, opens book, reads under warm lamp, closes book and rests hands.
Row 4: Morning daylight at breakfast table: person sits with notebook, opens it, pauses thoughtfully, writes a short note, closes notebook.
```

### flow-meals · male

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-meals-male-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 6 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:6. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult man with short dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Cooked chickpeas, ready-to-eat tofu and washed cucumber and tomato: person gathers ingredients, combines chickpeas and tofu, adds vegetables, adds lemon, serves completed bowl.
Row 2: Plain curd, cooked chickpeas and washed cucumber: person gathers ingredients, puts chickpeas in bowl, adds cucumber, spoons in curd and seasoning, serves completed mixed bowl.
Row 3: Peeled fully hard-boiled eggs, cooked chickpeas and washed vegetables: gather ingredients, add chickpeas, add vegetables, place halved cooked eggs, serve with lemon.
Row 4: Person picks plate, adds cooked rice, adds cooked vegetables, adds cooked lentils or beans, sits with completed varied meal.
Row 5: Person considers banana and toast on kitchen counter, chooses banana, peels it, places banana and toast on small plate, sits with snack ready.
Row 6: Person picks clean drinking bottle, fills from safe drinking-water jug, closes lid, places beside bag, takes comfortable sip. No measured amounts.
```

### flow-meals · female

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-meals-female-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 6 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:6. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult woman with tied-back dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Cooked chickpeas, ready-to-eat tofu and washed cucumber and tomato: person gathers ingredients, combines chickpeas and tofu, adds vegetables, adds lemon, serves completed bowl.
Row 2: Plain curd, cooked chickpeas and washed cucumber: person gathers ingredients, puts chickpeas in bowl, adds cucumber, spoons in curd and seasoning, serves completed mixed bowl.
Row 3: Peeled fully hard-boiled eggs, cooked chickpeas and washed vegetables: gather ingredients, add chickpeas, add vegetables, place halved cooked eggs, serve with lemon.
Row 4: Person picks plate, adds cooked rice, adds cooked vegetables, adds cooked lentils or beans, sits with completed varied meal.
Row 5: Person considers banana and toast on kitchen counter, chooses banana, peels it, places banana and toast on small plate, sits with snack ready.
Row 6: Person picks clean drinking bottle, fills from safe drinking-water jug, closes lid, places beside bag, takes comfortable sip. No measured amounts.
```

### flow-daily · male

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-daily-male-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 4 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:4. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult man with short dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Person by bench with ordinary workout clothing, folds shirt, places clothing in bag, puts shoes next to bag, closes bag by doorway.
Row 2: Person at desk looks at planner, opens it, selects one blank task panel, marks plan with pen, puts pen down with plan ready. No readable text.
Row 3: Person sits at table with notebook, opens notebook, pauses to reflect, writes one note, closes notebook and rests hands.
Row 4: Person by door with comfortable shoes, stands ready, steps outside, walks comfortably on safe garden path, returns to doorway. No phone while walking.
```

### flow-daily · female

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-daily-female-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 4 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:4. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult woman with tied-back dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Person by bench with ordinary workout clothing, folds shirt, places clothing in bag, puts shoes next to bag, closes bag by doorway.
Row 2: Person at desk looks at planner, opens it, selects one blank task panel, marks plan with pen, puts pen down with plan ready. No readable text.
Row 3: Person sits at table with notebook, opens notebook, pauses to reflect, writes one note, closes notebook and rests hands.
Row 4: Person by door with comfortable shoes, stands ready, steps outside, walks comfortably on safe garden path, returns to doorway. No phone while walking.
```

### flow-fitness · male

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-fitness-male-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 7 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:7. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult man with short dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Fixed wide side view whole person on mat: supine with arms up and bent hips and knees, slowly lowers right arm and opposite heel a little, controlled comfortable reach, reverses reach, returns to start. Back stays supported.
Row 2: Fixed wide side view: hands and knees on mat, begins extending right arm and left leg, small controlled opposite-limb reach with back level, returns slowly, all fours again.
Row 3: Fixed wide side view: on knees and forearms, shifts into comfortable knee-supported forearm plank with shoulder-to-knee line, holds naturally, eases back, rests with knees supported.
Row 4: Fixed wide full-body view: holds rope handles with rope behind, gentle small takeoff, single-under rope passes beneath, soft controlled landing, resets standing. Not double-unders.
Row 5: Fixed wide side view: supine knees bent feet planted arms across chest, raises torso a little, comfortable partial sit-up, lowers slowly, returns resting. Never pulls on neck.
Row 6: Fixed wide side view: person on stationary treadmill, attaches safety clip, starts easy setting, walks comfortably, slows and stands only after belt has stopped.
Row 7: Generic adult person faces generic coach by clear mat, explains with gesture, listens, coach shows small comfortable stance, person tries while coach watches, both pause to review. No weights or race claims.
```

### flow-fitness · female

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-fitness-female-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 7 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:7. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult woman with tied-back dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Fixed wide side view whole person on mat: supine with arms up and bent hips and knees, slowly lowers right arm and opposite heel a little, controlled comfortable reach, reverses reach, returns to start. Back stays supported.
Row 2: Fixed wide side view: hands and knees on mat, begins extending right arm and left leg, small controlled opposite-limb reach with back level, returns slowly, all fours again.
Row 3: Fixed wide side view: on knees and forearms, shifts into comfortable knee-supported forearm plank with shoulder-to-knee line, holds naturally, eases back, rests with knees supported.
Row 4: Fixed wide full-body view: holds rope handles with rope behind, gentle small takeoff, single-under rope passes beneath, soft controlled landing, resets standing. Not double-unders.
Row 5: Fixed wide side view: supine knees bent feet planted arms across chest, raises torso a little, comfortable partial sit-up, lowers slowly, returns resting. Never pulls on neck.
Row 6: Fixed wide side view: person on stationary treadmill, attaches safety clip, starts easy setting, walks comfortably, slows and stands only after belt has stopped.
Row 7: Generic adult person faces generic coach by clear mat, explains with gesture, listens, coach shows small comfortable stance, person tries while coach watches, both pause to review. No weights or race claims.
```

### flow-supports · male

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-supports-male-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 4 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:4. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult man with short dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Person holds loose lifting belt, places around waist, fastens comfortably, checks fit standing without lifting, unfastens and removes.
Row 2: Person shows fabric wrist wrap, positions on wrist, wraps fabric gently, fastens and checks gentle movement, removes. No excessive tightness or load.
Row 3: Person holds fabric straps, places wrist loop, loops loose tail around unloaded dowel resting on support, checks light grip, releases and removes. No hanging or lifting load.
Row 4: Person seated with knee sleeve, slides over lower leg, positions at knee comfortably, stands gently to check fit, sits and removes. No extreme compression or weights.
```

### flow-supports · female

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-supports-female-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 4 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:4. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult woman with tied-back dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Person holds loose lifting belt, places around waist, fastens comfortably, checks fit standing without lifting, unfastens and removes.
Row 2: Person shows fabric wrist wrap, positions on wrist, wraps fabric gently, fastens and checks gentle movement, removes. No excessive tightness or load.
Row 3: Person holds fabric straps, places wrist loop, loops loose tail around unloaded dowel resting on support, checks light grip, releases and removes. No hanging or lifting load.
Row 4: Person seated with knee sleeve, slides over lower leg, positions at knee comfortably, stands gently to check fit, sits and removes. No extreme compression or weights.
```

### flow-animal · male

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-animal-male-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 5 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:5. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult man with short dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Fixed full-body side view on mat: bear-crawl hover with knees just clear of floor, right hand and left foot advance a small step, stable support, left hand and right foot advance, stable hover further forward. Hips steady, no plank substitutions.
Row 2: Fixed full-body three-quarter side view on mat: low supported face-up crab position, one hand and opposite foot take small step, supported low reset, alternate pair takes small step, supported low finish further along. Hips comfortably lifted, no deep shoulder stretch.
Row 3: Fixed full-body front three-quarter camera: comfortable supported low squat, hands placed to one side, small controlled shift to hands, feet move sideways following hands, squat reset at new location. No acrobatic jump.
Row 4: Fixed full-body side view: comfortable squat, hands reach a short distance ahead onto mat, controlled weight transfer to hands, feet follow a small distance, squat reset forward. No high jump or forced deep squat.
Row 5: Fixed full-body side view: standing hinge with hands toward floor and knees softened, hands walk out, controlled supported plank, hands walk back toward feet, returns to standing hinge then upright. No push-up, no abrupt camera change, whole person always visible.
```

### flow-animal · female

Saved asset: /Users/gauravmalhotra/Documents/Rugram/mobile/assets/flows/flow-animal-female-v1.jpg

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas for a mobile habit guide, not a UI screenshot. Exact 5 columns by 5 rows of edge-to-edge square images, no gutters, separators, labels or borders. Canvas aspect ratio 5:5. Five columns exactly. Each row is one card and five columns are consecutive distinct stages, never five duplicates. Generic adult woman with tied-back dark hair, teal casual or exercise clothes. Same person, clothes, room, scale, lighting and fixed camera within each row. Whole relevant objects, hands, feet and support points visible. Natural anatomy, realistic textures. Modest home or exercise setting, forest-green walls, soft lighting. No logos, readable text, numbers, watermarks, medical devices or icons.
Row 1: Fixed full-body side view on mat: bear-crawl hover with knees just clear of floor, right hand and left foot advance a small step, stable support, left hand and right foot advance, stable hover further forward. Hips steady, no plank substitutions.
Row 2: Fixed full-body three-quarter side view on mat: low supported face-up crab position, one hand and opposite foot take small step, supported low reset, alternate pair takes small step, supported low finish further along. Hips comfortably lifted, no deep shoulder stretch.
Row 3: Fixed full-body front three-quarter camera: comfortable supported low squat, hands placed to one side, small controlled shift to hands, feet move sideways following hands, squat reset at new location. No acrobatic jump.
Row 4: Fixed full-body side view: comfortable squat, hands reach a short distance ahead onto mat, controlled weight transfer to hands, feet follow a small distance, squat reset forward. No high jump or forced deep squat.
Row 5: Fixed full-body side view: standing hinge with hands toward floor and knees softened, hands walk out, controlled supported plank, hands walk back toward feet, returns to standing hinge then upright. No push-up, no abrupt camera change, whole person always visible.
```

