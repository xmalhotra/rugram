import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { animalMovementCollectionFlow, animalMovementFlows } from '../shared/animal-movements';

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
function mount(file: string, props: object) {
  const require = createRequire(import.meta.url);
  const slots: unknown[] = [];
  let cursor = 0;
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as Record<string, (props: object) => Element | null> };
  const code = ts.transpileModule(readFileSync(`mobile/src/${file}.tsx`, 'utf8'), {
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
            if (!(index in slots)) slots[index] = initial;
            return [
              slots[index],
              (next: unknown) => {
                slots[index] = typeof next === 'function' ? next(slots[index]) : next;
              },
            ];
          },
          useRef(initial: unknown) {
            const index = cursor++;
            if (!(index in slots)) slots[index] = { current: initial };
            return slots[index];
          },
          useCallback: (fn: unknown) => fn,
          useEffect: () => {},
        };
      if (name === 'react-native')
        return { View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', useWindowDimensions: () => ({ width: 390, height: 844 }) };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }), space: { lg: 20 } };
      if (name === './pane-state') return { usePaneState: () => ['male', () => {}] };
      if (name === '@react-native-community/slider') return { default: 'Slider' };
      if (name === './AddToFlowHeader') return { useRegisterAddToFlow: () => false };
      if (name.startsWith('../../shared/')) return require(`../shared/${name.split('/').at(-1)}`);
      const component = name.split('/').at(-1)!;
      return { [component]: component };
    },
    loaded,
    loaded.exports,
  );
  return (nextProps = props) => {
    cursor = 0;
    return loaded.exports[file](nextProps);
  };
}
function node(tree: Element, type: string) {
  const result = nodes(tree).find(item => item.type === type);
  assert.ok(result, type);
  return result;
}
const event = (x: number) => ({ nativeEvent: { contentOffset: { x } } });
const layout = (width: number, height: number) => ({ nativeEvent: { layout: { width, height } } });

test('card strip names every movement, announces selection, and offers direct navigation separately from poses', () => {
  const selected: number[] = [];
  const props = {
    cards: animalMovementFlows,
    current: 0,
    onSelect: (index: number) => selected.push(index),
  };
  const render = mount('FlowCardRail', props);
  let tree = render()!;
  assert.equal(node(tree, 'ScrollView').props.accessibilityLabel, 'Cards in this flow');
  const tabs = nodes(tree).filter(item => item.props.accessibilityRole === 'tab');
  assert.equal(tabs.length, animalMovementFlows.length);
  assert.equal(
    tabs[0].props.accessibilityLabel,
    `Bear crawl, card 1 of ${animalMovementFlows.length}`,
  );
  assert.equal(
    tabs[1].props.accessibilityLabel,
    `Crab walk, card 2 of ${animalMovementFlows.length}`,
  );
  assert.deepEqual(tabs[0].props.accessibilityState, { selected: true });
  (tabs[1].props.onPress as () => void)();
  assert.deepEqual(selected, [1]);
  tree = render({ ...props, current: 4 })!;
  const scrolls: unknown[] = [];
  (node(tree, 'ScrollView').props.ref as { current: unknown }).current = {
    scrollTo: (input: unknown) => scrolls.push(input),
  };
  (node(tree, 'ScrollView').props.onContentSizeChange as () => void)();
  assert.deepEqual(scrolls, [{ x: 456, animated: true }]);
  assert.equal(render({ ...props, cards: animalMovementFlows.slice(0, 1) }), null);
});

test('actual movement deck keeps the strip outside paging, syncs taps/swipes and preserves per-card modes', () => {
  const render = mount('AnimalMovementDeck', {
    flow: animalMovementCollectionFlow,
    library: animalMovementFlows,
  });
  let tree = render()!;
  (node(tree, 'ScrollView').props.onLayout as (event: object) => void)(layout(350, 500));
  tree = render()!;
  const scrolls: unknown[] = [];
  (node(tree, 'ScrollView').props.ref as { current: unknown }).current = {
    scrollTo: (input: unknown) => scrolls.push(input),
  };
  assert.ok(
    !nodes(node(tree, 'ScrollView').props.children).some(item => item.type === 'FlowCardRail'),
  );
  assert.equal(node(tree, 'FlowCardRail').props.current, 0);
  (node(tree, 'FlowCardRail').props.onSelect as (index: number) => void)(1);
  tree = render()!;
  assert.equal(node(tree, 'FlowCardRail').props.current, 1);
  assert.deepEqual(scrolls.at(-1), { x: 350, animated: true });
  (node(tree, 'ScrollView').props.onMomentumScrollEnd as (event: object) => void)(event(350));
  (node(tree, 'FlowCardRail').props.onSelect as (index: number) => void)(5);
  tree = render()!;
  assert.equal(node(tree, 'FlowCardRail').props.current, 5);
  assert.deepEqual(scrolls.at(-1), { x: 1750, animated: false });
  // A stale completion from a previous animated tap cannot undo the latest selection.
  (node(tree, 'ScrollView').props.onMomentumScrollEnd as (event: object) => void)(event(350));
  tree = render()!;
  assert.equal(node(tree, 'FlowCardRail').props.current, 5);
  (node(tree, 'ScrollView').props.onScrollBeginDrag as () => void)();
  (node(tree, 'ScrollView').props.onMomentumScrollEnd as (event: object) => void)(event(0));
  tree = render()!;
  assert.equal(node(tree, 'FlowCardRail').props.current, 0);
  const pages = nodes(node(tree, 'ScrollView').props.children).filter(
    item => item.type === 'View' && (item.props.style as { width?: number })?.width === 350,
  );
  assert.equal(pages.length, animalMovementFlows.length);
  assert.ok(pages.every(page => (page.props.style as { height: number }).height === 500));
});

