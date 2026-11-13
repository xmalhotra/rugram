# Animal movements: backstory and expansion — 2026-10-24

## What changed

The existing six movement IDs remain intact. The same collection now contains ten swipeable cards: Bear crawl, Crab walk, Lateral ape, Frog travel, Inchworm walkout, Bird dog, Lateral bear crawl, Crab toe-touch, Controlled sit-through, Duck walk. The four additions have five-frame male and female previews and movement-specific benefits. They remain available to personal flows through the existing Add to Flow picker.

The collection preview shows a short attribution. Inside the collection a compact Backstory entry opens context; individual animal cards retain Benefits first under the information button and a closed Backstory & sources disclosure. Motion controls, saved IDs and frame-first presentation remain intact.

## Evidence and claim boundaries

- Vidyut Jammwal: https://www.youtube.com/watch?v=WwoeGzyxINk — his Kalari Chalanam video, a martial-arts inspiration, not this exact ten-card routine. The video was indexed in search; direct-page retrieval failed in the browsing tool, so no transcript or exact speech is claimed.
- Centr: https://centr.com/blogs/thewarmup/meet-the-master-behind-centr-masterclass-da-rulk — Centr itself reports Hemsworth's use of Da Rulk's functional movements for mobility. This is clearly attributed reporting, not independent confirmation or an endorsement of BetterHabits.
- Movement technique: https://centr.com/blogs/features/9-essential-moves-for-your-raw-functional-training-workout — Da Rulk's crawls and sit-throughs. Our controlled lateral variation is not presented as an exact recreation of every detail.
- Mike Fitch: https://animalflow.com/about/mike-fitch/ — founder of the branded Animal Flow system; not creator of all animal-inspired movement. This app is not an official branded course.
- Duck walk: https://ensomovement.com/blog/training/exercise-database/duck-walks/ — primary movement-coaching reference with cautions.
- Crab toe-touch: https://kpwellnessu.kaiserpermanente.org/wp-content/uploads/Animal-Moves-exercise-program-EW.pdf — institutional Animal Moves handout (opposite toe touch, page 2).

Celebrity use is social context, not evidence of universal suitability or guaranteed health outcomes. No celebrity likeness, testimonial, footage or official-program affiliation was fabricated. The original certified-system teaching materials were not copied into a new branded tutorial library.

## Media and review boundary

Built-in image-generation tool used; no CLI/API fallback. Final assets copied into the workspace:

- `mobile/assets/flows/flow-animal-extra-male-v1.jpg`: 1402 × 1122; SHA-256 `b106ee266c688c0808192b0016daf724dfd4f7fe003a4c952aec2fdb261c65c5`
- `mobile/assets/flows/flow-animal-extra-female-v1.jpg`: 1402 × 1122; SHA-256 `267a1683e8c0716f7b051fb864f9d2ddb8ea195955865ec35f3e8f5da3cc9d72`

Four rows × five columns: lateral bear, crab toe-touch, sit-through, duck walk. Metadata preserves full bodies/contact points and the same square viewer. Original assets were not overwritten. These are generated educational illustrations, not filmed demonstrations or coach/clinical approvals. Source authority does not approve generated anatomy or technique.

The initial reverse-crawl row did not make direction legible. A directional refinement was tried but not accepted for reverse-crawl publication. That move was replaced with the much clearer crab toe-touch. There is no published reverse-crawl card in this expansion. Published atlases were visually inspected for grid, full-body framing and the replacement action. Phone interaction and coaching review remain separate verification gates.

## Verification

400 automated tests passed, including new backstory open/close, exact source-link callbacks, ten-card grouping, five-frame metadata and all-catalogue crop/bundle coverage. Root/mobile TypeScript and targeted lint passed. The personal-flow local PostgreSQL test also passed with the expanded collection. Native iOS export checks bundling only, not physical sensor behavior.

## Prompt set

Base generation was run twice, with the gender suffix below. Its second row was subsequently replaced; the reverse-crawl wording here is retained as generation provenance, not published technique approval.

