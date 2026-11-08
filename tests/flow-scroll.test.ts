import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { topicAtOffset } from '../shared/flow-scroll';
import { advanceMovement, tiltPlaybackIntent } from '../shared/movement-viewer';

test('section tracking follows the content below a pinned header in both directions', () => {
  const sections = [
    { id: 'workout', y: 120 },
    { id: 'running', y: 900 },
    { id: 'hyrox', y: 1300 },
  ];
  assert.equal(topicAtOffset(sections, 0, 120), 'workout');
  assert.equal(topicAtOffset(sections, 780, 120), 'running');
  assert.equal(topicAtOffset(sections, 1200, 120), 'hyrox');
  assert.equal(topicAtOffset(sections, 400, 120), 'workout');
  assert.equal(topicAtOffset([], 0, 120), undefined);
  assert.equal(topicAtOffset(sections, NaN, 120), 'workout');
});

test('all Flow categories keep sections present and scroll the topic rail instead of filtering', () => {
  const source = readFileSync('mobile/src/FlowSections.tsx', 'utf8');
  assert.match(source, /stickyHeaderIndices=\{\[0\]\}/);
  assert.match(source, /topicAtOffset/);
  assert.match(source, /scroll.current\?\.scrollTo/);
  assert.match(source, /sections.map/);
  assert.doesNotMatch(source, /sections.filter\(.*selected/);
  assert.match(source, /buildFlowSections/);
  assert.match(readFileSync('shared/flow-sections.ts', 'utf8'), /seen.has\(id\)/);
});

test('a completed tilt gesture finishes playback without any further sensor samples', () => {
  let intent = tiltPlaybackIntent({ direction: 0, candidate: 0, since: 0 }, 0.7, 0);
  intent = tiltPlaybackIntent(intent, 0.7, 160);
  let progress = 0;
  for (let frame = 0; frame < 85; frame++)
    progress = advanceMovement(progress, intent.direction, 16);
  assert.equal(progress, 1);
  intent = tiltPlaybackIntent(intent, -0.7, 2000);
  intent = tiltPlaybackIntent(intent, -0.7, 2160);
  for (let frame = 0; frame < 85; frame++)
    progress = advanceMovement(progress, intent.direction, 16);
  assert.equal(progress, 0);
  const hook = readFileSync('mobile/src/useMovementTilt.ts', 'utf8');
  assert.match(hook, /requestAnimationFrame\(tick\)/);
  assert.match(hook, /cancelAnimationFrame\(animationFrame\)/);
});

test('swipe pages use measured dimensions and mount only the active neighbours', () => {
  const source = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  assert.match(source, /setHeight\(event.nativeEvent.layout.height\)/);
  assert.match(source, /Math.abs\(page - current\) <= 1/);
  assert.doesNotMatch(source, /height: '100%'/);
});
