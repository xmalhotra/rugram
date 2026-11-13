import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  clampProgress,
  movementCrop,
  movementFrame,
  movementRows,
  movementImageFit,
  movementStageFit,
  portraitTiltRoll,
  tiltProgress,
  smoothMovement,
  heldMovementFrame,
  movementGlow,
  advanceMovement,
  tiltPlaybackIntent,
  type TiltPlaybackIntent,
} from '../shared/movement-viewer';
import { animalMovementFlows } from '../shared/animal-movements';
import { fitnessMedia } from '../shared/fitness-guides';
import { fitnessAtlasLayouts } from '../shared/fitness-media-layout';
test('legacy animal rows stay stable and every expanded guide has its own five-frame human atlas row', () => {
  assert.deepEqual(
    animalMovementFlows.slice(0, 6).map(flow => movementRows[flow.id]),
    [0, 1, 2, 3, 4, 5],
  );
  for (const flow of animalMovementFlows) {
    const media = fitnessMedia[flow.id];
    assert.ok(media);
    for (const gender of ['male', 'female'] as const) {
      const layout = fitnessAtlasLayouts[media.atlas][gender];
      assert.ok(layout.columns >= 5);
      assert.ok(media.row >= 0 && media.row < layout.rows.length - 1);
    }
  }
});

test('all movements and appearances use one square frame while legacy image crops remain undistorted', () => {
  for (const gender of ['male', 'female'] as const) {
    for (let row = 0; row < 6; row++) {
      const crop = movementCrop(row, 0, gender);
      for (const [width, height] of [
        [360, 560],
        [300, 240],
        [800, 600],
      ]) {
        const fit = movementImageFit(crop, width, height);
        assert.equal(fit.width, Math.min(width, height));
        assert.equal(fit.height, fit.width);
        assert.ok(Math.abs(fit.imageWidth / fit.imageHeight - crop.width / crop.height) < 1e-9);
        assert.equal(fit.imageWidth, crop.width * fit.scale);
        assert.equal(fit.imageHeight, crop.height * fit.scale);
        assert.ok(fit.offsetX >= 0 && fit.offsetY >= 0);
        assert.ok(fit.offsetX + fit.imageWidth <= fit.width + 1e-9);
        assert.ok(fit.offsetY + fit.imageHeight <= fit.height + 1e-9);
        assert.ok(fit.width <= width + 1e-9 && fit.height <= height + 1e-9);
        assert.ok(Math.abs(fit.width - width) < 1e-9 || Math.abs(fit.height - height) < 1e-9);
      }
    }
  }
  for (const width of [0, NaN, -2])
  assert.equal(movementImageFit({ width: 256, height: 240 }, width, 600).scale, 0);
  const tall = movementStageFit({ width: 1024, height: 1024 }, 300, 520);
  assert.equal(tall.width, 300);
  assert.equal(tall.height, 520);
  assert.ok(tall.imageWidth >= 300 && tall.imageHeight >= 520);
  assert.ok(tall.offsetX <= 0 && tall.offsetY <= 0);
  const wide = movementStageFit({ width: 1024, height: 1024 }, 400, 220);
  assert.equal(wide.width, 400);
  assert.equal(wide.height, 220);
  assert.equal(movementStageFit({ width: 0, height: 10 }, 100, 100).scale, 0);
});

test('movement progress and invalid sensor readings stay bounded', () => {
  assert.equal(clampProgress(NaN), 0.5);
  assert.equal(movementFrame(-1), 0);
  assert.equal(movementFrame(2), 3);
  const baseline = { gamma: 0, roll: 0, progress: 0.5 };
  assert.equal(tiltProgress(0, 0, baseline), 0.5);
  assert.equal(tiltProgress(0.004, 0, baseline), 0.5);
  assert.ok(tiltProgress(0.3, 0, baseline) > 0.5);
  assert.ok(tiltProgress(-0.3, 0, baseline) < 0.5);
  assert.ok(tiltProgress(0, 0.3, baseline) > 0.5);
  assert.equal(tiltProgress(NaN, 0, baseline), 0.5);
  assert.equal(tiltProgress(NaN, 0, { ...baseline, progress: NaN }), 0.5);
  assert.ok(
    Math.abs(tiltProgress(-Math.PI + 0.01, 0, { ...baseline, gamma: Math.PI - 0.01 }) - 0.5) < 0.06,
  );
});

