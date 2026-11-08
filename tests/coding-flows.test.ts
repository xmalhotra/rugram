import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import {
  codingCards,
  codingCardFlows,
  codingFlows,
  codingCollectionIds,
  legacyCodingCourseIds,
} from '../shared/coding-flows';
import { flows } from '../shared/mobile';
import { focusOptions, flowsForFocus } from '../shared/focus';
import {
  fitnessCollectionChildren,
  fitnessCollectionIds,
  fitnessMedia,
  isFitnessVisualFlow,
} from '../shared/fitness-guides';
import { fitnessAtlasLayouts, fitnessCrop } from '../shared/fitness-media-layout';
import { movementBrowseLibrary } from '../shared/animal-movements';

test('Coding offers supporting habits instead of courses, without deleting saved legacy flows', () => {
  assert.deepEqual(
    flowsForFocus(movementBrowseLibrary(flows), 'coding').map(flow => flow.title),
    ['FDE resources', 'Current AI agent', 'Value for money', 'Cards', 'Best monitor setup'],
  );
  assert.deepEqual(
    flowsForFocus(flows, 'coding', [{ id: 'coding', flowIds: legacyCodingCourseIds }]).map(
      flow => flow.id,
    ),
    codingCollectionIds,
  );
  const custom = [{ id: 'coding', flowIds: ['tech-web-first-page'] }];
  assert.deepEqual(
    flowsForFocus(flows, 'coding', custom).map(flow => flow.id),
    custom[0].flowIds,
  );
  assert.ok(legacyCodingCourseIds.every(id => flows.some(flow => flow.id === id)));
  assert.deepEqual(focusOptions.find(focus => focus.id === 'coding')!.flowIds, codingCollectionIds);
});

test('all 11 visual cards belong to three collections and do not leak into separate browse entries', () => {
  assert.equal(codingCards.length, 11);
  const browse = movementBrowseLibrary(flows);
  assert.deepEqual(
    codingFlows.map(flow => flow.relatedFlowIds!.length),
    [4, 3, 4],
  );
  for (const parent of codingFlows) {
    assert.ok(browse.some(flow => flow.id === parent.id));
    assert.ok(fitnessCollectionIds.includes(parent.id));
    assert.ok(isFitnessVisualFlow(parent.id));
    assert.deepEqual(fitnessCollectionChildren[parent.id], parent.relatedFlowIds);
    for (const id of parent.relatedFlowIds!) {
      assert.ok(flows.find(flow => flow.id === id)?.sessionGuide);
      assert.ok(!browse.some(flow => flow.id === id));
    }
  }
});

test('every appearance has five distinct full-panel crops and five explicit stages', () => {
  for (const card of codingCards) {
    assert.equal(card.frames.length, 5);
    assert.equal(new Set(card.frames).size, 5);
    const media = fitnessMedia[card.id];
    for (const gender of ['male', 'female'] as const) {
      const atlas = fitnessAtlasLayouts[media.atlas][gender];
      const crops = card.frames.map((_, index) => fitnessCrop(media, gender, index / 4));
      assert.equal(new Set(crops.map(crop => crop.x)).size, 5);
      for (const crop of crops) {
        assert.ok(
          crop.height > 200,
          'Preserve the full source panel rather than forcing a square crop',
        );
        assert.ok(crop.width > 200);
        assert.ok(crop.x >= 0 && crop.y >= 0);
        assert.ok(crop.x + crop.width <= atlas.width && crop.y + crop.height <= atlas.height);
      }
    }
  }
});

test('programmer inspiration is dated, sourced and explicitly adapted rather than an invented routine', () => {
  const habits = codingCards.filter(card => card.atlas === 'coding-habits');
  for (const card of habits) {
    assert.match(card.sourceNote, /adapt/i);
    assert.match(card.sourceNote, /20\d\d/);
    assert.ok(card.sources.every(source => source.url.startsWith('https://')));
    assert.ok(card.benefits.length >= 2);
  }
  assert.match(
    habits.find(card => card.id === 'coding-habit-walk')!.sourceNote,
    /Ethereum co-founder/,
  );
  assert.ok(
    codingCards
      .filter(card => card.action)
      .every(card =>
        ['https://musicforprogramming.net/', 'https://somafm.com/groovesalad/'].includes(
          card.action!.url,
        ),
      ),
  );
});

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
test('real coding information panel is benefits-first and audio opens only on an explicit press', () => {
  const require = createRequire(import.meta.url);
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as { CodingBenefits: (props: object) => Element } };
  const code = ts.transpileModule(readFileSync('mobile/src/CodingBenefits.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {};
      if (name === 'react-native') return { View: 'View' };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }) };
      if (name === './design/Text') return { Text: 'Text' };
      if (name === './design/components') return { Sheet: 'Sheet', Button: 'Button' };
      if (name === '../../shared/coding-flows') return require('../shared/coding-flows');
      throw new Error(name);
    },
    loaded,
    loaded.exports,
  );
  const links: string[] = [];
  let closed = false;
  const tree = loaded.exports.CodingBenefits({
    flow: codingCardFlows.find(flow => flow.id === 'coding-audio-groove'),
    onClose: () => {
      closed = true;
    },
    onLink: (url: string) => links.push(url),
  });
  assert.equal(tree.props.title, 'Benefits');
  assert.deepEqual(links, []);
  const text = nodes(tree)
    .filter(node => node.type === 'Text')
    .map(node => node.props.children)
    .join(' ');
  assert.match(text, /Try a different sound/);
  assert.ok(text.indexOf('Try a different sound') < text.indexOf('Station description'));
  const action = nodes(tree).find(node => node.props.title === 'Open Groove Salad ↗')!;
  (action.props.onPress as () => void)();
  assert.deepEqual(links, ['https://somafm.com/groovesalad/']);
  (tree.props.onClose as () => void)();
  assert.equal(closed, true);
});
