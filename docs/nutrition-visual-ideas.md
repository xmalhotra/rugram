# Nutrition: one idea per card

Updated 25 October 2026.

Nutrition is five holistic flows, not recipes or sport-by-sport subcategories. The existing continuous page and scroll-linked top rail remain. Each topic opens one flow containing swipeable food/drink cards. Each card represents one idea; its five frames stay with that same item. Five purposeful positions were used rather than adding two filler frames simply to reach seven.

| Flow | Cards |
| --- | --- |
| Everyday protein | Dal, cooked tofu, plain curd/yoghurt, cooked eggs |
| Hydration & electrolytes | Water, electrolyte drink, carbohydrate sports drink |
| Pre-workout | Banana, plain toast, oats, rice, water |
| Intra-workout | Water, banana, carbohydrate sports drink, carbohydrate gel |
| Post-workout | Dal, cooked tofu, plain curd/yoghurt, cooked eggs, rice, water |

These are alternatives or meal components, not a list to consume together, a required stack, a complete personalised meal plan, or prescribed quantities/timing. Familiar foods can appear in more than one context without duplicating media. Specialized sports foods are optional and contextual; short easy workouts do not automatically need extra fuel or electrolytes. An electrolyte drink is not assumed to provide carbohydrate fuel.

The visible deck contains no recipe method, ingredients checklist, generic planning/notebook card, or “Choose your next step” intro. Benefits appear first under ⓘ; suitability, dietary notes and source links are in the closed Guide & sources disclosure. Appearance stays global, Tilt remains the default, mode and position remain per card, and the toolbar/position row stay outside the swipe pager. Add to Flow saves a stable food-card ID with its source context.

Old source IDs and completion steps remain in the library. Old private virtual-card references resolve to their original content rather than silently becoming a different food. Previously saved plant/dairy paths retain their restrictions. Published-library filtering still applies; archived children are not reintroduced from static defaults. New canonical topic IDs are nutrition-{protein,hydration,pre,intra,post}-ideas; child IDs are nutrition-item-{item}.

## Assets and runtime loading

Six PNG atlases were generated using the **built-in image-generation tool**, not a CLI/API fallback. Twelve unique items × five frames × two appearances = 120 image positions. They are bundled with the installed app; this change does not add a remote image host. In Expo development, Metro still serves bundled assets over the local network. All actual row/column seams were measured, including unequal panel widths, and the crop renderer contains each complete panel in the shared square display stage. Five-pixel inner trims exclude the generated white dividers.

### nutrition-carbs · male

Saved asset: [nutrition-carbs-male-v1.jpg](/Users/gauravmalhotra/Documents/Rugram/mobile/assets/nutrition/nutrition-carbs-male-v1.jpg)

Prompt set (shared brief + row plan + appearance):

```text
Use case: photorealistic-natural. Production asset: sequential photo atlas for a mobile nutrition IDEAS flow, not a recipe or UI. Exactly FOUR rows and FIVE equal SQUARE columns, 20 cells total, 5:4 landscape canvas. Every row depicts ONE food/drink item only, in five successive natural consumption moments; never a different recipe in the next cell. Same generic adult, same teal top, same home dining table, dark forest-green wall, warm window light, realistic skin, ordinary affordable food. Fixed eye-level three-quarter waist-up camera per row. Entire head, both hands, and relevant bowl/plate/bottle stay fully inside every cell with comfortable margins. No additional people, no transformation body, no extra limbs, no motion blur. NO recipe preparation, stove, chopping, cooking sequence, ingredient mixing tutorial, notebooks, planning cards, mobile phones, logos, text, numbers, labels, arrows, overlays or watermarks. At most an unobtrusive glass of water with food. Exact five columns; do not add sixth poses or crop a neighbor into a cell. Grid boundaries perfectly aligned across all four rows. Five clearly distinct, plausible moments, with the SAME item visible throughout the row.
ROW 1 BANANA: 1 whole ripe banana on plate before the person; 2 pick up same banana; 3 hold partly peeled banana; 4 take one modest bite while seated; 5 lower same banana, eating comfortably. Do not introduce other fruit or a smoothie.
ROW 2 TOAST: one slice of already toasted plain bread on a small plate; 1 look at slice; 2 pick up slice; 3 hold a small bite-sized corner; 4 take a comfortable bite; 5 lower slice toward the same plate. No spread, toast machine, eggs, sandwiches or ingredients.
ROW 3 OATS: one small bowl of already cooked plain oat porridge; 1 bowl in front; 2 pick up spoon; 3 lift one spoonful; 4 eat spoonful calmly; 5 lower spoon toward same bowl. No raw oats, pouring milk or recipe mixing, no toppings.
ROW 4 RICE: one small bowl of already cooked plain rice; 1 bowl in front; 2 pick up spoon; 3 lift modest spoonful; 4 eat calmly; 5 lower spoon. No curry, beans or complete meal assembly. The rice remains the single focus.
The same generic adult man with short dark hair in all 20 cells, plain teal T-shirt. This is an illustrative food-choice storyboard, no celebrity likeness.
```

