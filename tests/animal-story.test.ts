import { designMock, designTokens } from './support/design-mocks';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { animalMovementContext, isAnimalMovement } from '../shared/animal-movement-context';
import { animalMovementCollectionFlow, animalMovementFlows } from '../shared/animal-movements';
import { fitnessMedia } from '../shared/fitness-guides';
import { fitnessAtlasLayouts } from '../shared/fitness-media-layout';

test('Animal movements has primary-source celebrity context without claiming an endorsement or exact routine', () => {
  assert.equal(animalMovementFlows.length, 10);
  assert.equal(animalMovementCollectionFlow.sessionGuide?.format, '10 movements');
  const [vidyut, centr, fitch] = animalMovementContext.connections;
  assert.equal(new URL(vidyut.source.url).hostname, 'www.youtube.com');
  assert.equal(new URL(centr.source.url).hostname, 'centr.com');
  assert.equal(new URL(fitch.source.url).hostname, 'animalflow.com');
  assert.match(vidyut.body, /not the origin.*exact routine/);
  assert.match(centr.body, /not Hemsworth’s personal programme/);
  assert.match(fitch.body, /not an official Animal Flow course/);
  assert.match(animalMovementContext.boundary, /not an endorsement/);
  for (const connection of animalMovementContext.connections)
    assert.ok(
      animalMovementCollectionFlow.sources?.some(source => source.url === connection.source.url),
    );
});

test('four additions each have five male/female frames, their own source and distinct training focus', () => {
  const additions = animalMovementFlows.slice(6);
  assert.deepEqual(
    additions.map(flow => flow.id),
    [
      'workout-animal-lateral-bear',
      'workout-animal-crab-toe-touch',
      'workout-animal-sit-through',
      'workout-animal-duck',
    ],
  );
  assert.equal(new Set(additions.map(flow => flow.sessionGuide.format)).size, 4);
  for (const flow of additions) {
    const media = fitnessMedia[flow.id];
    assert.equal(media.atlas, 'flow-animal-extra');
    assert.ok(flow.sources?.[0].url.startsWith('https://'));
    for (const gender of ['male', 'female'] as const) {
      const atlas: { columns: number; rows: number[] } = fitnessAtlasLayouts[media.atlas][gender];
      assert.equal(atlas.columns, 5);
      assert.ok(media.row < atlas.rows.length - 1);
    }
  }
  assert.ok(isAnimalMovement(additions[0].id));
  assert.equal(isAnimalMovement(animalMovementCollectionFlow.id), false);
  assert.equal(isAnimalMovement('cindy-squat'), false);
});

type Element = { type: string; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object' || !('type' in value) || !('props' in value)) return [];
  const element = value as Element;
  return [element, ...nodes(element.props.children)];
}
function mount(component: string, props: object) {
  let open = false;
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const loaded = { exports: {} as Record<string, (props: object) => Element> };
  const code = ts.transpileModule(readFileSync('mobile/src/AnimalMovementStory.tsx', 'utf8'), {
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
          useState: () => [
            open,
            (next: boolean) => {
              open = next;
            },
          ],
        };
      if (name === 'react-native') return { View: 'View', Pressable: 'Pressable' };
      if (name === './design/theme') return { ...designTokens, useTheme: () => ({ colors: {} }) };
      if (name === './design/Text') return { Text: 'Text' };
      if (name === './design/components') return { Button: 'Button', Sheet: 'Sheet' };
      if (name === '../../shared/animal-movement-context') return { animalMovementContext };
      { const mock = designMock(name); if (mock) return mock; }
      throw new Error(`Unexpected import ${name}`);
    },
    loaded,
    loaded.exports,
  );
  return () => loaded.exports[component](props);
}

test('backstory entry opens and closes without replacing the frame deck', () => {
  const render = mount('AnimalStoryEntry', { onLink: () => {} });
  let tree = render();
  assert.equal(nodes(tree).filter(node => node.type === 'Sheet').length, 0);
  const entry = nodes(tree).find(node => node.type === 'Pressable')!;
  (entry.props.onPress as () => void)();
  tree = render();
  const sheet = nodes(tree).find(node => node.type === 'Sheet')!;
  assert.equal(sheet.props.navigation, 'back');
  (sheet.props.onClose as () => void)();
  assert.equal(nodes(render()).filter(node => node.type === 'Sheet').length, 0);
});
test('all credibility references open the exact primary-source URLs', () => {
  const links: string[] = [];
  const tree = mount('AnimalMovementStory', { onLink: (url: string) => links.push(url) })();
  for (const button of nodes(tree).filter(node => node.type === 'Button'))
    (button.props.onPress as () => void)();
  assert.deepEqual(
    links,
    animalMovementContext.connections.map(item => item.source.url),
  );
});
