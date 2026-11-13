import { designMock, designTokens } from './support/design-mocks';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { gymTechniquesFlow } from '../shared/gym-techniques';

type Style = { width: number | string; height: number; left: number; top: number; backgroundColor?: string };
type Element = { type: string; props: { style: Style; children: unknown; id?: string } };
const localRequire = createRequire(import.meta.url);
function load(file: string) {
  const jsx = (type: string, props: object) => ({ type, props });
  const loaded = { exports: {} as Record<string, (props: object) => Element> };
  const code = ts.transpileModule(readFileSync(`mobile/src/${file}.tsx`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return { useState: () => [144, () => {}] };
      if (name === 'react-native') return { View: 'View', Image: 'Image', Pressable: 'Pressable' };
      if (name === './pane-state') return { usePaneState: () => ['male', () => {}] };
      if (name === './ExerciseVisual') return { ExerciseVisual: 'ExerciseVisual', ExerciseIcon: 'ExerciseIcon' };
      if (name === './FlowIllustration') return { FlowIllustration: 'FlowIllustration' };
      if (name === './design/Text') return { Text: 'Text' };
      if (name === './design/theme')
        return { ...designTokens, useTheme: () => ({ colors: { bg: '#000', card: '#101710' } }) };
      if (name.startsWith('../../shared/'))
        return localRequire(`../shared/${name.split('/').at(-1)}`);
      { const mock = designMock(name); if (mock) return mock; }
      throw new Error(name);
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports[file];
}

test('flow preview does not put a black pill behind the image', () => {
  const tree = load('FlowPreview')({ flow: gymTechniquesFlow, added: false, onPress() {} });
  const cover = (tree.props.children as Element[])[0];
  assert.equal(cover.props.style.backgroundColor, undefined);
  assert.equal(cover.props.style.height, 112);
});

test('an old flow still renders an icon when it has no generated picture', () => {
  const illustration = load('FlowIllustration');
  for (const flow of [
    gymTechniquesFlow,
    { ...gymTechniquesFlow, relatedFlowIds: ['unknown'] },
    { id: 'missing-old-flow', title: 'Old' },
  ]) {
    const tree = illustration({ flow });
    assert.equal(tree.type, 'ExerciseIcon');
  }
});