### nutrition-carbs · female

Saved asset: [nutrition-carbs-female-v1.jpg](/Users/gauravmalhotra/Documents/Rugram/mobile/assets/nutrition/nutrition-carbs-female-v1.jpg)

Prompt set (shared brief + row plan + appearance):

```text
Use case: photorealistic-natural. Production asset: sequential photo atlas for a mobile nutrition IDEAS flow, not a recipe or UI. Exactly FOUR rows and FIVE equal SQUARE columns, 20 cells total, 5:4 landscape canvas. Every row depicts ONE food/drink item only, in five successive natural consumption moments; never a different recipe in the next cell. Same generic adult, same teal top, same home dining table, dark forest-green wall, warm window light, realistic skin, ordinary affordable food. Fixed eye-level three-quarter waist-up camera per row. Entire head, both hands, and relevant bowl/plate/bottle stay fully inside every cell with comfortable margins. No additional people, no transformation body, no extra limbs, no motion blur. NO recipe preparation, stove, chopping, cooking sequence, ingredient mixing tutorial, notebooks, planning cards, mobile phones, logos, text, numbers, labels, arrows, overlays or watermarks. At most an unobtrusive glass of water with food. Exact five columns; do not add sixth poses or crop a neighbor into a cell. Grid boundaries perfectly aligned across all four rows. Five clearly distinct, plausible moments, with the SAME item visible throughout the row.
ROW 1 BANANA: 1 whole ripe banana on plate before the person; 2 pick up same banana; 3 hold partly peeled banana; 4 take one modest bite while seated; 5 lower same banana, eating comfortably. Do not introduce other fruit or a smoothie.
ROW 2 TOAST: one slice of already toasted plain bread on a small plate; 1 look at slice; 2 pick up slice; 3 hold a small bite-sized corner; 4 take a comfortable bite; 5 lower slice toward the same plate. No spread, toast machine, eggs, sandwiches or ingredients.
ROW 3 OATS: one small bowl of already cooked plain oat porridge; 1 bowl in front; 2 pick up spoon; 3 lift one spoonful; 4 eat spoonful calmly; 5 lower spoon toward same bowl. No raw oats, pouring milk or recipe mixing, no toppings.
ROW 4 RICE: one small bowl of already cooked plain rice; 1 bowl in front; 2 pick up spoon; 3 lift modest spoonful; 4 eat calmly; 5 lower spoon. No curry, beans or complete meal assembly. The rice remains the single focus.
The same generic adult woman with tied-back dark hair in all 20 cells, plain teal T-shirt. This is an illustrative food-choice storyboard, no celebrity likeness.
```

### nutrition-protein · male

Saved asset: [nutrition-protein-male-v1.jpg](/Users/gauravmalhotra/Documents/Rugram/mobile/assets/nutrition/nutrition-protein-male-v1.jpg)

Prompt set (shared brief + row plan + appearance):

