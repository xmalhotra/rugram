# Workout-based Supplements guides

## Navigation and interaction

Fitness → Supplements contains four educational flows: **Getting started**, **Strength & muscle**, **Running & endurance**, and **HYROX & hybrid**. This is the Flows learning experience, not a replacement for the existing Picks supplement-comparison browser.

Each flow uses the shared square visual viewer: fixed global demonstrator appearance, per-card Tilt/Slider mode with Tilt default, glass feedback, back navigation and heart. Eight reusable topics have five photographic-style assessment frames each. Workout context selects and orders relevant topics; it does not diagnose a need or generate a supplement stack. The main card retains a short decision cue; evidence, suitability, questions, source links and generated-image limitations are under ⓘ. That panel preserves the selected workout's context.

Food-first, protein gaps, creatine, caffeine, endurance fuel, hydration/electrolytes, clinical vitamin/mineral review and product-quality checks are distinct topics. Short everyday training does not automatically gain a creatine/caffeine stack. Running does not get a creatine recommendation. HYROX's creatine card explicitly does not promise a race-time benefit. Carbohydrate fuel and electrolyte products are not treated as interchangeable. The iron/vitamin D card directs clinical assessment when indicated, not self-diagnosis or universal blood testing.

The guide sets no quantities, dosing schedules, loading protocols, fluid/sodium targets or product recommendations. Medical conditions, medicines, pregnancy/breastfeeding and under-18s need appropriate professional advice. Appearance controls only change the pictured person. Certification reduces risk rather than guaranteeing safety or effectiveness. Food, training, sleep and recovery remain the foundation. Internal topic pages are hidden from public flow browsing and are not promoted as separate Home shopping recommendations.

Older Fitness group settings gain the new Supplements topic unless an editor explicitly placed it elsewhere. Existing Workout curation (Cindy + Animal movements), Running/HYROX flows, saved IDs and Picks product data remain intact.

## Primary source review

The implementation uses these primary references for educational claims and cautions, reviewed on 24 October 2026:

- [AIS supplement assessment framework](https://www.ais.gov.au/nutrition/supplements)
- [NIH ODS exercise and athletic performance](https://ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/)
- [AIS creatine guidance](https://www.ausport.gov.au/ais/nutrition/supplements/group_a/performance-supplements2/creatine)
- [FDA caffeine information](https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much)
- [AIS sports gels and fuelling](https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/sports-gels)
- [AIS sports-food framework](https://www.ausport.gov.au/ais/nutrition/supplements/group_a)
- [NIH ODS iron](https://ods.od.nih.gov/factsheets/Iron-Consumer/)
- [NIH ODS vitamin D](https://ods.od.nih.gov/factsheets/VitaminD-Consumer/)
- [USADA Supplement Connect](https://www.usada.org/substances/supplement-connect/)

These references do not clinically validate this app, the selected workout grouping, generated photographs or a particular user's supplement need. A qualified sports dietitian/clinician review is still appropriate before publishing individualised nutritional guidance. No study result is presented as an endorsement of the app or of a pictured product.

## Assets and image-generation prompts

Both sheets were made with the **built-in image-generation tool**. Final assets are saved in the project, while original generated files are preserved:

- [Male assessment sheet](../mobile/assets/supplements/supplements-male-v1.jpg)
- [Female assessment sheet](../mobile/assets/supplements/supplements-female-v1.jpg)

Both are 992×1586 pixels, five columns by eight rows. Visual inspection confirmed the eight assessment themes and five phases, with no supplement-consumption or dosing demonstration. The male sheet has unequal row heights; source boundary lines were checked using read-only PNG pixel analysis. Measured row boundaries and a four-pixel inset are recorded in `shared/fitness-media-layout.ts`. Crops are contained without distortion in the shared square stage, not claimed to be canonical individual 1024×1024 approved frames. Images are illustrative, not filmed, clinically reviewed, authentic certification records or verified product labels.

## Local verification

355 automated tests pass, both root and mobile TypeScript checks pass, targeted lint reports no errors, and the iOS export includes the two new assessment sheets. Tests cover workout-specific topic ordering, no dosage fields, source and schema validation, preservation of clinical/evidence cautions, legacy category settings, hidden internal pages, square crop bounds, fixed controls, context in ⓘ and no Home shopping-stack promotion. The development packager responded on port 8081. Physical-phone motion, rendering/performance and clinical review remain unverified.

### Male prompt

```text
Use case: photorealistic-natural.
Asset type: educational assessment frames for a mobile workout supplement guide. EXACTLY FIVE EQUAL COLUMNS and EIGHT EQUAL ROWS, forty square cells, overall portrait ratio 5:8, target1600x2560. No text, numbers, borders, gutters, logos, certificates, checkmarks, brand names, watermarks or dosage markings.
Subject: an adult man with short dark hair with natural skin texture, casual muted dark teal T-shirt, at the same simple wooden table in a softly lit dark green room. Consistent face, clothing, lens, camera height, scale and table height in all cells. Waist-up, entire head and both hands visible inside every square with safe margin. Calm practical decision-making, not a product advertisement. Do not show drinking supplements, swallowing pills, measuring powders, heaped scoops, injections, transformation bodies or a collection being consumed.
Each row shows five visibly distinct sequential review actions, all objects remain physically coherent and safe:
Row1 FOOD FIRST: balanced ordinary meal with rice, beans, vegetables and yogurt; frame1 person looks at meal;2 examines a plain training notebook;3 points at meal;4 writes a food-plan note;5 closes notebook with meal still nearby. No supplement products in this row.
Row2 PROTEIN GAP: ordinary bean/tofu/yogurt meal and ONE closed plain protein-powder pouch;1 looks at food;2 reviews notebook;3 lifts closed pouch;4 turns pouch to inspect back panel without visible text;5 sets closed pouch aside and returns attention to meal. Do not depict using powder or a scoop.
Row3 CREATINE SUITABILITY: ONE small CLOSED plain grey jar and training notebook;1 reviews exercise plan;2 picks up sealed jar;3 turns jar to inspect blank back panel;4 compares jar with notes;5 sets sealed jar aside and writes a question. No capsule pile, no scoop, no shaker, no ingestion.
Row4 CAFFEINE DECISION: ONE ordinary mug of coffee and a notebook with a simple unlabelled clock drawing;1 considers mug;2 points at clock drawing;3 studies notebook;4 moves mug aside;5 writes a question. No supplement powder, no energy shot, no drinking.
Row5 ENDURANCE FUEL: banana, plain bread and ONE unopened sports-gel packet beside a running-route notebook;1 looks at foods;2 examines route;3 holds sealed gel packet;4 compares it with banana;5 sets packet beside food and writes a plan. No eating or taking gel.
Row6 HYDRATION CONTEXT: clear water bottle and ONE unopened plain electrolyte sachet beside exercise notebook;1 looks at water;2 reviews notebook;3 examines unopened sachet;4 sets it beside closed bottle;5 writes a plan. No salt shaker, no spoon, no mixing or drinking.
Row7 CLINICIAN REVIEW: person with a tablet showing a neutral generic video-call silhouette icon and a plain appointment notebook;1 opens notebook;2 looks at tablet;3 points to notes;4 listens attentively;5 writes a question. No pills, needles, blood, lab values or diagnosis, no readable text.
Row8 QUALITY CHECK: ONE CLOSED plain supplement jar with neutral unlettered packaging and a smartphone;1 studies sealed jar;2 turns jar to inspect back;3 looks at phone;4 compares phone and jar;5 sets jar aside next to checklist notebook. No certification seals, medical symbols or fake approval badge, no consuming.
No row can add extra jars or merge topics. Five phases per row and eight distinct rows are essential. Photorealistic, credible hands, fixed grid alignment, no decorative slogans. Illustrative education only, not medical advice.
```

### Female prompt

```text
Use case: photorealistic-natural.
Asset type: educational assessment frames for a mobile workout supplement guide. EXACTLY FIVE EQUAL COLUMNS and EIGHT EQUAL ROWS, forty square cells, overall portrait ratio 5:8, target1600x2560. No text, numbers, borders, gutters, logos, certificates, checkmarks, brand names, watermarks or dosage markings.
Subject: an adult woman with tied-back dark hair with natural skin texture, casual muted dark teal T-shirt, at the same simple wooden table in a softly lit dark green room. Consistent face, clothing, lens, camera height, scale and table height in all cells. Waist-up, entire head and both hands visible inside every square with safe margin. Calm practical decision-making, not a product advertisement. Do not show drinking supplements, swallowing pills, measuring powders, heaped scoops, injections, transformation bodies or a collection being consumed.
Each row shows five visibly distinct sequential review actions, all objects remain physically coherent and safe:
Row1 FOOD FIRST: balanced ordinary meal with rice, beans, vegetables and yogurt; frame1 person looks at meal;2 examines a plain training notebook;3 points at meal;4 writes a food-plan note;5 closes notebook with meal still nearby. No supplement products in this row.
Row2 PROTEIN GAP: ordinary bean/tofu/yogurt meal and ONE closed plain protein-powder pouch;1 looks at food;2 reviews notebook;3 lifts closed pouch;4 turns pouch to inspect back panel without visible text;5 sets closed pouch aside and returns attention to meal. Do not depict using powder or a scoop.
Row3 CREATINE SUITABILITY: ONE small CLOSED plain grey jar and training notebook;1 reviews exercise plan;2 picks up sealed jar;3 turns jar to inspect blank back panel;4 compares jar with notes;5 sets sealed jar aside and writes a question. No capsule pile, no scoop, no shaker, no ingestion.
Row4 CAFFEINE DECISION: ONE ordinary mug of coffee and a notebook with a simple unlabelled clock drawing;1 considers mug;2 points at clock drawing;3 studies notebook;4 moves mug aside;5 writes a question. No supplement powder, no energy shot, no drinking.
Row5 ENDURANCE FUEL: banana, plain bread and ONE unopened sports-gel packet beside a running-route notebook;1 looks at foods;2 examines route;3 holds sealed gel packet;4 compares it with banana;5 sets packet beside food and writes a plan. No eating or taking gel.
Row6 HYDRATION CONTEXT: clear water bottle and ONE unopened plain electrolyte sachet beside exercise notebook;1 looks at water;2 reviews notebook;3 examines unopened sachet;4 sets it beside closed bottle;5 writes a plan. No salt shaker, no spoon, no mixing or drinking.
Row7 CLINICIAN REVIEW: person with a tablet showing a neutral generic video-call silhouette icon and a plain appointment notebook;1 opens notebook;2 looks at tablet;3 points to notes;4 listens attentively;5 writes a question. No pills, needles, blood, lab values or diagnosis, no readable text.
Row8 QUALITY CHECK: ONE CLOSED plain supplement jar with neutral unlettered packaging and a smartphone;1 studies sealed jar;2 turns jar to inspect back;3 looks at phone;4 compares phone and jar;5 sets jar aside next to checklist notebook. No certification seals, medical symbols or fake approval badge, no consuming.
No row can add extra jars or merge topics. Five phases per row and eight distinct rows are essential. Photorealistic, credible hands, fixed grid alignment, no decorative slogans. Illustrative education only, not medical advice.
```

