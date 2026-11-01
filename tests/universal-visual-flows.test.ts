import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { flows, type HabitFlow } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import { fitnessMedia } from '../shared/fitness-guides';
import { fitnessAtlasLayouts, fitnessCrop } from '../shared/fitness-media-layout';
import { movementImageFit } from '../shared/movement-viewer';
import { imageSize } from '../scripts/image-size';
import { techResource } from '../shared/tech-resources';

test('every stored flow, including old saves, resolves to cards with at least five bundled frames', () => {
  assert.ok(flows.length >= 127);
  for (const flow of flows) {
    const result = resolveVisualFlow(flow, flows);
    assert.ok(result.cards.length, flow.id);
    assert.equal(result.flow.id, flow.id);
    assert.deepEqual(
      result.flow.relatedFlowIds,
      result.cards.map(card => card.id),
    );
    for (const card of result.cards) {
      assert.ok(card.sessionGuide, card.id);
      const media = card.visualCard?.media ?? fitnessMedia[card.id];
      assert.ok(media, card.id);
      for (const gender of ['male', 'female'] as const) {
        const atlas = fitnessAtlasLayouts[media.atlas][gender];
        assert.ok(atlas.columns >= 5, card.id);
        assert.ok(media.row >= 0 && media.row < atlas.rows.length - 1);
        const folder = media.atlas.startsWith('flow-')
          ? 'flows'
          : media.atlas.startsWith('nutrition-')
            ? 'nutrition'
            : media.atlas.startsWith('coding-')
              ? 'coding'
              : media.atlas === 'morning'
                ? 'lifestyle'
                : media.atlas === 'supplements'
                  ? 'supplements'
                  : 'fitness';
        const png = readFileSync(`mobile/assets/${folder}/${media.atlas}-${gender}-v1.jpg`);
        assert.equal(imageSize(png).width, atlas.width);
        assert.equal(imageSize(png).height, atlas.height);
        const positions = [];
        for (let frame = 0; frame < atlas.columns; frame++) {
          const crop = fitnessCrop(media, gender, frame / (atlas.columns - 1));
          assert.ok(crop.x >= 0 && crop.y >= 0);
          assert.ok(crop.x + crop.width <= atlas.width && crop.y + crop.height <= atlas.height);
          const fit = movementImageFit(crop, 350, 440);
          assert.equal(fit.width, fit.height);
          positions.push(crop.x);
        }
        assert.equal(
          new Set(positions).size,
          atlas.columns,
          'Every position selects a different image region',
        );
      }
    }
  }
});

test('sleep has four specific visual cards and keeps saved IDs and completion steps intact', () => {
  for (const id of ['wellbeing-sleep-start', 'sleep']) {
    const flow = flows.find(flow => flow.id === id)!;
    const before = JSON.stringify(flow);
    const result = resolveVisualFlow(flow, flows);
    assert.equal(result.adapted, true);
    assert.deepEqual(
      result.cards.map(card => card.title),
      ['Prepare tomorrow', 'Put the phone aside', 'A calmer activity', 'Notice what helped'],
    );
    assert.ok(result.cards.every(card => card.visualCard!.frames.length === 5));
    assert.ok(result.cards.every(card => card.visualCard!.sourceFlowId === id));
    assert.equal(JSON.stringify(flow), before, 'Presentation never mutates saved flow content');
  }
});

test('food, equipment and workouts receive relevant sequences instead of a generic icon deck', () => {
  const result = (id: string) =>
    resolveVisualFlow(
      flows.find(flow => flow.id === id)!,
      flows,
    );
  assert.deepEqual(
    result('recipe-chickpea-bowl').cards.map(card => card.visualCard!.media),
    [
      { atlas: 'nutrition-protein', row: 0 },
      { atlas: 'nutrition-protein', row: 1 },
    ],
  );
  assert.deepEqual(
    result('recipe-egg-chickpea-bowl').cards.map(card => card.visualCard!.media),
    [
      { atlas: 'nutrition-protein', row: 0 },
      { atlas: 'nutrition-protein', row: 1 },
      { atlas: 'nutrition-protein', row: 2 },
      { atlas: 'nutrition-protein', row: 3 },
    ],
  );
  assert.deepEqual(
    result('workout-core-foundations').cards.map(card => card.title),
    ['Dead bug', 'Bird dog', 'Forearm plank from knees'],
  );
  assert.deepEqual(
    result('fitness-gym-equipment').cards.map(card => card.visualCard!.media.row),
    [0, 1, 2, 3],
  );
  assert.equal(result('nutrition-pre-running').cards.length, 5);
  assert.ok(
    result('nutrition-magnesium-labels').cards.every(
      card => !/take|dose|swallow/i.test(card.title),
    ),
  );
});