```text
Use case: photorealistic-natural. Production asset: sequential photo atlas for a mobile nutrition IDEAS flow, not a recipe or UI. Exactly FOUR rows and FIVE equal SQUARE columns, 20 cells total, 5:4 landscape canvas. Every row depicts ONE food/drink item only, in five successive natural consumption moments; never a different recipe in the next cell. Same generic adult, same teal top, same home dining table, dark forest-green wall, warm window light, realistic skin, ordinary affordable food. Fixed eye-level three-quarter waist-up camera per row. Entire head, both hands, and relevant bowl/plate/bottle stay fully inside every cell with comfortable margins. No additional people, no transformation body, no extra limbs, no motion blur. NO recipe preparation, stove, chopping, cooking sequence, ingredient mixing tutorial, notebooks, planning cards, mobile phones, logos, text, numbers, labels, arrows, overlays or watermarks. At most an unobtrusive glass of water with food. Exact five columns; do not add sixth poses or crop a neighbor into a cell. Grid boundaries perfectly aligned across all four rows. Five clearly distinct, plausible moments, with the SAME item visible throughout the row.
ROW 1 DAL: one bowl of ready-to-eat cooked yellow lentils (dal), no rice/roti or other recipe ingredients; 1 bowl on table; 2 take spoon; 3 lift a spoonful; 4 eat comfortably; 5 lower spoon to the bowl.
ROW 2 TOFU: small plate of already fully cooked golden tofu cubes, no vegetable bowl or sauce recipe; 1 plate in front; 2 take fork; 3 lift one cube; 4 eat calmly; 5 lower fork, same tofu plate visible.
ROW 3 CURD / PLAIN YOGHURT: small bowl of thick plain white curd; 1 bowl on table; 2 take spoon; 3 lift one spoonful; 4 eat comfortably; 5 lower spoon. No fruits, granola, powders or mixing tutorial.
ROW 4 EGGS: plate with a fully hard-boiled egg cut into halves, visibly set yolk, shell removed; 1 plate in front; 2 pick up fork; 3 lift modest piece of cooked egg; 4 eat calmly; 5 lower fork toward same plate. No raw egg, frying pan, chopping or additional foods.
The same generic adult man with short dark hair in all 20 cells, plain teal T-shirt. This is an illustrative food-choice storyboard, no celebrity likeness.
```

### nutrition-protein · female

Saved asset: [nutrition-protein-female-v1.jpg](/Users/gauravmalhotra/Documents/Rugram/mobile/assets/nutrition/nutrition-protein-female-v1.jpg)

Prompt set (shared brief + row plan + appearance):

```text
Use case: photorealistic-natural. Production asset: sequential photo atlas for a mobile nutrition IDEAS flow, not a recipe or UI. Exactly FOUR rows and FIVE equal SQUARE columns, 20 cells total, 5:4 landscape canvas. Every row depicts ONE food/drink item only, in five successive natural consumption moments; never a different recipe in the next cell. Same generic adult, same teal top, same home dining table, dark forest-green wall, warm window light, realistic skin, ordinary affordable food. Fixed eye-level three-quarter waist-up camera per row. Entire head, both hands, and relevant bowl/plate/bottle stay fully inside every cell with comfortable margins. No additional people, no transformation body, no extra limbs, no motion blur. NO recipe preparation, stove, chopping, cooking sequence, ingredient mixing tutorial, notebooks, planning cards, mobile phones, logos, text, numbers, labels, arrows, overlays or watermarks. At most an unobtrusive glass of water with food. Exact five columns; do not add sixth poses or crop a neighbor into a cell. Grid boundaries perfectly aligned across all four rows. Five clearly distinct, plausible moments, with the SAME item visible throughout the row.
ROW 1 DAL: one bowl of ready-to-eat cooked yellow lentils (dal), no rice/roti or other recipe ingredients; 1 bowl on table; 2 take spoon; 3 lift a spoonful; 4 eat comfortably; 5 lower spoon to the bowl.
ROW 2 TOFU: small plate of already fully cooked golden tofu cubes, no vegetable bowl or sauce recipe; 1 plate in front; 2 take fork; 3 lift one cube; 4 eat calmly; 5 lower fork, same tofu plate visible.
ROW 3 CURD / PLAIN YOGHURT: small bowl of thick plain white curd; 1 bowl on table; 2 take spoon; 3 lift one spoonful; 4 eat comfortably; 5 lower spoon. No fruits, granola, powders or mixing tutorial.
ROW 4 EGGS: plate with a fully hard-boiled egg cut into halves, visibly set yolk, shell removed; 1 plate in front; 2 pick up fork; 3 lift modest piece of cooked egg; 4 eat calmly; 5 lower fork toward same plate. No raw egg, frying pan, chopping or additional foods.
The same generic adult woman with tied-back dark hair in all 20 cells, plain teal T-shirt. This is an illustrative food-choice storyboard, no celebrity likeness.
```

