# Morning drinks — Lifestyle

## Experience

One saved flow, **Morning drinks**, opens with **8 ways to start your day** above the existing fixed control bar. Swipe among eight choices, each with five image frames: lukewarm water; lemon with optional honey; coffee; decaf coffee; plain tea; ginger infusion; milk; unsweetened fortified soy drink.

The existing viewer supplies global demonstrator appearance, Tilt by default, local Slider mode, square stage, glass feedback, back navigation and a saved-flow heart. The position row says Frame for drinks. Preparation, suitability, cautions, source links and generated-image notes stay under ⓘ. The eight drink pages are not eight public flow/category entries. Older Lifestyle category settings receive the new topic unless an editor explicitly placed it elsewhere.

These are alternatives, not eight drinks to consume, not a mandatory empty-stomach routine, not a complete breakfast and not a personalised diet or medical treatment. Honey remains optional; no detox, fat-burning or cleansing benefit is claimed. Caffeine, milk/soy allergies, label differences, acidic drinks, heat and medical fluid restrictions are addressed in the relevant notes.

## Sources

Drink choices and cautions were checked against primary guidance, not influencer claims:

- [NHS: water, drinks and hydration](https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/) supports a range of everyday drinks, lower-sugar choices and attention to caffeine sensitivity.
- [FDA: caffeine and individual sensitivity](https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much) explains variable caffeine content and that decaffeinated does not mean caffeine-free.
- [NHS: free sugars](https://www.nhs.uk/healthier-families/food-facts/sugar/) includes honey among free sugars.
- [UK oral-health guidance: tooth wear](https://www.gov.uk/government/publications/delivering-better-oral-health-an-evidence-based-toolkit-for-prevention/chapter-7-tooth-wear) covers acidic-drink exposure.
- [FDA: milk and plant-based alternatives](https://www.fda.gov/consumers/consumer-updates/milk-and-plant-based-milk-alternatives-know-nutrient-difference) explains differences in nutrients and the importance of labels.

The small preparation recipes are editorial suggestions, not tested clinical protocols. The images are generated illustrations and cannot establish ingredient amounts, caffeine, temperature, allergen safety or nutritional content. Ginger is included as a flavour choice with no therapeutic claim.

## Saved image assets and prompt set

Created using the **built-in image-generation tool**, not CLI fallback. Originals remain in the generation directory; final assets were copied into the project:

- [Male preparation sheet](../mobile/assets/lifestyle/morning-male-v1.jpg)
- [Female preparation sheet](../mobile/assets/lifestyle/morning-female-v1.jpg)

Both images are 992×1586 pixels, five columns by eight rows. Source rows/crops are recorded in `shared/fitness-media-layout.ts`; a three-pixel inset avoids generated sheet boundaries. Each source cell is contained in the shared square display rather than stretched. These sheets are not canonical individually reviewed 1024×1024 movement assets. Manual inspection confirmed the eight row themes and five visible preparation phases; it did not verify food safety or qualify native-phone tilt/performance.

## Local verification

348 automated tests pass, both TypeScript checks pass, targeted lint reports no errors, and the iOS export includes both new image sheets. Tests cover the eight-page collection, Lifestyle placement including older settings, schema validation, five-frame crop bounds, shared viewer wiring and single-flow Home behaviour. The development packager responded on port 8081. Physical-phone tilt, rendering and load timing remain unverified.

### Male sheet prompt

```text
Use case: photorealistic-natural.
Asset type: five-frame morning drink preparation contact sheet for a mobile lifestyle guide. One single photographic contact sheet, EXACTLY FIVE COLUMNS and EIGHT ROWS, all cells equal square, portrait aspect ratio 5:8. No gutters, borders, dividers, words, numbers, labels, logos or watermark. Target 1600 x 2560. Every cell is one consecutive step, never combine steps inside a cell.
Subject: an adult man with short dark hair, natural skin texture, plain muted sage casual shirt. Same person, face, clothing, camera and scale across all forty cells. Modern uncluttered kitchen counter, soft morning light, dark warm green background that suits a dark app. Waist-up framing showing the person's entire head, both hands, vessel and counter inside every square with comfortable 8% margins. Never crop the face or cup. Fixed camera and counter height, no extreme zoom. Useful preparation, not a posed wellness advertisement.
Columns show: 1 ingredients and empty vessel on counter, person looking at them; 2 carefully pouring the appropriate prepared liquid into vessel below chest level; 3 stirring the drink with one spoon while vessel rests on counter; 4 holding the vessel gently near chest before sipping; 5 small comfortable sip, cup not obscuring eyes. Keep each change visually distinct with plausible hand anatomy; a cup must not fuse with a hand or mouth. Hot drinks are comfortably warm, never boiling; no steaming kettle near the face. Person never drinks all eight at once: each row is a separate alternative.
Eight rows in this exact order:
1 Plain lukewarm water in a clear glass; glass water carafe visible, no lemon, no additives.
2 Lemon and optional honey water in a clear mug; small lemon half and tiny honey jar on counter, pale transparent lemon water, one small teaspoon as the only utensil.
3 Black filter coffee in a plain cream ceramic mug; small unbranded glass coffee carafe on counter, dark coffee, no cream.
4 Decaf filter coffee in a plain slate ceramic mug; unbranded small glass carafe, dark coffee, no cream; visually distinct mug but no text.
5 Plain brewed tea in an amber clear glass mug; small simple teapot on counter, amber tea, no sugar cubes.
6 Ginger infusion in a clear mug; small fresh ginger slices on a saucer, pale gold brewed infusion, no supplement jars.
7 Lower-fat dairy milk in a clear glass; milk jug on counter, white milk, no cartons or labels.
8 Unsweetened fortified soy drink in a sand-coloured ceramic cup; plain plant-drink jug and a few soybeans in a tiny bowl on counter, off-white drink, no carton or labels.
Maintain strict even grid alignment; do not omit, merge or add rows or columns. Photorealistic adults, not cartoons, no health transformation, medical symbols, fitness claims or decorative icons.
```

### Female sheet prompt

```text
Use case: photorealistic-natural.
Asset type: five-frame morning drink preparation contact sheet for a mobile lifestyle guide. One single photographic contact sheet, EXACTLY FIVE COLUMNS and EIGHT ROWS, all cells equal square, portrait aspect ratio 5:8. No gutters, borders, dividers, words, numbers, labels, logos or watermark. Target 1600 x 2560. Every cell is one consecutive step, never combine steps inside a cell.
Subject: an adult woman with tied-back dark hair, natural skin texture, plain muted sage casual shirt. Same person, face, clothing, camera and scale across all forty cells. Modern uncluttered kitchen counter, soft morning light, dark warm green background that suits a dark app. Waist-up framing showing the person's entire head, both hands, vessel and counter inside every square with comfortable 8% margins. Never crop the face or cup. Fixed camera and counter height, no extreme zoom. Useful preparation, not a posed wellness advertisement.
Columns show: 1 ingredients and empty vessel on counter, person looking at them; 2 carefully pouring the appropriate prepared liquid into vessel below chest level; 3 stirring the drink with one spoon while vessel rests on counter; 4 holding the vessel gently near chest before sipping; 5 small comfortable sip, cup not obscuring eyes. Keep each change visually distinct with plausible hand anatomy; a cup must not fuse with a hand or mouth. Hot drinks are comfortably warm, never boiling; no steaming kettle near the face. Person never drinks all eight at once: each row is a separate alternative.
Eight rows in this exact order:
1 Plain lukewarm water in a clear glass; glass water carafe visible, no lemon, no additives.
2 Lemon and optional honey water in a clear mug; small lemon half and tiny honey jar on counter, pale transparent lemon water, one small teaspoon as the only utensil.
3 Black filter coffee in a plain cream ceramic mug; small unbranded glass coffee carafe on counter, dark coffee, no cream.
4 Decaf filter coffee in a plain slate ceramic mug; unbranded small glass carafe, dark coffee, no cream; visually distinct mug but no text.
5 Plain brewed tea in an amber clear glass mug; small simple teapot on counter, amber tea, no sugar cubes.
6 Ginger infusion in a clear mug; small fresh ginger slices on a saucer, pale gold brewed infusion, no supplement jars.
7 Lower-fat dairy milk in a clear glass; milk jug on counter, white milk, no cartons or labels.
8 Unsweetened fortified soy drink in a sand-coloured ceramic cup; plain plant-drink jug and a few soybeans in a tiny bowl on counter, off-white drink, no carton or labels.
Maintain strict even grid alignment; do not omit, merge or add rows or columns. Photorealistic adults, not cartoons, no health transformation, medical symbols, fitness claims or decorative icons.
```

