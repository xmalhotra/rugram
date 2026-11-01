import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { popularWorkoutFlows } from '../shared/workout-guides';
import { flows } from '../shared/mobile';
import { flowsForFocus } from '../shared/focus';
import { flowContentSchema } from '../src/lib/content-validation';

test('source-linked legacy guides remain in the library while Workout discovery is curated', () => {
  const discovered = flowsForFocus(flows, 'workout');
  assert.equal(popularWorkoutFlows.length, 4);
  assert.equal(new Set(flows.map(flow => flow.id)).size, flows.length);
  for (const flow of popularWorkoutFlows) {
    assert.ok(flows.some(item => item.id === flow.id));
    assert.equal(
      discovered.some(item => item.id === flow.id),
      flow.id === 'workout-cindy',
    );
    assert.ok(flow.sources?.length);
    assert.ok(flow.sources.every(source => new URL(source.url).protocol === 'https:'));
    assert.equal(
      new Set(flow.sessionGuide.cards.map(card => card.id)).size,
      flow.sessionGuide.cards.length,
    );
    assert.ok(flow.sessionGuide.cards.every(card => card.body.length < 330));
    assert.ok(flow.sessionGuide.cards.some(card => card.id === 'scale'));
    assert.match(flow.guidance!, /not a personal prescription/);
  }
});

test('Cindy distinguishes the original and beginner format from celebrity attribution', () => {
  const cindy = popularWorkoutFlows.find(flow => flow.id === 'workout-cindy')!;
  assert.equal(cindy.sessionGuide.format, '20-minute AMRAP');
  assert.equal(cindy.sessionGuide.cards[0].metric, '5 pull-ups · 10 push-ups · 15 squats');
  assert.match(
    cindy.sessionGuide.cards.find(card => card.id === 'scale')!.body,
    /3 ring rows, 6 assisted push-ups and 9 squats/,
  );
  assert.match(cindy.sessionGuide.attribution!.label, /not his invention or an endorsement/);
});

test('administrators can round-trip and validate all workout guide details', () => {
  for (const flow of popularWorkoutFlows) {
    const result = flowContentSchema.safeParse(flow);
    assert.ok(result.success, JSON.stringify(result.error));
    assert.deepEqual(result.data.sessionGuide, flow.sessionGuide);
  }
  const guide = structuredClone(popularWorkoutFlows[0]);
  guide.sessionGuide.cards.push(guide.sessionGuide.cards[0]);
  assert.equal(flowContentSchema.safeParse(guide).success, false);
  const unsafe = structuredClone(popularWorkoutFlows[0]);
  unsafe.sessionGuide.attribution!.url = 'http://unsafe.example';
  assert.equal(flowContentSchema.safeParse(unsafe).success, false);
});

test('12-3-30 preserves units and research format is not labelled a live trend', () => {
  const walk = popularWorkoutFlows.find(flow => flow.id === 'workout-12-3-30')!;
  assert.match(walk.sessionGuide.cards[0].metric, /4.8 km\/h/);
  assert.match(walk.sessionGuide.cards[0].body, /not 3 km\/h/);
  const interval = popularWorkoutFlows.find(flow => flow.id === 'workout-norwegian-4x4')!;
  assert.equal(interval.sessionGuide.label, 'Research-led format');
});

test('workout compatibility entry point also uses cards with frames and information-only guide text', () => {
  const detail = readFileSync('mobile/src/WorkoutGuideDetails.tsx', 'utf8');
  assert.match(detail, /resolveVisualFlow\(flow, library\)/);
  assert.match(detail, /AnimalMovementDeck/);
  assert.match(detail, /VisualFlowInformation/);
  assert.match(detail, /flow.sources\?\.map/);
  assert.doesNotMatch(detail, /SwipeDeck|DeckPage|FlowHomeAction/);
  assert.doesNotMatch(detail, /HabitToggle|onComplete/);
});