### nutrition-drinks · male

Saved asset: [nutrition-drinks-male-v1.jpg](/Users/gauravmalhotra/Documents/Rugram/mobile/assets/nutrition/nutrition-drinks-male-v1.jpg)

Prompt set (shared brief + row plan + appearance):

```text
Use case: photorealistic-natural. Production asset: sequential photo atlas for a mobile nutrition IDEAS flow, not a recipe or UI. Exactly FOUR rows and FIVE equal SQUARE columns, 20 cells total, 5:4 landscape canvas. Every row depicts ONE food/drink item only, in five successive natural consumption moments; never a different recipe in the next cell. Same generic adult, same teal top, same home dining table, dark forest-green wall, warm window light, realistic skin, ordinary affordable food. Fixed eye-level three-quarter waist-up camera per row. Entire head, both hands, and relevant bowl/plate/bottle stay fully inside every cell with comfortable margins. No additional people, no transformation body, no extra limbs, no motion blur. NO recipe preparation, stove, chopping, cooking sequence, ingredient mixing tutorial, notebooks, planning cards, mobile phones, logos, text, numbers, labels, arrows, overlays or watermarks. At most an unobtrusive glass of water with food. Exact five columns; do not add sixth poses or crop a neighbor into a cell. Grid boundaries perfectly aligned across all four rows. Five clearly distinct, plausible moments, with the SAME item visible throughout the row.
All rows use a quiet STATIONARY training break beside the same home workout mat, never swallowing while running. Maintain the same square camera framing and head/hand margins.
ROW 1 WATER: one clear reusable bottle filled with plain water, 1 bottle visible in hand; 2 open cap; 3 raise bottle; 4 take a small comfortable sip; 5 lower and close bottle. No forced large drink, added salt, tablets or other beverages.
ROW 2 ELECTROLYTE DRINK: one plain pale-yellow prepared electrolyte drink in a reusable bottle; 1 bottle in front of person with a generic plain sealed sachet beside it; 2 person looks at the sachet back (no legible text); 3 pick up already prepared bottle; 4 take a small sip; 5 lower and close bottle. No powder dosing, tablets, salt pouring, medical use or mixing demonstration.
ROW 3 CARBOHYDRATE SPORTS DRINK: one orange-tinted prepared sports drink in reusable bottle and a generic neutral unbranded carton in background, 1 drink in hand; 2 look at carton back (no legible print); 3 raise bottle; 4 take a small comfortable sip; 5 lower and close bottle. No energy-drink can, stimulants, salt or powder mixing.
ROW 4 CARBOHYDRATE GEL: one small generic plain soft foil sports-gel pouch and a water bottle, 1 inspect unopened pouch; 2 hold opened top without tearing debris; 3 bring pouch to mouth for a small amount; 4 put pouch down and take a small sip of water; 5 cap water and hold used pouch ready for a bin. No multiple packets, forced intake, medicine or running while eating.
The same generic adult man with short dark hair in all 20 cells, plain teal T-shirt. This is an illustrative food-choice storyboard, no celebrity likeness.
```

### nutrition-drinks · female

Saved asset: [nutrition-drinks-female-v1.jpg](/Users/gauravmalhotra/Documents/Rugram/mobile/assets/nutrition/nutrition-drinks-female-v1.jpg)

Prompt set (shared brief + row plan + appearance):

