import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  trainingSupplementFlows,
  trainingSupplementFlowIds,
  trainingSupplementMedia,
  trainingSupplementTopicFlows,
  trainingSupplementTopics,
  trainingSupplementWorkouts,
} from '../shared/training-supplements';
import { flows, type MobilePayload } from '../shared/mobile';
import { focusOptions, flowsForFocus } from '../shared/focus';
import { flowCategoryGroups, defaultFlowCategoryGroups } from '../shared/flow-categories';
import { movementBrowseLibrary } from '../shared/animal-movements';
import {
  fitnessMedia,
  fitnessCollectionChildren,
  isFitnessVisualFlow,
} from '../shared/fitness-guides';
import { fitnessAtlasLayouts, fitnessCrop } from '../shared/fitness-media-layout';
import { movementImageFit } from '../shared/movement-viewer';
import { buildStoryGroups } from '../shared/home-feed';
import { flowContentSchema } from '../src/lib/content-validation';

test('Supplements is a Lifestyle section with four workout contexts, not an automatic personal stack', () => {
  assert.deepEqual(
    flowsForFocus(flows, 'supplements').map(flow => flow.title),
    ['Getting started', 'Strength & muscle', 'Running & endurance', 'HYROX & hybrid'],
  );
  assert.ok(
    flowCategoryGroups(focusOptions)
      .find(group => group.id === 'lifestyle')!
      .focusIds.includes('supplements'),
  );
  const browse = movementBrowseLibrary(flows);
  for (const flow of trainingSupplementFlows) {
    assert.ok(browse.some(item => item.id === flow.id));
    assert.ok(isFitnessVisualFlow(flow.id));
    assert.deepEqual(fitnessCollectionChildren[flow.id], flow.relatedFlowIds);
    assert.equal(flow.sessionGuide!.label, 'No supplement is automatically required');
  }
  for (const flow of trainingSupplementTopicFlows)
    assert.ok(!browse.some(item => item.id === flow.id));
  const stale = [{ id: 'supplements', flowIds: ['fitness-gym-equipment'] }];
  assert.deepEqual(
    flowsForFocus(flows, 'supplements', stale).map(flow => flow.id),
    trainingSupplementFlowIds,
  );
});

test('older Lifestyle settings gain Supplements unless an editor explicitly assigned it elsewhere', () => {
  const old = defaultFlowCategoryGroups.map(group =>
    group.id === 'lifestyle' ? { ...group, focusIds: ['morning-drinks', 'nutrition', 'sleep'] } : group,
  );
  assert.deepEqual(
    flowCategoryGroups(focusOptions, old).find(group => group.id === 'lifestyle')!.focusIds,
    ['morning-drinks', 'nutrition', 'sleep', 'supplements'],
  );
  const assigned = [
    ...old,
    { id: 'custom', title: 'Learning', illustration: 'focus', focusIds: ['supplements'] },
  ];
  const groups = flowCategoryGroups(focusOptions, assigned);
  assert.ok(!groups.find(group => group.id === 'lifestyle')!.focusIds.includes('supplements'));
  assert.deepEqual(groups.find(group => group.id === 'custom')!.focusIds, ['supplements']);
});

test('training context changes the relevant topics without prescribing quantities or assuming a deficiency', () => {
  const map = new Map(
    trainingSupplementWorkouts.map(workout => [workout.id, [...workout.topicIds] as string[]]),
  );
  assert.ok(!map.get('starting')!.includes('creatine'));
  assert.ok(!map.get('running')!.includes('creatine'));
  assert.ok(map.get('strength')!.includes('creatine'));
  assert.ok(map.get('running')!.includes('carbohydrate'));
  assert.ok(map.get('hyrox')!.includes('carbohydrate'));
  for (const topics of map.values()) {
    assert.equal(topics[0], 'food');
    assert.equal(topics.at(-1), 'quality');
    assert.ok(topics.includes('clinical'));
  }
  const all = [...trainingSupplementFlows, ...trainingSupplementTopicFlows];
  for (const flow of all) {
    const result = flowContentSchema.safeParse(flow);
    assert.ok(result.success, `${flow.id}: ${JSON.stringify(result.error)}`);
    assert.match(flow.guidance!, /not a prescription, diagnosis or personalised supplement stack/);
    assert.match(flow.guidance!, /appearance control changes images only/);
    assert.ok(flow.sources?.every(source => source.url.startsWith('https://')));
    assert.ok(!flow.steps.some(step => step.pickContext));
    assert.ok(flow.sessionGuide!.cards.every(card => card.body.length < 330));
    assert.doesNotMatch(JSON.stringify(flow), /\b\d+\s*(mg|g|IU|mcg)\b|\bmg\/kg\b/);
  }
});

test('critical evidence boundaries are explicit on decision cards and information notes', () => {
  const byId = new Map(trainingSupplementTopics.map(topic => [topic.id, topic]));
  assert.match(byId.get('food')!.status, /No supplement may be needed/);
  assert.match(byId.get('protein')!.summary, /powder is optional/);
  assert.match(byId.get('creatine')!.consider, /does not.*prove a benefit.*HYROX/);
  assert.match(byId.get('caffeine')!.caution, /Avoid stacking stimulants/);
  assert.match(byId.get('hydration')!.caution, /Do not force fluids or add salt/);
  assert.match(byId.get('clinical')!.caution, /Do not self-start iron or high-dose vitamin D/);
  assert.match(byId.get('quality')!.caution, /cannot prove zero risk/);
  assert.match(byId.get('carbohydrate')!.caution, /different jobs/);
});

test('the eight topics each have five in-bounds frames for both global appearance choices', () => {
  assert.equal(trainingSupplementTopicFlows.length, 8);
  for (const [row, flow] of trainingSupplementTopicFlows.entries()) {
    assert.deepEqual(trainingSupplementMedia[flow.id], { atlas: 'supplements', row });
    assert.deepEqual(fitnessMedia[flow.id], trainingSupplementMedia[flow.id]);
    for (const gender of ['male', 'female'] as const) {
      const atlas = fitnessAtlasLayouts.supplements[gender];
      assert.equal(atlas.columns, 5);
      for (let phase = 0; phase < 5; phase++) {
        const crop = fitnessCrop(fitnessMedia[flow.id], gender, phase / 4);
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.width <= atlas.width && crop.y + crop.height <= atlas.height);
        const fit = movementImageFit(crop, 360, 500);
        assert.equal(fit.width, 360);
        assert.equal(fit.height, 360);
      }
    }
  }
});

test('the supplement caption stays outside the pager', () => {
  const deck = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  assert.ok(deck.indexOf('movements[current].description') < deck.indexOf('<ScrollView'));
  assert.match(deck, /minHeight: 54/);
});

test('saved supplement guides do not promote their internal pages or products as a shopping stack', () => {
  for (const flow of trainingSupplementFlows) {
    const data = {
      flows,
      profile: {
        flowIds: [flow.id],
        savedProductIds: [],
        completed: [],
        eventIds: [],
        city: 'Hyderabad',
      },
      products: [],
      events: [],
      flowResources: { products: [], events: [] },
    } as unknown as MobilePayload;
    assert.deepEqual(buildStoryGroups(data), []);
  }
});