test('a dropped left edge is a left lean on CoreMotion gravity', () => {
  assert.ok(portraitTiltRoll(2, -9.8) < 0);
  assert.ok(portraitTiltRoll(-2, -9.8) > 0);
  assert.equal(portraitTiltRoll(0, -9.8), 0);
  assert.ok(Number.isNaN(portraitTiltRoll(Number.NaN, -9.8)));
  assert.match(readFileSync('mobile/src/useMovementTilt.ts', 'utf8'), /portraitTiltRoll\(gravity\.x, gravity\.y\)/);
});

test('small tilts produce a normalized speed signal and the locked axis avoids cross-axis jumps', () => {
  const baseline = { gamma: 0, roll: 0, progress: 0.5, axis: 'roll' as const };
  const eightDegrees = (8.5 * Math.PI) / 180;
  assert.equal(tiltProgress(0, eightDegrees, baseline), 1);
  assert.equal(tiltProgress(0, -eightDegrees, baseline), 0);
  assert.equal(tiltProgress(1, 0, baseline), 0.5);
  assert.ok(tiltProgress(0, 0.04, baseline) > 0.6);
});

test('sensor smoothing is monotonic, bounded and independent of sampling rate', () => {
  let fast = 0.5,
    slow = 0.5;
  for (let i = 0; i < 10; i++) fast = smoothMovement(fast, 1, 16);
  for (let i = 0; i < 5; i++) slow = smoothMovement(slow, 1, 32);
  assert.ok(Math.abs(fast - slow) < 0.00001);
  assert.ok(fast > 0.5 && fast < 1);
  assert.equal(smoothMovement(0.5, 1, 0), 0.5);
  assert.equal(smoothMovement(0.5, 1, NaN), 0.5);
  assert.ok(Number.isFinite(smoothMovement(NaN, NaN, 16)));
});

test('generated movement crops stay inside the atlas', () => {
  for (const gender of ['male', 'female'] as const) {
    for (const row of [-1, 0, 1, 2, 3, 4, 5, 6, NaN]) {
      for (const progress of [-1, 0, 0.33, 0.66, 1, 2, NaN]) {
        const crop = movementCrop(row, progress, gender);
        assert.ok(crop.x >= 0 && crop.x + crop.width <= 1024);
        assert.ok(crop.y >= 0 && crop.y + crop.height <= 1536);
      }
    }
  }
  assert.notEqual(movementCrop(0, 0, 'female').x, 0);
  assert.notEqual(movementCrop(4, 1 / 3, 'female').x, 256);
});

test('detail sheets keep back and close navigation', () => {
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.doesNotMatch(app, /!isFitnessVisualFlow\(selectedFlow.id\)/);
  assert.match(app, /navigation=\{selectedFlow \? 'back' : 'close'\}/);
  const sheet = readFileSync('mobile/src/design/components.shared.tsx', 'utf8');
  assert.match(sheet, /label="Go back"/);
  assert.match(sheet.replaceAll(/\s/g, ''), /navigation==='back'/);
  assert.match(sheet.replaceAll(/\s/g, ''), /navigation==='close'/);
});

test('edge glow has a neutral deadband, clear direction, and bounded strength', () => {
  assert.deepEqual(movementGlow(0, true), { left: 0, right: 0 });
  assert.deepEqual(movementGlow(0.02, true), { left: 0, right: 0 });
  assert.deepEqual(movementGlow(-1, true), { left: 1, right: 0 });
  assert.deepEqual(movementGlow(1, true), { left: 0, right: 1 });
  assert.deepEqual(movementGlow(1, false), { left: 0, right: 0 });
  assert.deepEqual(movementGlow(NaN, true), { left: 0, right: 0 });
  assert.deepEqual(movementGlow(4, true), { left: 0, right: 1 });
  assert.ok(movementGlow(0.08, true).right > 0.25, 'Small deliberate tilt is visible');
  assert.ok(movementGlow(0.6, true).right > movementGlow(0.2, true).right);
});

test('pose hysteresis holds through repeated tremor around every boundary', () => {
  for (let current = 0; current < 3; current++) {
    const boundary = (current + 0.5) / 3;
    for (let sample = 0; sample < 1000; sample++) {
      const jitter = Math.sin(sample) * 0.045;
      assert.equal(heldMovementFrame(current, boundary + jitter), current);
      assert.equal(heldMovementFrame(current + 1, boundary + jitter), current + 1);
    }
  }
  assert.equal(heldMovementFrame(1, 0.64), 2);
  assert.equal(heldMovementFrame(2, 0.36), 1);
  assert.equal(heldMovementFrame(0, 1), 1);
  assert.equal(heldMovementFrame(3, 0), 2);
});

