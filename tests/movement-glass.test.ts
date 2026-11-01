import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { movementGlass } from '../shared/movement-glass';

test('tilt bolds the border on that side and leaves neutral even', () => {
  assert.equal(movementGlass(0).left, 0);
  assert.equal(movementGlass(0).right, 0);
  assert.equal(movementGlass(0).leftBorder, movementGlass(0).rightBorder);
  assert.ok(movementGlass(-1).leftBorder > movementGlass(-1).rightBorder);
  assert.ok(movementGlass(1).rightBorder > movementGlass(1).leftBorder);
  assert.equal(movementGlass(0.4).left, 0);
  assert.ok(movementGlass(1).rightBorder - movementGlass(0.5).rightBorder >= 1);
  assert.ok(movementGlass(0.4).rightBorder > movementGlass(0).rightBorder);
  assert.equal(movementGlass(-0.4).right, 0);
  assert.ok(movementGlass(-0.4).leftBorder > movementGlass(0).leftBorder);
  assert.deepEqual(movementGlass(NaN), movementGlass(0));
  for (const lean of [-99, -1, 0, 1, 99, NaN, Infinity]) {
    const finish = movementGlass(lean);
    assert.ok(finish.leftBorder >= 1.25 && finish.leftBorder <= 3.75);
    assert.ok(finish.rightBorder >= 1.25 && finish.rightBorder <= 3.75);
    assert.ok(finish.left >= 0 && finish.left <= 1 && finish.right >= 0 && finish.right <= 1);
  }
});

test('glass renderer lights the screen edge instead of the picture frame', () => {
  const source = readFileSync('mobile/src/MovementGlass.tsx', 'utf8');
  assert.match(source, /memo\(function MovementGlass/);
  assert.match(source, /gradientUnits="userSpaceOnUse"/);
  assert.match(source, /y1="0"/);
  assert.match(source, /y2="0"/);
  assert.match(source, /pointerEvents="none"/);
  assert.match(source, /position: 'absolute', top: 0, right: 0, bottom: 0, left: 0/);
  assert.doesNotMatch(source, /rx=|strokeWidth|Mask|tiltBorder|RadialGradient|BlurView|shadowRadius|C\.lime/);
});