test('new custom flows cannot reintroduce text-only fallback or pretend a planning image teaches an unknown movement', () => {
  const flow: HabitFlow = {
    id: 'custom',
    title: 'My own habit',
    goal: 'Practice',
    description: 'A personal idea',
    steps: [],
  };
  const resolved = resolveVisualFlow(flow, []);
  assert.equal(resolved.cards.length, 2);
  assert.ok(resolved.cards.every(card => card.visualCard?.frames.length === 5));
  assert.equal(resolved.cards[0].visualCard!.illustration, 'planning');
  const workout: HabitFlow = {
    ...flow,
    workout: {
      benefits: [],
      progression: '',
      safety: '',
      blocks: [
        {
          exerciseId: 'unfamiliar-move',
          mode: 'reps',
          reps: 1,
          sets: 1,
          restSeconds: 0,
          perSide: false,
        },
      ],
    },
  };
  const card = resolveVisualFlow(workout, []).cards[0];
  assert.match(card.title, /^Prepare:/);
  assert.match(card.visualCard!.benefits[0].description, /not a demonstration/);
});

type Element = { type: string | ((props: object) => Element); props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
function mount(file: string) {
  const require = createRequire(import.meta.url);
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as Record<string, (props: object) => Element> };
  const code = ts.transpileModule(readFileSync(`mobile/src/${file}.tsx`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return { useState: (value: unknown) => [value, () => {}] };
      if (name === 'react-native') return { View: 'View', Pressable: 'Pressable' };
      if (name.startsWith('../../shared/')) return require(`../shared/${name.split('/').at(-1)}`);
      if (name === './design/components')
        return { Sheet: 'Sheet', Button: 'Button', Badge: 'Badge', Card: 'Card', Field: 'Field' };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }) };
      const component = name.split('/').at(-1)!;
      return { [component]: component };
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports[file];
}

test('the real detail entry point uses the image viewer for all stored image records, with guidance behind information', () => {
  const Details = mount('FlowDetails');
  const profile = { flowIds: [] };
  for (const flow of flows) {
    const tree = Details({ flow, data: { flows, profile } });
    if (techResource(flow.id)) {
      // Written resources have no frames; they open as a link card, not the image viewer.
      assert.equal(tree.type, 'TechResourceCard', flow.id);
      continue;
    }
    const deck = nodes(tree).find(node => node.type === 'AnimalMovementDeck')!;
    assert.ok(deck, flow.id);
    assert.ok((deck.props.library as HabitFlow[]).length);
    assert.ok(
      !nodes(tree).some(node =>
        ['SwipeDeck', 'DeckPage', 'FlowReferenceDetails'].includes(String(node.type)),
      ),
    );
    if ((deck.props.library as HabitFlow[])[0].visualCard) {
      const panel = (
        deck.props.renderInformation as (card: HabitFlow, close: () => void) => Element
      )((deck.props.library as HabitFlow[])[0], () => {});
      assert.equal(panel.type, 'VisualFlowInformation');
      assert.equal(nodes(panel).length, 2, 'Legacy guide is only a child of the information panel');
    }
  }
});

test('information opens on Benefits while the full guide remains in a closed disclosure', () => {
  const Panel = mount('VisualFlowInformation');
  const card = resolveVisualFlow(
    flows.find(flow => flow.id === 'wellbeing-sleep-start')!,
    flows,
  ).cards[0];
  let closed = 0;
  const tree = Panel({ card, onClose: () => closed++, children: 'Detailed guidance' });
  assert.equal(tree.props.title, 'Benefits');
  const disclosure = nodes(tree).find(node => node.type === 'Disclosure')!;
  assert.equal(disclosure.props.title, 'Guide & sources');
  assert.notEqual(disclosure.props.initiallyOpen, true);
  (tree.props.onClose as () => void)();
  assert.equal(closed, 1);
});
