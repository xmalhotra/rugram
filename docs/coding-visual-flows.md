# Coding-support visual flows

Implemented 24 October 2026. These are habits around coding, not courses or an in-app coding environment.

## What appears in Tech → Coding

- Work setups: compact laptop desk, one-monitor home office, two screens with clear roles, changing working position.
- Coding playlists: silence, musicForProgramming, SomaFM Groove Salad. External audio opens only after an explicit tap; nothing automatically streams.
- Programmer habits: protect a focus block (Paul Graham), start small (Linus Torvalds), check a simple experiment (Andrej Karpathy), a portable walking reset (Vitalik Buterin).

Each collection is one saveable flow, with swipeable cards inside it and five visual stages per card. Tilt is the initial frame control; Slider allows choosing a middle stage. The demonstrator appearance is shared globally, while the mode stays per card. Existing fixed controls, heart, bottom navigation and named card rail are reused. Short frame captions make the action identifiable. Benefits and dated attribution are under the information button.

These are illustrative storyboards, not filmed movements or pixel-interpolated video. Some generated camera positions differ between stages. No public figure is depicted, and these generic demonstrators do not imply endorsement. The historical course records remain resolvable for existing saves; the default Coding shelf and the exact old CMS seed list now show the new collections instead.

## Sources and attribution boundaries

