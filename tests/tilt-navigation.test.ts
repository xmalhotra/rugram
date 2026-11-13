import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initialTiltState, tiltNavigation } from '../shared/tilt-navigation';

test('tilt navigation rejects jitter, invalid samples and gaps', () => {
  let state = initialTiltState();
  for (let now = 0; now <= 2000; now += 100) {
    const result = tiltNavigation(state, 0.05, now);
    assert.equal(result.step, 0);
    state = result.state;
  }
  assert.equal(tiltNavigation(state, 5, 3000).step, 0, 'No jump after backgrounding');
  assert.equal(tiltNavigation(state, NaN, 2100).step, 0);
  assert.equal(tiltNavigation(state, 1, Infinity).step, 0);
  assert.equal(tiltNavigation(state, 1, 1900).step, 0);
});

test('deliberate opposite rolls navigate in opposite directions with a cooldown', () => {
  let state = initialTiltState();
  const steps: number[] = [];
  for (let now = 0; now <= 1300; now += 100) {
    const result = tiltNavigation(state, -1, now);
    state = result.state;
    if (result.step) steps.push(now);
  }
  assert.deepEqual(steps, [300, 1300]);
  state = initialTiltState();
  for (const now of [0, 100, 200]) state = tiltNavigation(state, 1, now).state;
  assert.equal(tiltNavigation(state, 1, 300).step, -1);
});

test('slider and tilt are optional guide-only controls with lifecycle and permission guards', () => {
  const controls = readFileSync('mobile/src/GuideNavigation.tsx', 'utf8');
  assert.match(controls, /useState\(false\)/);
  for (const token of [
    'Gyroscope.isAvailableAsync',
    'Gyroscope.getPermissionsAsync',
    'Gyroscope.requestPermissionsAsync',
    'isReduceMotionEnabled',
    'useFocusEffect',
    'AppState.addEventListener',
    'listener.remove',
    'onSlidingStart',
    'onValueChange={onChange}',
  ])
    assert.ok(controls.replaceAll(/\s/g, '').includes(token.replaceAll(/\s/g, '')), token);
  assert.doesNotMatch(controls, /fetch\(|api\(|JSON\.stringify|SecureStore/);
  assert.match(
    readFileSync('mobile/src/WorkoutGuideDetails.tsx', 'utf8'),
    /resolveVisualFlow\(flow, library\)/,
  );
  const deck = readFileSync('mobile/src/SwipeDeck.tsx', 'utf8');
  assert.match(deck, /controls\?\./);
  assert.match(deck, /Drag the slider to explore/);
  const animal = readFileSync('shared/animal-movements.ts', 'utf8');
  assert.doesNotMatch(animal, /memory cards/i);
  const app = JSON.parse(readFileSync('mobile/app.json', 'utf8'));
  assert.ok(
    app.expo.plugins.some(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-sensors',
    ),
  );
});
