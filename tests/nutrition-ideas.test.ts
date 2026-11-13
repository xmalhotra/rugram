import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flows } from '../shared/mobile';
import { focusOptions, flowsForFocus } from '../shared/focus';
import { buildFlowSections, defaultNutritionPaths } from '../shared/flow-sections';
import { resolveVisualFlow, visualFlowCards } from '../shared/visual-flows';
import { findFlowCard, resolvePersonalFlow } from '../shared/personal-flows';
import {
  nutritionCollectionIds,
  nutritionCollectionSpecs,
  nutritionCollections,
  nutritionIdeaCards,
  nutritionIdeas,
} from '../shared/nutrition-ideas';
import {
  fitnessCrop,
  fitnessFrameCount,
  fitnessAtlasLayouts,
} from '../shared/fitness-media-layout';
import { flowContentSchema } from '../src/lib/content-validation';

test('Nutrition browse contains one holistic flow per topic, not individual recipes or sport branches', () => {
  const options = focusOptions.map(item => ({ ...item, flowIds: [...item.flowIds] }));
  const visible = flowsForFocus(flows, 'nutrition', options);
  assert.deepEqual(
    visible.map(flow => flow.id),
    nutritionCollectionIds,
  );
  const sections = buildFlowSections(
    options.filter(item => item.id === 'nutrition'),
    options,
    flows,
  );
  assert.equal(sections.length, 5);
  for (const section of sections) {
    assert.equal(section.groups.length, 1);
    assert.equal(section.groups[0].flows.length, 1);
    assert.equal(section.groups[0].title, undefined);
  }
  const paths = defaultNutritionPaths(flows);
  assert.ok(paths.every(path => path.options.length === 1));
  assert.deepEqual(
    paths.flatMap(path => path.options.flatMap(option => option.flowIds)),
    nutritionCollectionIds,
  );
  const stale = options.map(item =>
    item.id === 'nutrition'
      ? { ...item, flowIds: ['nutrition-pre-running', 'recipe-chickpea-bowl'] }
      : item,
  );
  assert.deepEqual(
    flowsForFocus(flows, 'nutrition', stale).map(flow => flow.id),
    nutritionCollectionIds,
  );
});

test('each card is one named food or drink with five relevant frames and benefits, never generic filler', () => {
  assert.equal(nutritionIdeas.length, 12);
  for (const spec of nutritionCollectionSpecs) {
    const source = flows.find(flow => flow.id === spec.id)!;
    const before = JSON.stringify(source);
    const result = resolveVisualFlow(source, flows);
    assert.deepEqual(
      result.cards.map(card => card.id),
      spec.items.map(key => `nutrition-item-${key}`),
    );
    assert.equal(result.adapted, false);
    for (const card of result.cards) {
      const idea = nutritionIdeas.find(item => item.id === card.id)!;
      assert.equal(card.title, idea.title);
      assert.equal(card.recipe, undefined);
      assert.doesNotMatch(card.title, /choose your next step|keep a note|recipe|bowl/i);
      assert.equal(card.visualCard?.sourceFlowId, source.id);
      assert.deepEqual(card.visualCard?.frames, idea.frames);
      assert.equal(new Set(idea.frames).size, 5);
      assert.ok(card.visualCard!.benefits.length >= 2);
      assert.ok(card.visualCard!.media.atlas.startsWith('nutrition-'));
      assert.deepEqual(card.visualCard!.sourceStepIds, ['use']);
      assert.ok(card.sources!.every(source => source.url.startsWith('https://')));
      assert.ok(findFlowCard(flows, source.id, card.id));
    }
    assert.equal(JSON.stringify(source), before);
  }
});

test('all new cards and collections remain valid publishable content with stable completion identifiers', () => {
  for (const flow of [...nutritionCollections, ...nutritionIdeaCards]) {
    assert.doesNotThrow(() => flowContentSchema.parse(flow), flow.id);
    assert.deepEqual(
      flow.steps.map(step => step.id),
      ['choose', 'use', 'review'],
    );
    assert.match(flow.guidance!, /not a personalised diet/i);
  }
  assert.match(
    nutritionCollections.find(flow => flow.id === 'nutrition-intra-ideas')!.description,
    /Short, easy sessions do not automatically need/,
  );
  assert.match(
    nutritionCollections.find(flow => flow.id === 'nutrition-post-ideas')!.description,
    /components and alternatives/,
  );
  assert.match(nutritionIdeas.find(idea => idea.key === 'electrolytes')!.caution, /carbohydrate/i);
});

test('nutrition cards keep five isolated crops inside each atlas row', () => {
  for (const idea of nutritionIdeas) {
    for (const gender of ['male', 'female'] as const) {
      const media = { atlas: idea.atlas, row: idea.row };
      const layout = fitnessAtlasLayouts[idea.atlas][gender];
      assert.equal(fitnessFrameCount(media, gender), 5);
      for (let frame = 0; frame < 5; frame++) {
        const crop = fitnessCrop(media, gender, frame / 4);
        const edges = layout.columnEdges[idea.row];
        assert.ok(crop.x >= edges[frame] + 5);
        assert.ok(crop.x + crop.width <= edges[frame + 1] - 5);
        assert.ok(crop.y >= layout.rows[idea.row] + 5);
        assert.ok(crop.y + crop.height <= layout.rows[idea.row + 1] - 5);
      }
    }
  }
});

test('old saved protein restrictions remain respected, and archived cards are not resurrected', () => {
  const source = flows.find(flow => flow.id === 'nutrition-protein-plant')!;
  const cards = resolveVisualFlow(source, flows).cards;
  assert.deepEqual(
    cards.map(card => card.id),
    ['nutrition-item-dal', 'nutrition-item-tofu'],
  );
  const pre = flows.find(flow => flow.id === 'nutrition-pre-ideas')!;
  const reduced = flows.filter(flow => flow.id !== 'nutrition-item-banana');
  assert.ok(
    !resolveVisualFlow(pre, reduced).cards.some(card => card.id === 'nutrition-item-banana'),
  );
});

test('existing private Nutrition saves retain the exact old card, while new saves use food IDs', () => {
  const source = flows.find(flow => flow.id === 'nutrition-pre-running')!;
  const old = visualFlowCards(source)[0];
  const personal = {
    id: 'personal-nutrition',
    name: 'Before training',
    createdAt: '2026-10-24T00:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z',
    cards: [{ sourceFlowId: source.id, cardId: old.id, title: old.title }],
  };
  const resolved = resolvePersonalFlow(personal, flows);
  assert.equal(resolved.missing.length, 0);
  assert.equal(resolved.cards[0].id, old.id);
  assert.deepEqual(resolved.cards[0].visualCard, old.visualCard);
  assert.ok(resolveVisualFlow(source, flows).cards.every(card => !card.id.includes(':visual:')));
  assert.equal(findFlowCard(flows, 'missing', old.id), undefined);
});

test('Nutrition details put benefits in the shared information sheet and food-specific context behind its disclosure', () => {
  for (const file of ['FlowDetails', 'PersonalFlowDetails']) {
    const code = readFileSync(`mobile/src/${file}.tsx`, 'utf8');
    assert.match(code, /<VisualFlowInformation/);
    assert.match(code, /<NutritionIdeaNotes/);
  }
  const notes = readFileSync('mobile/src/NutritionIdeaNotes.tsx', 'utf8');
  assert.doesNotMatch(notes, /Ingredients|method\.map|recipe\.method/);
  assert.match(notes, /When it may fit/);
});
