import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { isMovementCanvas, movementMediaSpec } from '../shared/movement-media';
import { movementCrop, movementImageFit } from '../shared/movement-viewer';
import {
  frameSequenceQuality,
  frameReviewChecks,
  type FrameSequence,
} from '../shared/frame-quality';

test('generation target is square and does not depend on movement, pose count or appearance', () => {
  assert.deepEqual(movementMediaSpec, { aspectRatio: 1, targetWidth: 1024, targetHeight: 1024 });
  assert.equal(isMovementCanvas(1024, 1024), true);
  for (const [w, h] of [
    [1024, 1536],
    [1536, 1024],
    [0, 0],
    [NaN, 1024],
    [1024.5, 1024.5],
  ])
    assert.equal(isMovementCanvas(w, h), false);
  for (const gender of ['male', 'female'] as const) {
    for (let row = 0; row < 6; row++) {
      for (const progress of [0, 1 / 3, 2 / 3, 1]) {
        const fit = movementImageFit(movementCrop(row, progress, gender), 360, 560);
        assert.equal(fit.width, 360);
        assert.equal(fit.height, 360);
      }
    }
  }
  const compliant = movementImageFit({ width: 1024, height: 1024 }, 360, 560);
  assert.equal(compliant.offsetX, 0);
  assert.equal(compliant.offsetY, 0);
  assert.equal(compliant.imageWidth, compliant.width);
  assert.equal(compliant.imageHeight, compliant.height);
});

test('review rejects non-square and mixed-resolution movement sequences, independently of frame count', () => {
  const hash = 'a'.repeat(64);
  const sequence: FrameSequence = {
    kind: 'movement',
    goal: 'Test goal',
    successCheck: 'Test outcome',
    assetHash: hash,
    sourceUrls: ['https://example.org/reference'],
    frames: Array.from({ length: 6 }, (_, index) => ({
      assetFrame: index,
      pixelWidth: 1024,
      pixelHeight: 1024,
      role: index === 0 ? 'start' : index === 5 ? 'check' : 'action',
      label: `Phase ${index}`,
      cue: `Cue ${index}`,
      subject: 'Test adult',
      camera: 'Fixed camera',
      floorY: 0.85,
      subjectScale: 0.6,
      margin: 0.1,
    })),
    review: {
      status: 'approved',
      assetHash: hash,
      reviewer: 'Synthetic test only',
      qualification: 'Test fixture only',
      reviewedAt: '2020-01-01',
      checks: Object.fromEntries(frameReviewChecks.map(key => [key, true])),
      comprehension: { tested: 3, understood: 3 },
      notes: 'Not actual asset approval',
    },
  };
  assert.equal(frameSequenceQuality(sequence, hash).playable, true);
  sequence.frames[2].pixelHeight = 1536;
  assert.equal(frameSequenceQuality(sequence, hash).playable, false);
  Object.assign(sequence.frames[2], { pixelWidth: 512, pixelHeight: 512 });
  assert.equal(
    frameSequenceQuality(sequence, hash).playable,
    false,
    'Even square frames must share pixel dimensions',
  );
  const prompt = readFileSync('docs/movement-image-generation.md', 'utf8');
  assert.match(prompt, /1024 × 1024/);
  assert.match(prompt, /1:1/);
});
