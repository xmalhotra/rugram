import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { flows } from '../shared/mobile';
import { resolveVisualFlow } from '../shared/visual-flows';
import { updatePersonalFlows, type PersonalFlowAction } from '../shared/personal-flows';

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
function mount(file: string, component: string, props: object) {
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
            if (!(index in slots))
              slots[index] = typeof initial === 'function' ? initial() : initial;
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
          useEffect: () => {},
          useCallback: (callback: unknown) => callback,
        };
      if (name === 'react-native')
        return { View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Image: 'Image', useWindowDimensions: () => ({ width: 390, height: 844 }) };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }), space: { lg: 20 } };
      if (name === './pane-state') return { usePaneState: () => ['male', () => {}] };
      if (name === './design/components')
        return { Button: 'Button', Field: 'Field', Sheet: 'Sheet', Card: 'Card' };
      if (name === './PersonalFlowSheets') return { PersonalFlowEditor: 'PersonalFlowEditor' };
      if (name === './pose-frames') return { poseFrameRow: () => null };
      if (name === './morning-stills') return { domainStill: () => undefined };
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
    return loaded.exports[component](nextProps)!;
  };
}
function find(tree: Element, property: string, value: unknown) {
  const result = nodes(tree).find(node => node.props[property] === value);
  assert.ok(result, `${property}: ${value}`);
  return result;
}
async function press(element: Element) {
  (element.props.onPress as () => void)();
  await Promise.resolve();
  await Promise.resolve();
}
const source = flows.find(flow => flow.id === 'workout-animal-movements')!;
const cards = resolveVisualFlow(source, flows).cards;
const card = { sourceFlowId: source.id, cardId: cards[0].id, title: cards[0].title };
const personal = updatePersonalFlows(
  [],
  { action: 'personal-flow-create', id: 'personal-test00001', name: 'My morning', ...card },
  new Date().toISOString(),
  card,
);