```text
Use case: photorealistic-natural. Production asset: sequential photo atlas for a mobile nutrition IDEAS flow, not a recipe or UI. Exactly FOUR rows and FIVE equal SQUARE columns, 20 cells total, 5:4 landscape canvas. Every row depicts ONE food/drink item only, in five successive natural consumption moments; never a different recipe in the next cell. Same generic adult, same teal top, same home dining table, dark forest-green wall, warm window light, realistic skin, ordinary affordable food. Fixed eye-level three-quarter waist-up camera per row. Entire head, both hands, and relevant bowl/plate/bottle stay fully inside every cell with comfortable margins. No additional people, no transformation body, no extra limbs, no motion blur. NO recipe preparation, stove, chopping, cooking sequence, ingredient mixing tutorial, notebooks, planning cards, mobile phones, logos, text, numbers, labels, arrows, overlays or watermarks. At most an unobtrusive glass of water with food. Exact five columns; do not add sixth poses or crop a neighbor into a cell. Grid boundaries perfectly aligned across all four rows. Five clearly distinct, plausible moments, with the SAME item visible throughout the row.
All rows use a quiet STATIONARY training break beside the same home workout mat, never swallowing while running. Maintain the same square camera framing and head/hand margins.
ROW 1 WATER: one clear reusable bottle filled with plain water, 1 bottle visible in hand; 2 open cap; 3 raise bottle; 4 take a small comfortable sip; 5 lower and close bottle. No forced large drink, added salt, tablets or other beverages.
ROW 2 ELECTROLYTE DRINK: one plain pale-yellow prepared electrolyte drink in a reusable bottle; 1 bottle in front of person with a generic plain sealed sachet beside it; 2 person looks at the sachet back (no legible text); 3 pick up already prepared bottle; 4 take a small sip; 5 lower and close bottle. No powder dosing, tablets, salt pouring, medical use or mixing demonstration.
ROW 3 CARBOHYDRATE SPORTS DRINK: one orange-tinted prepared sports drink in reusable bottle and a generic neutral unbranded carton in background, 1 drink in hand; 2 look at carton back (no legible print); 3 raise bottle; 4 take a small comfortable sip; 5 lower and close bottle. No energy-drink can, stimulants, salt or powder mixing.
ROW 4 CARBOHYDRATE GEL: one small generic plain soft foil sports-gel pouch and a water bottle, 1 inspect unopened pouch; 2 hold opened top without tearing debris; 3 bring pouch to mouth for a small amount; 4 put pouch down and take a small sip of water; 5 cap water and hold used pouch ready for a bin. No multiple packets, forced intake, medicine or running while eating.
The same generic adult woman with tied-back dark hair in all 20 cells, plain teal T-shirt. This is an illustrative food-choice storyboard, no celebrity likeness.
```

## Primary sources checked

- [Victoria Department of Health: eating around exercise](https://www.getactive.vic.gov.au/resources/what-to-eat-before-and-after-exercise/) — food and drink context, not universal intake targets.
- [NHS balanced diet](https://www.nhs.uk/Live-well/eat-well/how-to-eat-a-balanced-diet/eating-a-balanced-diet/) and [Eatwell Guide](https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/) — everyday food groups and variety.
- [British Nutrition Foundation: protein](https://www.nutrition.org.uk/nutritional-information/protein/) — food sources and normal protein function.
- [AIS electrolyte supplements](https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/electrolyte-supplement2), [sports gels](https://www.ausport.gov.au/ais/nutrition/supplements/group_a/sports-foods2/sports-gels/what-is-it), and [Group A sports foods](https://www.ais.gov.au/nutrition/supplements/group_a) — specific-use products, individual context, and label checks.

This is educational content with generated illustrations, not clinical assessment, footage, or proof of individual dietary suitability.

## Verification

- All 430 unit/component tests passed, including seven new Nutrition tests covering browse structure, one-item cards, publication validation, crops, legacy saves and information wiring.
- Root and mobile TypeScript checks passed; targeted root/mobile ESLint and diff whitespace checks passed.
- Read-only local managed-content loading returned all five canonical collections and their intended children (4 / 3 / 5 / 4 / 6 cards), with one ideas option per topic.
- All six generated sheets and their 120 individual cropped positions were visually inspected. The complete atlas audit checked 40 sheets and 1,001 image positions, including existing content.
- The catalogue audit resolved 157 flows with zero text-only flows and zero reported media issues.
- iOS export succeeded at /private/tmp/bh-nutrition-ideas-ios-20261025 and includes all six new Nutrition PNGs. Their combined on-disk size is 15,142,197 bytes (about 15.1 MB); installed/compressed-store size is not measured.
- No physical-phone, hardware-tilt, frame-rate, clinical, or production-deployment validation was performed. Browser rendering is unavailable because react-native-web is not installed; no dependency was added only for a preview.
