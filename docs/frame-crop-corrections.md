# Flow frame corrections — 2026-10-24

## Applied

- Preserved the black-thumbnail-background removal from the previous change.
- Female Cindy: measured separate boundaries for pull-up, push-up, and squat rows. The squat has six actual poses, not five; the other female Cindy rows have five.
- Female inchworm: corrected the six source panels, including the final standing pose starting after x=1082. The previous x=1045 boundary included the preceding head.
- Animal and general-fitness atlases: corrected measured column boundaries and retained full final-row source extents.
- Shared crop renderer: contain the whole rectangular source panel in the fixed square stage. Do not crop bodies merely to make the source region square. Thumbnails use the same corrected crop metadata.
- Viewer counters, Tilt sequence, Slider range, and markers use the current row's actual pose count.
- Image loading now belongs to an atlas/appearance/retry request rather than the selected card. Removed the effect that could reset a successful cached load. Late callbacks from old appearances/retries are ignored. Adjacent mounted cards opportunistically prefetch development-server HTTP assets; installed resources require no download.
- A 30-second delay is now a slow-loading state, not a claimed image failure. Actual native errors remain distinct, their diagnostic reason is retained, and Retry creates a fresh keyed image request. Late successful loads recover normally.
- Re-selecting the active bottom tab dismisses the outer inline detail once and returns to its existing list/category. Back still closes nested information first. Native dialogs retain their separate behavior. No tab listener is retained after blur/unmount.

## Verification

- 418 automated tests passed; includes the exact three screenshot regressions, row-specific pose counts, all-atlas geometric containment, cached-load event order, late callbacks, retry, and tab re-selection.
- Root and mobile TypeScript checks passed; targeted shared/mobile lint passed.
- iOS Expo export passed: `/private/tmp/bh-frame-corrections-ios-20261024`.
- Generated and visually reviewed 34 contact sheets containing 881 source-panel crops. Each uses the production crop function and the same square contain-style presentation; all source atlases decode successfully. These are QA renders, not phone screenshots.
- All 42 PNG assets returned successful responses with image bodies from the local Metro asset server. This does not establish a particular phone's network or decoder behavior.

Review gallery: `reports/frame-crop-audit/index.html`; crop coordinates and source hashes: `reports/frame-crop-audit/audit.json`.

Reproduce the gallery with:

```sh
npx tsx scripts/audit-frame-crops.ts
```

## Boundaries

No image assets were regenerated or edited. Deliberate source close-ups stay close-ups; this fixes viewport clipping and neighboring-frame leaks, not missing details in a source image or the biomechanical accuracy of a generated illustration. Reference sources and existing quality-review status are unchanged.

Images still ship as bundled application resources. No CDN or separate on-demand download system was introduced. Expo Go still fetches development assets from the local Metro server. Phone smoothness, iOS native tab interaction, and the original phone-specific image failure need physical-device confirmation; no claim of phone verification is made.
