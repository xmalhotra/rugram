import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fitnessAtlasLayouts,
  fitnessCrop,
  fitnessFrameCount,
} from '../shared/fitness-media-layout';
import { movementImageFit } from '../shared/movement-viewer';
import type { FitnessMedia } from '../shared/fitness-guides';

test('pose counts follow the actual row rather than the whole atlas default', () => {
  assert.equal(fitnessFrameCount({ atlas: 'cindy', row: 0 }, 'female'), 7);
  assert.equal(fitnessFrameCount({ atlas: 'cindy', row: 2 }, 'male'), 7);
  assert.equal(fitnessFrameCount({ atlas: 'flow-animal', row: 4 }, 'female'), 6);
  assert.equal(fitnessFrameCount({ atlas: 'flow-animal', row: 4 }, 'male'), 5);
});
test('reported neighboring-body leaks are excluded without cutting the current person', () => {
  // Manually inspected source-space subject boxes and the nearest neighboring subject edge.
  const fixtures = [
    {
      media: { atlas: 'flow-animal', row: 4 },
      frame: 5,
      count: 6,
      body: [1140, 912, 1221, 1182],
      previousEnd: 1076,
      nextStart: 1254,
    },
  ] as const;
  for (const { media, frame, count, body, previousEnd, nextStart } of fixtures) {
    const crop = fitnessCrop(media, 'female', frame / (count - 1));
    assert.ok(crop.x > previousEnd && crop.x + crop.width < nextStart);
    assert.ok(crop.x <= body[0] && crop.y <= body[1]);
    assert.ok(crop.x + crop.width >= body[2] && crop.y + crop.height >= body[3]);
  }
});
test('every atlas crop stays in its own panel and fits the same square stage without stretching', () => {
  for (const atlas of Object.keys(fitnessAtlasLayouts) as FitnessMedia['atlas'][])
    for (const gender of ['male', 'female'] as const) {
      const layout = fitnessAtlasLayouts[atlas][gender];
      for (let row = 0; row < layout.rows.length - 1; row++) {
        const media = { atlas, row },
          count = fitnessFrameCount(media, gender);
        let previousRight = -1;
        for (let frame = 0; frame < count; frame++) {
          const crop = fitnessCrop(media, gender, frame / (count - 1));
          assert.ok(crop.x > previousRight);
          assert.ok(crop.y >= layout.rows[row]);
          assert.ok(
            crop.x + crop.width <= layout.width && crop.y + crop.height <= layout.rows[row + 1],
          );
          previousRight = crop.x + crop.width;
          const fit = movementImageFit(crop, 360, 440);
          assert.equal(fit.width, 360);
          assert.equal(fit.height, 360);
          assert.ok(fit.offsetX >= -1e-9 && fit.offsetY >= -1e-9);
          assert.ok(Math.abs(fit.imageWidth / fit.imageHeight - crop.width / crop.height) < 1e-9);
        }
      }
    }
});