- [HSE workstation checklist](https://www.hse.gov.uk/pubns/ck1.pdf): screen, input-device and workstation considerations. Equipment arrangements are optional ideas, not personal ergonomic assessments or purchase requirements.
- [Paul Graham, July 2009](https://www.paulgraham.com/makersschedule.html): uninterrupted maker time; our sequence adapts the idea, not his present-day timetable.
- [Linus Torvalds interview, June 2012](https://www.linux.com/news/30-linux-kernel-developers-30-weeks-linus-torvalds/): small contributions and a stated preference for silence. No inference about today's routine.
- [Andrej Karpathy, April 2019](https://karpathy.github.io/2019/04/25/recipe/): begin simply, form expectations and investigate experimental results. Adapted to a work habit, not a tutorial.
- [Vitalik Buterin, ETHPanda interview published October 2024](https://wublock.substack.com/p/vitalik-envisions-the-world-100-years): authorised transcript of his remarks about portable walking/running while travelling. The source warns about transcription errors. The stopping note and desk-break sequence are our adaptation, not a routine he claimed.
- [musicForProgramming](https://musicforprogramming.net/), also checked through its [official RSS](https://musicforprogramming.net/rss.php): a mix library. Not attributed as any programmer's favourite.
- [SomaFM Groove Salad](https://somafm.com/groovesalad/): official ambient/downtempo station description. Editorial suggestion only.

Direct X profile/post access returned HTTP 403 during research; no current X routine was verified. No exact daily schedules, invented playlists, performance guarantees or celebrity approval claims are included.

## Saved bitmap assets

Generated using the built-in image-generation tool, not the CLI/API fallback. All six PNGs are bundled locally; no remote image service is required at runtime.

- [Setups · male](../mobile/assets/coding/coding-setups-male-v1.jpg)
- [Setups · female](../mobile/assets/coding/coding-setups-female-v1.jpg)
- [Audio · male](../mobile/assets/coding/coding-audio-male-v1.jpg)
- [Audio · female](../mobile/assets/coding/coding-audio-female-v1.jpg)
- [Habits · male](../mobile/assets/coding/coding-habits-male-v1.jpg)
- [Habits · female](../mobile/assets/coding/coding-habits-female-v1.jpg)

Measured source boundaries are recorded in shared/fitness-media-layout.ts. Coding crops trim sheet dividers and remain square, avoiding frame-ratio jumps and neighbouring-frame bleed.

## Verification

- 376 unit/component tests passed, including collection membership, saved legacy-flow resolution, old CMS seed migration, five-stage square crops and explicit audio-link actions.
- Mobile and root TypeScript checks passed; targeted ESLint and diff whitespace checks passed.
- iOS export succeeded at /private/tmp/betterhabits-coding-flows-20261024-final, including all six bundled atlases.
- The read-only local managed-content loader returned Work setups (4 cards), Coding playlists (3), Programmer habits (4), with all 11 internal records present.
- All six image sheets were visually inspected. This is not a phone-layout, hardware-tilt or performance result. Browser rendering was unavailable because this native checkout does not include react-native-web; no web dependency was added just for this task.

## Prompt set

## workspace · male

```text
Use case: photorealistic-natural.
Asset type: bundled sequential photograph sprite atlas for a mobile coding-habits guide, not an app screenshot.
Primary request: exact 5 columns by 4 rows grid of edge-to-edge square photos, no gutters, no labels, no borders. Each row is one card; columns 1 to 5 are consecutive stages with visible meaningful changes, not five copies.
Scene: realistic modest home office, forest-dark wall, warm wooden desk, soft daylight, teal and charcoal objects. Generic adult man with short dark hair, teal casual shirt; not a celebrity or identifiable real individual. Keep identical person, room, objects, camera angle, scale, and lighting across each row. Stable three-quarter side view shows hands, relevant devices and task clearly. Natural human anatomy and realistic photographic textures. No text, numbers, brand logos, code closeups, watermarks, fantastical screens, illustrated icons, unrelated props. Screens show abstract unbranded window shapes only. Each square is independently usable. Output canvas has exact 5:4 aspect ratio.
ROWS=4. Row 1: compact laptop workspace with separate keyboard and mouse: clear desk; place laptop securely on raised stand; position separate keyboard and mouse; adjust chair with feet supported; sit comfortably ready to work. Row 2: single external monitor with laptop: place monitor centered; connect laptop dock; set keyboard and mouse in easy reach; adjust monitor viewing position; work seated facing main monitor. Row 3: dual-monitor workspace: place main monitor ahead; add second monitor beside it at comparable height; connect both; put main work on center display and reference on second; work comfortably facing main display. Row 4: adjustable sit-stand desk: seated comfortable setup; stand up away from chair; raise desk with button; adjust keyboard and screen for comfortable standing; work standing with relaxed posture. No unsafe lifting while holding a monitor, no sitting on floor.
```

## workspace · female

```text
Use case: photorealistic-natural.
Asset type: bundled sequential photograph sprite atlas for a mobile coding-habits guide, not an app screenshot.
Primary request: exact 5 columns by 4 rows grid of edge-to-edge square photos, no gutters, no labels, no borders. Each row is one card; columns 1 to 5 are consecutive stages with visible meaningful changes, not five copies.
Scene: realistic modest home office, forest-dark wall, warm wooden desk, soft daylight, teal and charcoal objects. Generic adult woman with tied-back dark hair, teal casual shirt; not a celebrity or identifiable real individual. Keep identical person, room, objects, camera angle, scale, and lighting across each row. Stable three-quarter side view shows hands, relevant devices and task clearly. Natural human anatomy and realistic photographic textures. No text, numbers, brand logos, code closeups, watermarks, fantastical screens, illustrated icons, unrelated props. Screens show abstract unbranded window shapes only. Each square is independently usable. Output canvas has exact 5:4 aspect ratio.
ROWS=4. Row 1: compact laptop workspace with separate keyboard and mouse: clear desk; place laptop securely on raised stand; position separate keyboard and mouse; adjust chair with feet supported; sit comfortably ready to work. Row 2: single external monitor with laptop: place monitor centered; connect laptop dock; set keyboard and mouse in easy reach; adjust monitor viewing position; work seated facing main monitor. Row 3: dual-monitor workspace: place main monitor ahead; add second monitor beside it at comparable height; connect both; put main work on center display and reference on second; work comfortably facing main display. Row 4: adjustable sit-stand desk: seated comfortable setup; stand up away from chair; raise desk with button; adjust keyboard and screen for comfortable standing; work standing with relaxed posture. No unsafe lifting while holding a monitor, no sitting on floor.
```

## audio · male

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas bundled in a mobile coding-habits app, not a screenshot. Exact 5 columns by 3 rows grid of square photographs, no gutters, no borders, no labels. Output aspect ratio 5:3. Each row is a separate card and its five cells are consecutive meaningful actions, not copies. Generic adult man with short dark hair in teal casual shirt, charcoal trousers, natural face and hands; never a celebrity. Realistic modest home office, dark forest-green wall, wooden desk, gentle daylight. Fixed three-quarter side camera and identical subject, lighting, objects, room and scale across each row. Relevant devices and hands visible. No readable text, numbers, logos, icons or watermarks. Screens show abstract unbranded window shapes. Natural textures and believable anatomy.
Row1 quiet mode: headphones resting unused on desk; person silences phone and puts it aside; clears distracting browser panels; works quietly with no headphones; writes a short session note. Row2 ambient mix: person reaches for headphones; puts them on; selects an abstract audio library on computer; types comfortably; removes headphones and notes preference. Row3 downtempo station: person chooses unbranded radio player on monitor; lowers audio volume using knob; puts on headphones; works seated; pauses audio and removes headphones. Show meaningful different actions from frame to frame. Keep same desk and camera across all five cells of each row.
```

## audio · female

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas bundled in a mobile coding-habits app, not a screenshot. Exact 5 columns by 3 rows grid of square photographs, no gutters, no borders, no labels. Output aspect ratio 5:3. Each row is a separate card and its five cells are consecutive meaningful actions, not copies. Generic adult woman with tied-back dark hair in teal casual shirt, charcoal trousers, natural face and hands; never a celebrity. Realistic modest home office, dark forest-green wall, wooden desk, gentle daylight. Fixed three-quarter side camera and identical subject, lighting, objects, room and scale across each row. Relevant devices and hands visible. No readable text, numbers, logos, icons or watermarks. Screens show abstract unbranded window shapes. Natural textures and believable anatomy.
Row1 quiet mode: headphones resting unused on desk; person silences phone and puts it aside; clears distracting browser panels; works quietly with no headphones; writes a short session note. Row2 ambient mix: person reaches for headphones; puts them on; selects an abstract audio library on computer; types comfortably; removes headphones and notes preference. Row3 downtempo station: person chooses unbranded radio player on monitor; lowers audio volume using knob; puts on headphones; works seated; pauses audio and removes headphones. Show meaningful different actions from frame to frame. Keep same desk and camera across all five cells of each row.
```

## habits · male

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas bundled in a mobile coding-habits app, not a screenshot. Exact 5 columns by 4 rows grid of square photographs, no gutters, no borders, no labels. Output aspect ratio 5:4. Each row is a separate card and its five cells are consecutive meaningful actions, not copies. Generic adult man with short dark hair in teal casual shirt, charcoal trousers, natural face and hands; never a celebrity. Realistic modest home office, dark forest-green wall, wooden desk, gentle daylight. Fixed three-quarter side camera and identical subject, lighting, objects, room and scale across each row. Relevant devices and hands visible. No readable text, numbers, logos, icons or watermarks. Screens show abstract unbranded window shapes. Natural textures and believable anatomy.
Generic adults demonstrating adapted work habits, NOT public figures. Row1 protect focus block: person looks at desk calendar; marks a block using pen; places phone face down; works at single screen; notes next step in notebook. Row2 start small: person faces a crowded screen; selects a single small task on paper; closes extra windows; works on that one task; checks it on paper. Row3 careful experiment: person studies notebook hypothesis; inspects abstract sample tiles on monitor; starts a simple experiment; checks a result chart; writes comparison in notebook. Row4 portable walking break: person writes a stopping note seated at laptop; stands up; walks from desk toward room doorway; walks along safe green garden path; returns to desk and opens notebook. Fixed wide camera, no zoom or scale changes. No depictions or likenesses of famous people.
```

## habits · female

```text
Use case: photorealistic-natural. Asset type: sequential photo atlas bundled in a mobile coding-habits app, not a screenshot. Exact 5 columns by 4 rows grid of square photographs, no gutters, no borders, no labels. Output aspect ratio 5:4. Each row is a separate card and its five cells are consecutive meaningful actions, not copies. Generic adult woman with tied-back dark hair in teal casual shirt, charcoal trousers, natural face and hands; never a celebrity. Realistic modest home office, dark forest-green wall, wooden desk, gentle daylight. Fixed three-quarter side camera and identical subject, lighting, objects, room and scale across each row. Relevant devices and hands visible. No readable text, numbers, logos, icons or watermarks. Screens show abstract unbranded window shapes. Natural textures and believable anatomy.
Generic adults demonstrating adapted work habits, NOT public figures. Row1 protect focus block: person looks at desk calendar; marks a block using pen; places phone face down; works at single screen; notes next step in notebook. Row2 start small: person faces a crowded screen; selects a single small task on paper; closes extra windows; works on that one task; checks it on paper. Row3 careful experiment: person studies notebook hypothesis; inspects abstract sample tiles on monitor; starts a simple experiment; checks a result chart; writes comparison in notebook. Row4 portable walking break: person writes a stopping note seated at laptop; stands up; walks from desk toward room doorway; walks along safe green garden path; returns to desk and opens notebook. Fixed wide camera, no zoom or scale changes. No depictions or likenesses of famous people.
```

