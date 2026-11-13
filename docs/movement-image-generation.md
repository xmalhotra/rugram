# Standard movement image canvas

All movement cards use **1:1** frames. Target image size: **1024 × 1024 pixels per pose**, for every movement and every demonstrator. Frame count is independent of this ratio; do not add duplicate poses just to fill a sheet.

## Required generation brief

Generate ONE square 1024 × 1024 movement frame, edge-to-edge background, no border, no inset panel, no padding added to the bitmap. Keep the entire adult demonstrator, hands and feet within the same 8% safe area. Use the approved storyboard phase and fixed camera, lens, scale, lighting, clothing and floor contact line from the sequence reference. The camera must accommodate the largest extended pose in the WHOLE sequence; never zoom or reframe a single pose. Do not change the image aspect ratio for wide or tall movements. Do not stretch anatomy or crop limbs to fill the canvas. Background fills the entire square; safe composition space is part of that background, not an extra UI card inside the image. No text or embedded controls. Review against the exact phase cue; prompt compliance is not technique approval.

Generate individual frames or a precisely specified grid of square cells. For a grid, total width = columns × 1024 and height = rows × 1024, with no gutters. Do not infer cells from uneven content rows or scale each extracted pose independently. Split the exact equal cells and check their dimensions before importing. If the generator outputs a wrong-ratio or malformed grid, reject/regenerate it; don't silently stretch or crop a person to repair it.

## Import and review

Record actual `pixelWidth` and `pixelHeight` for every final frame. The review validator requires square movement frames and identical dimensions throughout a sequence. The canonical target is 1024 × 1024. Review data must match the actual displayed crop dimensions and the asset hash; setting metadata to 1024 does not convert an old image.

For new standalone PNG exports run `npm run media:check-movement-frames -- frame1.png frame2.png ...`. This is a PNG-header dimension gate, not a check of anatomy, image integrity, visual quality or technique. It rejects non-square exports or sizes other than the canonical target. Contact sheets must be split into individual exact cells before this check.

## Existing assets

The legacy male/female atlases contain measured, unequal-height rows. They have **not been regenerated**. The viewer now uses the same square outer frame for every row and contains legacy imagery without distorting or cutting off the person. Some legacy images therefore need background/matte space inside that square until replaced. New compliant square imagery fills the same surface with zero fitting offsets.

Fixed-size page, controls, position row, glass rim and glow do not resize with the movement, pose or gender. Small screens shrink the whole square uniformly to available width/height instead of changing its ratio.
