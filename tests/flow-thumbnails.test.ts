import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { gymTechniquesFlow } from '../shared/gym-techniques';
import { fitnessMedia } from '../shared/fitness-guides';

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
      if (name === './cindy-frames') return { cindyFrame: () => 1 };
      if (name === './pose-frames') return { poseFrame: () => null };
      if (name === './fitness-media')
        return { fitnessAtlases: new Proxy({}, { get: () => ({ male: 1 }) }) };
      if (name === './FitnessThumbnail') return { FitnessThumbnail: 'FitnessThumbnail' };
      if (name === './morning-stills') return { domainStill: () => undefined };
      if (name === './FlowIllustration') return { FlowIllustration: 'FlowIllustration' };
      if (name === './design/Text') return { Text: 'Text' };
      if (name === './design/theme')
        return { useTheme: () => ({ colors: { bg: '#000', card: '#101710' } }) };
      if (name.startsWith('../../shared/'))
        return localRequire(`../shared/${name.split('/').at(-1)}`);
      throw new Error(name);
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports[file];
}

test('flow thumbnails use available tile width without an extra dark backdrop', () => {
  const thumbnail = load('FitnessThumbnail');
  for (const id of ['cindy-pull-up', 'gym-technique-neutral-grip', 'workout-animal-bear']) {
    assert.ok(fitnessMedia[id], id);
    const tree = thumbnail({ id });
    assert.equal(tree.props.style.width, '100%');
    assert.equal(tree.props.style.backgroundColor, undefined);
    const frame = tree.props.children as Element;
    assert.ok(Number(frame.props.style.width) > 0);
    assert.ok(frame.props.style.left >= -1e-9);
    assert.ok(frame.props.style.top >= -1e-9);
    assert.ok(frame.props.style.left + Number(frame.props.style.width) <= 144 + 1e-9);
    assert.ok(frame.props.style.top + frame.props.style.height <= 112 + 1e-9);
  }
});

test('flow preview does not put a black pill behind the image', () => {
  const tree = load('FlowPreview')({ flow: gymTechniquesFlow, added: false, onPress() {} });
  const cover = (tree.props.children as Element[])[0];
  assert.equal(cover.props.style.backgroundColor, undefined);
  assert.equal(cover.props.style.height, 112);
});

test('collection covers fall back to a child with valid media', () => {
  const illustration = load('FlowIllustration');
  for (const flow of [gymTechniquesFlow, { ...gymTechniquesFlow, relatedFlowIds: ['unknown'] }]) {
    const tree = illustration({ flow });
    assert.equal(tree.props.id, 'gym-technique-neutral-grip');
  }
});