test('first Add to Flow pre-fills an editable name, saves one selected card and closes only on success', async () => {
  const inputs: PersonalFlowAction[] = [];
  let closed = 0;
  const render = mount('PersonalFlowSheets', 'AddToFlowSheet', {
    card,
    flows: [],
    busy: false,
    onChange: async (input: PersonalFlowAction) => {
      inputs.push(input);
      return true;
    },
    onClose: () => closed++,
  });
  let tree = render();
  assert.equal(find(tree, 'label', 'Flow name').props.value, 'Flow 1');
  (find(tree, 'label', 'Flow name').props.onChange as (name: string) => void)('Before work');
  tree = render();
  await press(find(tree, 'title', 'Create flow & add card'));
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].action, 'personal-flow-create');
  assert.ok('name' in inputs[0] && inputs[0].name === 'Before work');
  assert.ok('cardId' in inputs[0] && inputs[0].cardId === card.cardId);
  assert.equal(closed, 1);
});
test('existing-flow picker marks duplicates and supports adding a card from another collection', async () => {
  const chosen = resolveVisualFlow(
    flows.find(flow => flow.id === 'sleep')!,
    flows,
  ).cards[0];
  const inputs: PersonalFlowAction[] = [];
  const render = mount('PersonalFlowSheets', 'AddToFlowSheet', {
    card,
    flows: personal,
    busy: false,
    onChange: async (input: PersonalFlowAction) => {
      inputs.push(input);
      return true;
    },
    onClose: () => {},
  });
  assert.equal(find(render(), 'accessibilityLabel', 'Already in My morning').props.disabled, true);
  const tree = render({
    card: { sourceFlowId: 'sleep', cardId: chosen.id, title: chosen.title },
    flows: personal,
    busy: false,
    onChange: async (input: PersonalFlowAction) => {
      inputs.push(input);
      return true;
    },
    onClose: () => {},
  });
  await press(find(tree, 'accessibilityLabel', 'Add to My morning'));
  assert.deepEqual(inputs, [
    { action: 'personal-flow-add', id: personal[0].id, sourceFlowId: 'sleep', cardId: chosen.id },
  ]);
});
test('failed saves keep the picker open, reuse the creation ID on retry, and block rapid double taps', async () => {
  const inputs: PersonalFlowAction[] = [];
  let closed = 0;
  const render = mount('PersonalFlowSheets', 'AddToFlowSheet', {
    card,
    flows: [],
    busy: false,
    onChange: async (input: PersonalFlowAction) => {
      inputs.push(input);
      return false;
    },
    onClose: () => closed++,
  });
  let tree = render();
  const button = find(tree, 'title', 'Create flow & add card');
  (button.props.onPress as () => void)();
  (button.props.onPress as () => void)();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(inputs.length, 1);
  assert.equal(closed, 0);
  tree = render();
  assert.ok(find(tree, 'accessibilityRole', 'alert'));
  await press(find(tree, 'title', 'Create flow & add card'));
  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].id, inputs[1].id);
});
test('actual deck Add to Flow targets the visible card and stays separate from Tilt/Slider', async () => {
  const chosen: string[] = [];
  const render = mount('AnimalMovementDeck', 'AnimalMovementDeck', {
    flow: { ...source, relatedFlowIds: cards.map(card => card.id) },
    library: cards,
    onAddCard: (card: { id: string }) => chosen.push(card.id),
    busy: false,
  });
  let tree = render();
  await press(find(tree, 'accessibilityLabel', `Add ${cards[0].title} to a personal flow`));
  const rail = nodes(tree).find(node => node.type === 'FlowCardRail')!;
  (rail.props.onSelect as (index: number) => void)(1);
  tree = render();
  await press(find(tree, 'accessibilityLabel', `Add ${cards[1].title} to a personal flow`));
  assert.deepEqual(
    chosen,
    cards.slice(0, 2).map(card => card.id),
  );
  assert.equal(
    nodes(tree).find(node => node.type === 'MovementControls')!.props.controlMode,
    'tilt',
  );
});
test('Home opens a named personal flow and does not display the no-flows empty state', async () => {
  const opened: string[] = [];
  const tree = mount('HomeFeed', 'HomeFeed', {
    data: {
      profile: { flowIds: [], personalFlows: personal },
      flows,
      products: [],
      events: [],
      flowResources: { products: [], events: [] },
    },
    onPersonalFlow: (flow: { id: string }) => opened.push(flow.id),
  })();
  // Home hands its flows to the shared mind map, which renders each node as "Open <title>".
  const map = nodes(tree).find(node => node.type === 'FlowMindMap')!;
  assert.ok(map, 'Home renders the flow mind map');
  const branches = map.props.branches as {
    id: string;
    nodes: { title: string; detail: string; art: Element; onPress: () => void }[];
  }[];
  const yours = branches.find(branch => branch.id === 'yours')!;
  assert.ok(yours, 'Made by you branch');
  const [node] = yours.nodes;
  assert.equal(node.title, 'My morning');
  assert.equal(node.detail, '1 card');
  assert.equal(node.art.type, 'FlowIllustration');
  node.onPress();
  assert.deepEqual(opened, [personal[0].id]);
  assert.ok(!nodes(tree).some(node => node.props.children === 'No flows added yet'));
});
test('personal flow editor connects rename, card ordering and remove to explicit actions', async () => {
  const inputs: PersonalFlowAction[] = [];
  const render = mount('PersonalFlowSheets', 'PersonalFlowEditor', {
    flow: personal[0],
    library: flows,
    busy: false,
    onChange: async (input: PersonalFlowAction) => {
      inputs.push(input);
      return true;
    },
    onClose: () => {},
    onBrowse: () => {},
  });
  let tree = render();
  assert.equal(find(tree, 'accessibilityLabel', `Move up ${card.title}`).props.disabled, true);
  assert.equal(find(tree, 'accessibilityLabel', `Move down ${card.title}`).props.disabled, true);
  (find(tree, 'label', 'Flow name').props.onChange as (name: string) => void)('My evening');
  tree = render();
  await press(find(tree, 'title', 'Save name'));
  await press(find(tree, 'accessibilityLabel', `Remove ${card.title}`));
  assert.deepEqual(inputs, [
    { action: 'personal-flow-rename', id: personal[0].id, name: 'My evening' },
    { action: 'personal-flow-remove', id: personal[0].id, cardId: card.cardId },
  ]);
});
test('personal flow opens the existing visual deck and preserves the original card reference on Add', () => {
  const chosen: unknown[] = [];
  const tree = mount('PersonalFlowDetails', 'PersonalFlowDetails', {
    flow: personal[0],
    library: flows,
    busy: false,
    onAddCard: (card: unknown) => chosen.push(card),
    onChange: async () => true,
    onBrowse: () => {},
    onLink: () => {},
  })();
  const deck = nodes(tree).find(node => node.type === 'AnimalMovementDeck')!;
  assert.ok(deck);
  assert.equal(deck.props.uniformHeader, true);
  const library = deck.props.library as { id: string }[];
  assert.equal(library[0].id, card.cardId);
  (deck.props.onAddCard as (card: unknown) => void)(library[0]);
  assert.deepEqual(chosen, [card]);
});
