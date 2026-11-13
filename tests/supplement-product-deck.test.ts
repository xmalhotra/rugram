import { designMock, designTokens } from './support/design-mocks';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { curatedFlowProducts } from '../shared/curated-flow-resources';
import { supplementShortlists } from '../shared/supplement-shortlists';

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}

test('real product deck keeps ranks, pages and information callbacks coherent across swipes and resize', () => {
  const require = createRequire(import.meta.url);
  const state: unknown[] = [];
  let cursor = 0;
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as { SupplementProductDeck: (props: object) => Element } };
  const code = ts.transpileModule(readFileSync('mobile/src/SupplementProductDeck.tsx', 'utf8'), {
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
          useRef(initial: unknown) {
            const index = cursor++;
            if (!(index in state)) state[index] = { current: initial };
            return state[index];
          },
        };
      if (name === 'react-native')
        return { View: 'View', FlatList: 'FlatList', Pressable: 'Pressable' };
      if (name === './design/theme') return { ...designTokens, useTheme: () => ({ colors: {} }) };
      if (name === '../../shared/supplement-picks') return require('../shared/supplement-picks');
      const component = name.split('/').at(-1)!;
      return { [component]: component };
    },
    loaded,
    loaded.exports,
  );
  const products = supplementShortlists[0].productIds.map(id =>
    curatedFlowProducts.find(product => product.id === id)!,
  );
  const opened: string[] = [];
  const render = () => {
    cursor = 0;
    return loaded.exports.SupplementProductDeck({
      products,
      onPick: (product: { id: string }) => opened.push(product.id),
      onLink: () => {},
    });
  };
  let tree = render();
  (tree.props.onLayout as (event: object) => void)({ nativeEvent: { layout: { width: 350 } } });
  tree = render();
  let list = nodes(tree).find(node => node.type === 'FlatList')!;
  const scrolls: unknown[] = [];
  (list.props.ref as { current: unknown }).current = {
    scrollToIndex: (value: unknown) => scrolls.push(value),
  };
  assert.equal(list.props.pagingEnabled, true);
  assert.deepEqual(
    (list.props.getItemLayout as (value: unknown, index: number) => object)(null, 4),
    { length: 350, offset: 1400, index: 4 },
  );
  const renderItem = list.props.renderItem as (input: object) => Element;
  const widths = products.map(
    (product, index) => renderItem({ item: product, index }).props.style as { width: number },
  );
  assert.ok(widths.every(style => style.width === 350));
  const first = renderItem({ item: products[0], index: 0 });
  assert.ok(
    nodes(first).some(node => node.props.accessibilityLabel === 'Editorial shortlist rank 1, Gold'),
  );
  const infoButton = nodes(first).find(
    node => node.props.accessibilityLabel === `Information about ${products[0].title}`,
  )!;
  (infoButton.props.onPress as () => void)();
  tree = render();
  const info = nodes(tree).find(node => node.type === 'SupplementPickInformation')!;
  assert.equal((info.props.product as { id: string }).id, products[0].id);
  assert.deepEqual(opened, []);
  (info.props.onClose as () => void)();
  tree = render();
  const fifth = nodes(tree).find(node => node.props.accessibilityLabel === 'Product 5 of 5')!;
  (fifth.props.onPress as () => void)();
  assert.deepEqual(scrolls, [{ index: 4, animated: true }]);
  tree = render();
  assert.equal(
    nodes(tree).find(node => node.props.accessibilityLabel === 'Product 5 of 5')!.props
      .accessibilityState &&
      (
        nodes(tree).find(node => node.props.accessibilityLabel === 'Product 5 of 5')!.props
          .accessibilityState as { selected: boolean }
      ).selected,
    true,
  );
  (tree.props.onLayout as (event: object) => void)({ nativeEvent: { layout: { width: 400 } } });
  tree = render();
  list = nodes(tree).find(node => node.type === 'FlatList')!;
  assert.equal(list.props.initialScrollIndex, 4);
  (list.props.onMomentumScrollEnd as (event: object) => void)({
    nativeEvent: { contentOffset: { x: -100 } },
  });
  tree = render();
  assert.equal(
    (
      nodes(tree).find(node => node.props.accessibilityLabel === 'Product 1 of 5')!.props
        .accessibilityState as { selected: boolean }
    ).selected,
    true,
  );
});
