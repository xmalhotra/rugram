import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import {
  supplementOrderNote,
  supplementPickCategories,
  supplementPosition,
  supplementProductPosition,
} from '../shared/supplement-picks';
import { defaultSupplementDiscovery, topicProducts } from '../shared/supplement-discovery';
import { curatedWheyProducts } from '../shared/curated-whey-products';
import { curatedFlowProducts } from '../shared/curated-flow-resources';

test('Picks uses ingredient categories, preserves configured topics, and distinguishes plant protein from whey', () => {
  const categories = supplementPickCategories(defaultSupplementDiscovery);
  assert.deepEqual(
    categories.slice(0, 4).map(topic => topic.title),
    ['Collagen peptides', 'Creatine', 'Whey protein', 'Plant-based protein'],
  );
  assert.equal(new Set(categories.map(topic => topic.id)).size, categories.length);
  const edited = {
    ...defaultSupplementDiscovery.topics[0],
    productIds: ['custom'],
    title: 'Edited whey',
  };
  assert.deepEqual(
    supplementPickCategories({ ...defaultSupplementDiscovery, topics: [edited] }).find(
      topic => topic.id === 'protein',
    ),
    edited,
  );
  for (const id of ['plant-protein', 'peptides'])
    assert.equal(categories.find(topic => topic.id === id)!.productIds.length, 5);
  assert.match(
    categories.find(topic => topic.id === 'peptides')!.consider,
    /not injectable or research peptides/,
  );
});

test('numbered positions support five real entries without inventing quality awards or filling empty slots', () => {
  assert.deepEqual(
    Array.from({ length: 5 }, (_, index) => supplementPosition(index)),
    [
      { number: 1, medal: 'Gold' },
      { number: 2, medal: 'Silver' },
      { number: 3, medal: 'Bronze' },
      { number: 4, medal: undefined },
      { number: 5, medal: undefined },
    ],
  );
  assert.match(supplementOrderNote, /Neither is an independent quality award/);
  assert.equal(supplementProductPosition(curatedWheyProducts[1], 0).number, 2);
  assert.equal(supplementProductPosition(curatedWheyProducts[1], 0).medal, 'Silver');
  assert.deepEqual(
    supplementProductPosition({ ...curatedWheyProducts[0], assessment: undefined }, 0),
    { number: 1, medal: undefined, ranked: false },
  );
  const products = Array.from({ length: 7 }, (_, index) => ({
    ...curatedWheyProducts[0],
    id: `whey-${index}`,
  }));
  const topic = {
    ...defaultSupplementDiscovery.topics[0],
    productIds: products.map(product => product.id),
  };
  assert.deepEqual(
    topicProducts(topic, [...products].reverse(), 5).map(product => product.id),
    products.slice(0, 5).map(product => product.id),
  );
  assert.equal(topicProducts(topic, products, 99).length, 5);
  assert.equal(topicProducts(topic, products, -1).length, 0);
  assert.equal(topicProducts(topic, [], 5).length, 0);
});

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
function mount() {
  const require = createRequire(import.meta.url);
  const state: unknown[] = [];
  let cursor = 0;
  let back = 0;
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as { SupplementDiscovery: (props: object) => Element } };
  const code = ts.transpileModule(readFileSync('mobile/src/SupplementDiscovery.tsx', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react')
        return {
          useState(initial: unknown) {
            const index = cursor++;
            if (!(index in state)) state[index] = initial;
            return [
              state[index],
              (next: unknown) => {
                state[index] = next;
              },
            ];
          },
        };
      if (name === 'react-native')
        return { View: 'View', Pressable: 'Pressable', Image: 'Image', ScrollView: 'ScrollView' };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }) };
      // Topic selection moved from component useState to account-scoped pane state so a flow can open it.
      if (name === './pane-state')
        return {
          usePaneState(_name: string, initial: unknown) {
            const index = cursor++;
            if (!(index in state))
              state[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
            return [
              state[index],
              (next: unknown) => {
                state[index] =
                  typeof next === 'function' ? (next as (current: unknown) => unknown)(state[index]) : next;
              },
            ];
          },
        };
      if (name === './design/components') return { Button: 'Button', Sheet: 'Sheet' };
      if (name === './OutboundLink') return { HealthNote: 'HealthNote' };
      if (name === './picks-icons') return { supplementIcons: {}, cardShelfIcons: {} };
      if (name.startsWith('../../shared/')) return require(`../shared/${name.split('/').at(-1)}`);
      const component = name.split('/').at(-1)!;
      return { [component]: component };
    },
    loaded,
    loaded.exports,
  );
  const render = () => {
    cursor = 0;
    return loaded.exports.SupplementDiscovery({
      data: {
        products: curatedFlowProducts,
        flowResources: { products: [], events: [] },
        flows: [],
      },
      onBack: () => back++,
      onPick: () => {},
      onFlow: () => {},
      onGuide: () => {},
      onLink: () => {},
    });
  };
  const press = (tree: Element, label: string) => {
    const button = nodes(tree).find(
      node => node.type === 'Pressable' && node.props.accessibilityLabel === label,
    );
    assert.ok(button, label);
    (button.props.onPress as () => void)();
  };
  return { render, press, backCount: () => back };
}

test('real Supplements component opens products directly; no goal heading or information button', () => {
  const screen = mount();
  let tree = screen.render();
  assert.ok(
    !nodes(tree).some(node => ['HealthNote', 'Sheet', 'SupplementJourney'].includes(node.type)),
  );
  screen.press(tree, 'Whey protein');
  tree = screen.render();
  const deck = nodes(tree).find(node => node.type === 'SupplementProductDeck');
  assert.ok(deck);
  assert.equal((deck.props.products as unknown[]).length, 5);
  assert.ok(
    !nodes(tree).some(node => ['HealthNote', 'Sheet', 'SupplementJourney'].includes(node.type)),
  );
  // No goal heading and no information button: tiles and products only.
  assert.ok(!nodes(tree).some(node => node.props?.accessibilityLabel === 'Supplement information'));
  // Inside a goal there is no category row; switching goes back to the tiles.
  assert.ok(!nodes(tree).some(node => node.type === 'CategoryRail'));
  screen.press(tree, 'Back to Supplement categories');
  tree = screen.render();
  screen.press(tree, 'Plant-based protein');
  tree = screen.render();
  assert.ok(!nodes(tree).some(node => node.type === 'Sheet'));
  assert.equal(
    (nodes(tree).find(node => node.type === 'SupplementProductDeck')!.props.products as unknown[])
      .length,
    5,
  );
  screen.press(tree, 'Back to Supplement categories');
  tree = screen.render();
  screen.press(tree, 'Back to All categories');
  assert.equal(screen.backCount(), 1);
});

test('product deck pages one fixed-width card at a time and keeps explanations off the cards', () => {
  const source = readFileSync('mobile/src/SupplementProductDeck.tsx', 'utf8');
  assert.match(source, /pagingEnabled/);
  assert.match(source, /getItemLayout/);
  assert.match(source, /showReason=\{false\}/);
  assert.match(source, /Information about/);
});
