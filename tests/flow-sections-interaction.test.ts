import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { flows } from '../shared/mobile';
import { focusOptions } from '../shared/focus';
import { defaultFlowCategoryGroups } from '../shared/flow-categories';
import { movementBrowseLibrary } from '../shared/animal-movements';

type Element = { type: string; props: Record<string, unknown> };
function descendants(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(descendants);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...descendants(element.props.children)];
}
function find(tree: Element, type: string) {
  const node = descendants(tree).find(element => element.type === type);
  assert.ok(node, `${type} is rendered`);
  return node;
}
const options = focusOptions.map(option => ({ ...option, flowIds: [...option.flowIds] }));

/** Executes the real component and its callbacks with mocked React/native primitives.
 * Verifies navigation wiring, not physical native layout or scroll performance. */
function mount(categoryId: string, initialSection?: string) {
  const require = createRequire(import.meta.url);
  const slots: unknown[] = [];
  let cursor = 0;
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as { FlowSections: (props: object) => Element } };
  const code = ts.transpileModule(readFileSync('mobile/src/FlowSections.tsx', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react')
        return {
          useState(initial: unknown) {
            const index = cursor++;
            if (!(index in slots))
              slots[index] = typeof initial === 'function' ? initial() : initial;
            return [
              slots[index],
              (next: unknown) => {
                slots[index] = typeof next === 'function' ? next(slots[index]) : next;
              },
            ];
          },
          useRef(current: unknown) {
            const index = cursor++;
            if (!(index in slots)) slots[index] = { current };
            return slots[index];
          },
          useCallback: (fn: unknown) => fn,
          useEffect: () => {},
        };
      if (name === 'react-native')
        return {
          ScrollView: 'ScrollView',
          View: 'View',
          Pressable: 'Pressable',
          RefreshControl: 'RefreshControl',
        };
      if (name === './design/theme')
        return {
          useTheme: () => ({
            colors: { text: '#fff', muted: '#999', bg: '#000', line: '#333', lime: '#7fa' },
          }),
        };
      if (name === './design/Text') return { Text: 'Text' };
      if (name === './CategoryRail') return { CategoryRail: 'CategoryRail' };
      if (name === './FlowPreview') return { FlowPreview: 'FlowPreview' };
      if (name === '../../shared/flow-sections') return require('../shared/flow-sections');
      if (name === '../../shared/flow-scroll') return require('../shared/flow-scroll');
      throw new Error(`Unexpected component import: ${name}`);
    },
    loaded,
    loaded.exports,
  );
  const category = defaultFlowCategoryGroups.find(group => group.id === categoryId)!;
  let back = 0;
  const opened: { flowId: string; focusId: string }[] = [];
  const scrolls: { y: number; animated: boolean }[] = [];
  const render = () => {
    cursor = 0;
    const tree = loaded.exports.FlowSections({
      title: category.title,
      topics: category.focusIds.flatMap(id => options.filter(option => option.id === id)),
      options,
      library: movementBrowseLibrary(flows),
      ownedIds: [],
      busy: false,
      initialSection,
      onBack: () => back++,
      onSelect: (flow: { id: string }, focusId: string) =>
        opened.push({ flowId: flow.id, focusId }),
    });
    (tree.props.ref as { current: unknown }).current = {
      scrollTo: (value: { y: number; animated: boolean }) => scrolls.push(value),
    };
    return tree;
  };
  const layout = () => {
    let tree = render();
    const header = descendants(tree).find(
      node => node.type === 'View' && typeof node.props.onLayout === 'function',
    )!;
    (header.props.onLayout as (event: object) => void)({
      nativeEvent: { layout: { height: 120 } },
    });
    tree = render();
    const sections = descendants(tree).filter(
      node =>
        node.type === 'View' &&
        node.props.onLayout &&
        node !== descendants(tree).find(node => node.type === 'View' && node.props.onLayout),
    );
    sections.forEach((section, index) =>
      (section.props.onLayout as (event: object) => void)({
        nativeEvent: { layout: { y: 120 + index * 600 } },
      }),
    );
    return render();
  };
  return { render, layout, scrolls, opened, backCount: () => back };
}

for (const category of defaultFlowCategoryGroups) {
  test(`${category.title}: one sticky rail follows scrolling and tab taps retain every flow`, () => {
    const screen = mount(category.id);
    let tree = screen.layout();
    assert.deepEqual(tree.props.stickyHeaderIndices, [0]);
    assert.equal(descendants(tree).filter(node => node.type === 'CategoryRail').length, 1);
    const rail = find(tree, 'CategoryRail');
    const items = rail.props.items as { id: string }[];
    const before = descendants(tree).filter(node => node.type === 'FlowPreview').length;
    assert.ok(before > 0);
    const last = items.at(-1)!;
    (tree.props.onScroll as (event: object) => void)({
      nativeEvent: { contentOffset: { y: (items.length - 1) * 600 } },
    });
    tree = screen.render();
    assert.equal(find(tree, 'CategoryRail').props.selected, last.id);
    (find(tree, 'CategoryRail').props.onSelect as (id: string) => void)(items[0].id);
    assert.deepEqual(screen.scrolls.at(-1), { y: 0, animated: true });
    tree = screen.render();
    assert.equal(descendants(tree).filter(node => node.type === 'FlowPreview').length, before);
    (find(tree, 'FlowPreview').props.onPress as () => void)();
    assert.ok(category.focusIds.includes(screen.opened[0].focusId));
    const back = descendants(tree).find(
      node =>
        node.type === 'Pressable' && node.props.accessibilityLabel === 'Back to All categories',
    )!;
    (back.props.onPress as () => void)();
    assert.equal(screen.backCount(), 1);
  });
}

test('initial category links scroll once to the requested section and do not undo a manual selection', () => {
  const screen = mount('fitness', 'hyrox');
  let tree = screen.layout();
  assert.deepEqual(screen.scrolls, [{ y: 1200, animated: false }]);
  (find(tree, 'CategoryRail').props.onSelect as (id: string) => void)('workout');
  tree = screen.render();
  (tree.props.onContentSizeChange as () => void)();
  assert.deepEqual(screen.scrolls.at(-1), { y: 0, animated: true });
  assert.equal(screen.scrolls.length, 2);
});