```text
Use case: scientific-educational. Asset: photorealistic exercise sprite atlas for BetterHabits. Generate ONE image laid out as EXACTLY 4 rows and 5 equal-width columns (20 square cells; landscape 5:4 canvas). Each row is ONE movement in FIVE genuinely different chronological frames, not four frames and not repeated images. No text, numbers, labels, logos, dividers, UI or arrows. Dark forest-green seamless studio and matte non-slip floor; soft natural side lighting. One consistent non-famous athletic adult demonstrator in modest teal sportswear and black training shoes. Fixed camera, fixed floor, fixed scale within each row. Full body, all hands and feet entirely visible in every cell, slight clearance at edges, no anatomical distortions, no ghosting or motion blur. The athlete must visibly travel relative to the fixed floor; do not recenter every frame.
ROW 1 LATERAL BEAR CRAWL: front three-quarter view, knees hover a few cm above floor and hips near shoulder height, flat back. Frame1 stable four-point hover at left of cell. Frame2 left hand and right foot take small step toward viewer's right. Frame3 other hand and foot follow, body has shifted sideways. Frame4 another small side step. Frame5 stable four-point hover now at right of cell. Never turn into a plank or stand.
ROW 2 REVERSE BEAR CRAWL: side view facing right, bent knees hover off floor. Frame1 hover with body slightly right of cell. Frame2 one hand/opposite foot step backward toward viewer's left. Frame3 other diagonal pair follows; body behind previous position. Frame4 next backward small step. Frame5 stable bent-knee hover farther left. Always facing right, never walking forward.
ROW 3 CONTROLLED SIT-THROUGH: front three-quarter view. Frame1 bent-knee four-point hover. Frame2 shift support into left hand and right foot, right hand starts lifting. Frame3 rotate torso to the right while left leg passes under the body. Frame4 left leg extends low to the right while right knee stays bent, supported left hand and planted right foot, right hand lifted. Frame5 reverse to the initial four-point bent-knee hover. No jumps, no backbend, no extra limbs.
ROW 4 DUCK WALK: side three-quarter view facing right. Frame1 supported-by-feet-only comfortable squat, knees bent, torso slightly forward, hands together at chest for balance. Frame2 shift onto left foot and move right foot forward. Frame3 settle still low. Frame4 left foot steps forward. Frame5 balanced low squat slightly farther forward. Both feet remain near floor, no frog jump, no hands on floor, no forced extreme knee flexion.
Keep all twenty cells strictly equal sized. Show plausible, legible contact changes, not just camera changes. This is an illustrative storyboard, not a photograph of any celebrity.
```

Male suffix: `Demonstrator for ALL cells: adult man, short dark hair, teal T-shirt and dark charcoal shorts.`
Female suffix: `Demonstrator for ALL cells: adult woman, dark hair in a tied-back ponytail, teal short-sleeve athletic top and charcoal full-length leggings.`

A directional refinement requested body centers at 35%, 42%, 50%, 58%, 65% across lateral and duck rows, and 65%, 58%, 50%, 42%, 35% for reverse crawl; knees hovering, fixed world-floor seams, no recentering, no ghost limbs, preserve the sit-through row. The male refinement was the input to the final correction. The female refinement introduced an unsuitable last reverse pose and was discarded; the initial female atlas was used for its final correction instead.

Final correction prompt, used for both accepted assets:

```text
Edit target: the attached 4 rows by 5 columns exercise atlas. Change ONLY the SECOND ROW of five square panels. Keep ALL pixels in rows 1, 3, 4, and keep canvas size, grid, same person's appearance and clothes, lighting, camera style and dark green studio. The old second-row reverse crawl is to be removed completely. Replace it with a CRAB OPPOSITE TOE TOUCH sequence from a face-up supported crab position. All five panels show the entire body, no feet or hands cut off, natural anatomy, no text or arrows. Fixed three-quarter side view.
Second row panel 1: adult sits face-up, knees bent, feet flat in front, both palms behind the torso on floor, hips lifted just slightly into low crab support.
Panel 2: the RIGHT hand and LEFT foot lift gently toward each other while LEFT hand and RIGHT foot remain planted, chest still facing up.
Panel 3: RIGHT fingertips touch the raised LEFT toes clearly in front of the torso. Supporting LEFT palm and RIGHT foot planted; hips low, knee flexed, no backbend. The opposite hand-to-foot contact is the essential visible peak.
Panel 4: RIGHT hand and LEFT foot lower back down with control; chest still face-up.
Panel 5: return to a low supported face-up crab with BOTH palms behind and BOTH feet in front on floor.
Exactly five panels, exactly one full opposite toe-touch cycle. No crawling in the replacement row, no plank, no sit-through twist, no deep bridge, no acrobatics. All other three rows must remain unchanged.
```

The ongoing reproducible storyboard specification is also available through `flowAtlasPrompt('flow-animal-extra', gender)` in `shared/flow-frame-sequences.ts`.