test('playback integrator cannot teleport or wrap and a zero speed is stationary', () => {
  assert.ok(advanceMovement(0, 1, 16) < 0.014);
  assert.ok(advanceMovement(1, -1, 16) > 0.986);
  for (const current of [0, 0.33, 0.67, 1]) {
    assert.equal(advanceMovement(current, 0, 16), current);
    assert.equal(advanceMovement(current, 0.19, 16), current);
    assert.equal(advanceMovement(current, NaN, 16), current);
    assert.equal(advanceMovement(current, 1, 1000), current);
  }
  assert.equal(advanceMovement(1, 1, 16), 1);
  assert.equal(advanceMovement(0, -1, 16), 0);
  let fast = 0,
    slow = 0;
  for (let t = 0; t < 500; t += 16) {
    fast = advanceMovement(fast, 1, 16);
    slow = advanceMovement(slow, 0.4, 16);
  }
  assert.ok(fast < 0.43, 'Half a second cannot traverse the sequence');
  assert.ok(slow < fast / 2, 'Gentle tilt advances more slowly');
});

test('a right tilt plays every pose through to the endpoint after returning to neutral', () => {
  let intent: TiltPlaybackIntent = { direction: 0, candidate: 0, since: 0 };
  let progress = 0,
    frame = 0;
  const visited = [frame];
  for (let now = 0; now < 4200; now += 16) {
    intent = tiltPlaybackIntent(intent, now < 240 ? 0.6 : 0, now);
    progress = advanceMovement(progress, intent.direction, 16);
    const next = heldMovementFrame(frame, progress);
    if (next !== frame) visited.push(next);
    frame = next;
  }
  assert.equal(progress, 1);
  assert.deepEqual(visited, [0, 1, 2, 3]);
  assert.equal(intent.direction, 1);
});

test('left tilt reverses playback and neutral does not leave a middle resting point', () => {
  let intent: TiltPlaybackIntent = { direction: 1, candidate: 0, since: 0 };
  let progress = 0.7,
    frame = 2;
  const visited = [frame];
  for (let now = 0; now < 4200; now += 16) {
    intent = tiltPlaybackIntent(intent, now < 240 ? -0.6 : 0, now);
    progress = advanceMovement(progress, intent.direction, 16);
    const next = heldMovementFrame(frame, progress);
    if (next !== frame) visited.push(next);
    frame = next;
  }
  assert.equal(progress, 0);
  assert.deepEqual(visited, [2, 1, 0]);
  assert.equal(intent.direction, -1);
});

test('short opposite spikes and neutral jitter do not reverse latched playback', () => {
  let intent: TiltPlaybackIntent = { direction: 1, candidate: 0, since: 0 };
  intent = tiltPlaybackIntent(intent, -0.8, 100);
  intent = tiltPlaybackIntent(intent, -0.8, 200);
  assert.equal(intent.direction, 1);
  intent = tiltPlaybackIntent(intent, 0, 210);
  for (let now = 220; now < 2000; now += 16)
    intent = tiltPlaybackIntent(intent, Math.sin(now) * 0.2, now);
  assert.equal(intent.direction, 1);
  assert.equal(tiltPlaybackIntent(intent, NaN, 2000).direction, 1);
});

test('sudden reversal still visits each intervening pose in order', () => {
  for (const direction of [1, -1]) {
    let progress = direction === 1 ? 0 : 1;
    let frame = direction === 1 ? 0 : 3;
    const visited = [frame];
    for (let elapsed = 0; elapsed < 4200; elapsed += 16) {
      progress = advanceMovement(progress, direction, 16);
      const next = heldMovementFrame(frame, progress);
      if (next !== frame) visited.push(next);
      assert.ok(Math.abs(next - frame) <= 1);
      frame = next;
    }
    assert.deepEqual(visited, direction === 1 ? [0, 1, 2, 3] : [3, 2, 1, 0]);
  }
  const hook = readFileSync('mobile/src/useMovementTilt.ts', 'utf8');
  const calibrate = hook.split('calibrate: () => {')[1].split('scrub:')[0];
  assert.doesNotMatch(calibrate, /latest.current.change|latest.current.progress =/);
});
