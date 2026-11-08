import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  animalIllustrations,
  animalMovementCategory,
  animalMovementFlows,
} from '../shared/animal-movements';
import { flows } from '../shared/mobile';
import { flowsForFocus } from '../shared/focus';
import { flowContentSchema } from '../src/lib/content-validation';

test('ten source-linked animal movements remain available inside the single Workout collection', () => {
  const discovered = flowsForFocus(flows, 'workout');
  assert.deepEqual(
    animalMovementFlows.map(flow => flow.title),
    [
      'Bear crawl',
      'Crab walk',
      'Lateral ape',
      'Frog travel',
      'Inchworm walkout',
      'Bird dog',
      'Lateral bear crawl',
      'Crab toe-touch',
      'Controlled sit-through',
      'Duck walk',
    ],
  );
  assert.equal(new Set(flows.map(flow => flow.id)).size, flows.length);
  for (const flow of animalMovementFlows) {
    assert.ok(flows.some(item => item.id === flow.id));
    assert.ok(!discovered.some(item => item.id === flow.id));
    assert.equal(flow.sessionGuide.collection, animalMovementCategory);
    assert.equal(flow.pathId, 'workout');
    assert.ok(flow.sources?.length);
    assert.ok(flow.sources.every(source => new URL(source.url).protocol === 'https:'));
    assert.match(flow.guidance!, /No universal checklist/);
    assert.match(flow.guidance!, /recovery/);
    assert.match(flow.guidance!, /No compulsory repetitions/);
    assert.equal(flow.workout, undefined, 'No prescribed set-tracking workout is added');
  }
});

test('each memory deck covers setup, movement, easier variation and warning signs', () => {
  for (const flow of animalMovementFlows) {
    assert.deepEqual(
      flow.sessionGuide.cards.map(card => card.id),
      ['setup', 'move', 'scale', 'watch'],
    );
    for (const card of flow.sessionGuide.cards) {
      assert.ok(card.body.length > 35 && card.body.length < 330);
      assert.ok(
        animalIllustrations.includes(card.illustration as (typeof animalIllustrations)[number]),
      );
    }
    assert.match(flow.sessionGuide.reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('animal memory cards and collection survive admin validation and editing', () => {
  for (const flow of animalMovementFlows) {
    const parsed = flowContentSchema.safeParse(flow);
    assert.ok(parsed.success, JSON.stringify(parsed.error));
    assert.deepEqual(parsed.data.sessionGuide, flow.sessionGuide);
    const edited = {
      ...flow,
      sessionGuide: { ...flow.sessionGuide, collection: 'Ground movement' },
    };
    assert.equal(flowContentSchema.parse(edited).sessionGuide?.collection, 'Ground movement');
  }
  const invalid = structuredClone(animalMovementFlows[0]);
  invalid.sessionGuide.cards.push(invalid.sessionGuide.cards[0]);
  assert.equal(flowContentSchema.safeParse(invalid).success, false);
});

test('Workout exposes the grouped movement flow without redundant collection navigation', () => {
  const catalog = readFileSync('mobile/src/FlowCatalogHome.tsx', 'utf8');
  assert.doesNotMatch(catalog, /Workout collections|activeCollection/);
  assert.match(readFileSync('shared/animal-movements.ts', 'utf8'), /export function movementBrowseLibrary/);
  const illustration = readFileSync('mobile/src/WorkoutGuideIllustration.tsx', 'utf8');
  for (const icon of animalIllustrations) assert.ok(illustration.includes(`'${icon}'`));
  assert.match(illustration, /Position sketch/);
  const editor = readFileSync('mobile/src/ContentFields.tsx', 'utf8');
  assert.match(editor, /animalIllustrations/);
  assert.match(editor, /key==='cards'&&path\.startsWith\('sessionGuide'\)/);
});
