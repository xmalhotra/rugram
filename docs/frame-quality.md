# Frame quality contract — v1

This is a quality/review gate for claiming verified instructional media, not a harder workout or a switch that removes the visual preview. It applies to the design of movement and habit sequences. A generated image existing, a good prompt, or the text guide's `reviewedOn` date is **not** approval of its visual instruction.

## Before generation

- Define **one thing the viewer should learn** and an observable success check. A card is not successful just because the person looks athletic.
- Storyboard the start, the action/change, and the result/check. Use 3–12 purposeful keyframes; this movement atlas renderer currently supports exactly four. Add more frames or use filmed/rigged animation when four cannot explain the action. Never force a complex movement into four almost-identical photographs.
- For habits use context/start → action → visible outcome/check; don't turn outcomes into unsupported health promises.
- For movement record the support points, moving limbs, direction, and invariant alignment for every phase. A reset is an explicit phase, not a shortcut around an omitted action.
- Lock one adult demonstrator, outfit, camera position, lens, lighting, background, floor plane and canvas. Review both demonstrator variants independently.

## Hard visual boundaries

These numeric thresholds are internal product acceptance criteria, **not clinical or industry standards**:

- All movement frames use one square **1:1** canvas, target **1024 × 1024**. Actual per-frame pixel dimensions must match throughout a sequence. See [generation and import rules](movement-image-generation.md); the fixed UI ratio is independent of movement and frame count.
- Floor/contact reference varies at most 2% of canvas height.
- Camera/demonstrator scale varies at most 5 percentage points. Measure scale from fixed anatomical references, not the bounding box of a changing limb pose.
- Entire person, hands and feet stay inside an 8% canvas-safe margin. Do not auto-zoom individual frames to fit.
- One short phase label (≤60 characters), one concrete cue (≤180 characters), matched to what is actually visible.
- Action phases cannot reuse the same source frame. A labelled reset may reuse the starting frame; a second side must visibly be a second side.
- No facing-direction flips, extra/missing limbs, foot sliding, impossible contacts, joint morphing, unexplained jumps or switching the exercise halfway through.
- Fixed card dimensions, stable control bar and crop. Forward/reverse visit phases in order without wrapping. Never use crossfades to conceal incorrect anatomy or fake continuous movement from unrelated poses.

## Human release review (all must pass)

1. A named reviewer with relevant movement qualification checks anatomy, contact, cue accuracy, technique/source match and safety against the **actual asset**, not just the prompt. For non-physical habits use a reviewer qualified in that procedure/domain.
2. Review start/action/end at normal speed, manually scrub every phase, and reverse. Check both appearances on the actual supported device viewport; verify labels with large text and screen reader.
3. At least three first-time viewers independently explain the action, its direction/order, and the completion check. All must be correct without extra verbal coaching. Record the evidence externally and summarize it in the review notes. Three is a minimum product usability gate, not a statistical validation claim.
4. Store approved checks, reviewer identity/qualification, date, comprehension result and exact asset SHA-256 in `reviewedMovementSequences`. No missing review, future date, unchecked item or mismatched hash is allowed. Content-admin edits cannot mark a bundled atlas approved.
5. Changing any image invalidates the hash-bound approval. Store `movementGuideSnapshot(flow)` as `guideSnapshot` at sign-off; changed written instructions automatically fail the snapshot check and require re-review of the image/cue match. Do not edit a hash or snapshot merely to make a test green.

Automation checks recorded metadata, bounds, crop mapping and the asset hash. It **cannot** determine anatomy, establish a reviewer's credentials, or establish comprehension. Review records must be truthful. Approval means this instructional representation met this checklist; it does not mean the exercise suits every person.

## Bear crawl: what the next sequence must communicate

One cycle must clearly show a stable hover → one opposite hand/foot pair advances → the other pair advances → stable support after both sides. Keep camera, floor, scale and facing direction fixed; the viewer must be able to name which limbs moved. A coach must review that storyboard and actual replacement imagery. These are proposed acceptance phases, **not labels retroactively assigned to the current PNGs**.

The existing written setup's neutral-spine, knees-hovering basis was rechecked against [ACE's bear-crawl description](https://www.acefitness.org/resources/pros/expert-articles/6377/5-cognitive-awareness-drills-for-training-athletes/). This reference is not an endorsement or validation of our assets.

## Current asset disposition

Both `male-v1.jpg` and `female-v1.jpg` are **unapproved**. The female bear row changes facing direction; the renderer substitutes a repeated frame. The female inchworm row substitutes a repeated frame to avoid an unwanted push-up phase. Other rows have no recorded technique/comprehension sign-off. They must not inherit approval from another row or appearance.

The card always presents its available movement frames with Tilt (default) and Slider controls. Quality status does not hide the preview or replace it with written instructions. All written technique, safety, sources and review limitations are accessed through ⓘ. An unreviewed preview is identified honestly there; it is not labelled a verified demonstration. Appearance and info controls remain in the fixed toolbar, and appearance selection is account-wide. Sensor subscriptions still pause for inactive cards, open information, image loading, backgrounding and accessibility guards. No current sequence has been falsely marked approved. The quality contract remains the acceptance standard for future corrected imagery.

## Release checklist

- [ ] Reviewed source and explicit storyboard for this movement/variant
- [ ] Measured framing/crop data from final asset
- [ ] All seven named visual/safety checks pass
- [ ] Qualified reviewer and date recorded with review evidence
- [ ] First-time comprehension review: at least 3/3 correct
- [ ] Hash and four displayed crops match the recorded review
- [ ] Phone tilt, slider, reduced motion, swipe, large text and source links checked

Implementation: `shared/frame-quality.ts`, `shared/movement-quality.ts`. Tests: `tests/frame-quality.test.ts`. This policy doesn't claim a retrospective audit of every unrelated habit card in the catalogue.
