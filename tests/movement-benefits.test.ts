import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { movementBenefits } from '../shared/movement-benefits';
import { animalMovementFlows } from '../shared/animal-movements';
import { fitnessMedia, cindyMovementFlows } from '../shared/fitness-guides';

test('every illustrated fitness movement has three short, sourced benefits', () => {
  const ids = [
    ...animalMovementFlows.map(flow => flow.id),
    ...Object.entries(fitnessMedia)
      .filter(([, media]) => ['cindy', 'running', 'hyrox'].includes(media.atlas))
      .map(([id]) => id),
  ];
  assert.ok(ids.length >= 40);
  for (const id of ids) {
    const info = movementBenefits(id);
    assert.ok(info, id);
    assert.equal(info.items.length, 3, id);
    assert.equal(new Set(info.items.map(item => item.title)).size, 3);
    for (const item of info.items) {
      assert.ok(item.title.length < 45);
      assert.ok(item.description.length <= 120);
      assert.doesNotMatch(item.description, /detox|guaranteed|cure|prevent.*injur|burn.*fat/i);
    }
    assert.ok(info.sourceUrls.every(url => url.startsWith('https://')));
  }
});

test('benefits describe the current movement, not the whole Cindy workout or a clinical promise', () => {
  assert.equal(movementBenefits('cindy-squat')!.items[0].title, 'Leg strength');
  assert.match(movementBenefits('cindy-squat')!.items[2].description, /chair and climbing stairs/);
  assert.equal(movementBenefits('cindy-pull-up')!.items[0].title, 'Pulling strength');
  assert.equal(movementBenefits('workout-animal-bird-dog')!.items[0].title, 'Core stability');
  assert.deepEqual(movementBenefits('hyrox-half-row'), movementBenefits('hyrox-full-row'));
  for (const id of ['unknown', 'morning-water', 'hyrox-full-unknown', 'hyrox-half-run-9'])
    assert.equal(movementBenefits(id), null);
});

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
function loadComponent(file: string, extra: (name: string) => unknown) {
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as Record<string, (props: object) => Element> };
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
          useState: (initial: unknown) => [initial, () => {}],
          useEffect: () => {},
          useCallback: (callback: unknown) => callback,
        };
      if (name === 'react-native') return { View: 'View', Pressable: 'Pressable', Image: 'Image' };
      if (name === './design/theme') return { useTheme: () => ({ colors: {} }) };
      if (name === './design/components') return { Sheet: 'Sheet', Button: 'Button' };
      if (name === './design/Text') return { Text: 'Text' };
      return extra(name);
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports[file];
}

test('Benefits panel shows only the movement name and benefit summaries, with working back navigation', () => {
  const require = createRequire(import.meta.url);
  const Component = loadComponent('MovementBenefits', name => {
    if (name.startsWith('../../shared/')) return require(`../shared/${name.split('/').at(-1)}`);
    if (name === './AnimalMovementStory') return { AnimalMovementStory: 'AnimalMovementStory' };
    if (name === './Disclosure') return { Disclosure: 'Disclosure' };
    throw new Error(`Unexpected import ${name}`);
  });
  let closed = 0;
  const flow = cindyMovementFlows.find(flow => flow.id === 'cindy-squat')!;
  const tree = Component({ flow, onClose: () => closed++ });
  assert.equal(tree.props.title, 'Benefits');
  assert.equal(tree.props.navigation, 'back');
  const text = nodes(tree)
    .filter(node => node.type === 'Text')
    .map(node => node.props.children)
    .join(' ');
  assert.match(text, /Air squat.*Leg strength.*Lower-body control.*Everyday movement/);
  assert.doesNotMatch(
    text,
    /Preview quality|Tilt right|Recenter|Technique|illustration|equipment|AI-generated/i,
  );
  assert.ok(!nodes(tree).some(node => ['Button', 'Disclosure'].includes(node.type)));
  (tree.props.onClose as () => void)();
  assert.equal(closed, 1);
});