test('card selector replaces the repeated heading above the single control bar, not below the viewer', () => {
  const render = mount('AnimalMovementDeck', {
    flow: animalMovementCollectionFlow,
    library: animalMovementFlows,
  });
  const tree = render()!;
  const all = nodes(tree);
  assert.equal(all.filter(item => item.type === 'FlowCardRail').length, 1);
  const rail = node(tree, 'FlowCardRail');
  assert.equal(rail.props.showHeading, false);
  assert.ok(all.indexOf(rail) < all.indexOf(node(tree, 'ScrollView')));
  assert.ok(
    !all.some(item => item.type === 'Text' && item.props.children === 'Bear crawl'),
    'The selected title is represented by its tab, not repeated in a separate heading',
  );
});

test('top selector keeps all titled accessible tabs without another In this flow label', () => {
  const tree = mount('FlowCardRail', {
    cards: animalMovementFlows,
    current: 5,
    onSelect() {},
    showHeading: false,
  })()!;
  const all = nodes(tree);
  assert.ok(
    !all.some(
      item =>
        item.type === 'Text' &&
        ['In this flow', 'Swipe or tap a card'].includes(String(item.props.children)),
    ),
  );
  assert.equal(
    all.filter(item => item.props.accessibilityRole === 'tab').length,
    animalMovementFlows.length,
  );
  assert.equal(
    all.filter(item => item.type === 'Text' && item.props.children === 'Bird dog').length,
    1,
  );
  const selected = all.find(
    item =>
      item.props.accessibilityRole === 'tab' &&
      (item.props.accessibilityState as { selected: boolean }).selected,
  )!;
  assert.match(String(selected.props.accessibilityLabel), /Bird dog, card 6 of 10/);
});

test('single-card flows retain a readable title when there is no card selector', () => {
  const tree = mount('AnimalMovementDeck', {
    flow: { ...animalMovementCollectionFlow, relatedFlowIds: [animalMovementFlows[0].id] },
    library: animalMovementFlows,
  })()!;
  assert.equal(nodes(tree).filter(item => item.type === 'FlowCardRail').length, 0);
  assert.equal(
    nodes(tree).filter(item => item.type === 'Text' && item.props.children === 'Bear crawl').length,
    1,
  );
});

test('shared range renders exact frame stops and swaps with segments in the same stationary row', () => {
  const selected: number[] = [];
  const props = {
    progress: 0.5,
    phase: 2,
    frameCount: 5,
    frameTerm: 'Pose',
    controlMode: 'slider',
    onProgress: (value: number) => selected.push(value),
    disabled: true,
  };
  const render = mount('MovementPositionBar', props);
  const tree = render()!;
  const slider = node(tree, 'Slider');
  assert.equal(slider.props.disabled, true);
  assert.equal(slider.props.value, 3);
  assert.deepEqual(slider.props.accessibilityValue, {
    min: 1,
    max: 5,
    now: 3,
    text: 'Pose 3 of 5',
  });
  (slider.props.onValueChange as (value: number) => void)(1);
  (slider.props.onValueChange as (value: number) => void)(5);
  assert.deepEqual(selected, [0, 1]);
  const segments = render({ ...props, controlMode: 'tilt' })!;
  assert.equal(nodes(segments).filter(item => item.type === 'Slider').length, 0);
  assert.equal(
    nodes(segments).filter(
      item => item.type === 'View' && (item.props.style as { height: number }).height === 3,
    ).length,
    5,
  );
  assert.equal(
    (tree.props.style as { height: number }).height,
    (segments.props.style as { height: number }).height,
  );
});
