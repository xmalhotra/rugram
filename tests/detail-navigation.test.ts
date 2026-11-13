import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

/** Runs the actual surface with DOM/native adapters. Not a native tab-bar device test. */
function harness(platform = 'android') {
  const require = createRequire(import.meta.url);
  const focusEffects: (() => void | (() => void))[] = [];
  const listeners: (() => boolean)[] = [];
  const tabListeners: (() => void)[] = [];
  const navigation = {
    isFocused: () => true,
    addListener: (_event: string, handler: () => void) => {
      tabListeners.push(handler);
      return () => {
        tabListeners.splice(tabListeners.indexOf(handler), 1);
      };
    },
  };
  const detailModule = {
    exports: {} as {
      DetailSurface: React.ComponentType<
        React.PropsWithChildren<{
          presentation?: 'inline' | 'modal';
          onClose: () => void;
          fullScreen: boolean;
        }>
      >;
    },
  };
  const code = ts.transpileModule(readFileSync('mobile/src/design/DetailSurface.tsx', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react-native')
        return {
          Platform: { OS: platform },
          View: ({ children }: React.PropsWithChildren) =>
            React.createElement('div', null, children),
          StyleSheet: { absoluteFill: { position: 'absolute', inset: 0 } },
          Modal: ({ children }: React.PropsWithChildren) =>
            React.createElement('aside', { 'data-native-modal': true }, children),
          BackHandler: {
            addEventListener: (_event: string, handler: () => boolean) => {
              listeners.push(handler);
              return {
                remove: () => {
                  listeners.splice(listeners.indexOf(handler), 1);
                },
              };
            },
          },
        };
      if (name === 'react-native-screens/experimental')
        return {
          SafeAreaView: ({
            children,
            edges,
          }: React.PropsWithChildren<{ edges?: Record<string, boolean> }>) =>
            React.createElement(
              'section',
              { 'data-native-tab-insets': JSON.stringify(edges) },
              children,
            ),
        };
      if (name === 'react-native-safe-area-context')
        return {
          initialWindowMetrics: undefined,
          SafeAreaProvider: ({ children }: React.PropsWithChildren) => children,
          SafeAreaView: ({ children, edges }: React.PropsWithChildren<{ edges?: string[] }>) =>
            React.createElement('section', { 'data-safe-edges': JSON.stringify(edges) }, children),
        };
      if (name === 'expo-router')
        return {
          useNavigation: () => navigation,
          useFocusEffect: (effect: () => void | (() => void)) => {
            focusEffects.push(effect);
          },
        };
      if (name === './theme') return { useTheme: () => ({ colors: { bg: '#000' } }) };
      return require(name);
    },
    detailModule,
    detailModule.exports,
  );
  return { Surface: detailModule.exports.DetailSurface, focusEffects, listeners, tabListeners };
}

test('inline flow and nested information render without a native modal covering tabs', () => {
  const { Surface } = harness();
  const result = renderToStaticMarkup(
    React.createElement(
      Surface,
      { presentation: 'inline', onClose() {}, fullScreen: true },
      React.createElement('div', null, 'Movement frame'),
      React.createElement(Surface, { onClose() {}, fullScreen: false }, 'Movement information'),
    ),
  );
  assert.doesNotMatch(result, /data-native-modal/);
  assert.match(result, /Movement frame/);
  assert.match(result, /Movement information/);
  assert.match(result, /data-safe-edges="\[&quot;top&quot;,&quot;bottom&quot;\]"/);
  assert.match(
    result,
    /data-safe-edges="\[\]"/,
    'Nested information does not add status/tab padding again',
  );
});

test('dialogs retain explicit native modal presentation instead of changing all sheets globally', () => {
  const { Surface } = harness();
  const result = renderToStaticMarkup(
    React.createElement(
      Surface,
      { presentation: 'modal', onClose() {}, fullScreen: true },
      'Event editor',
    ),
  );
  assert.match(result, /data-native-modal/);
});

test('iOS inline detail reserves the native tab interface inset rather than just the home indicator', () => {
  const { Surface } = harness('ios');
  const result = renderToStaticMarkup(
    React.createElement(
      Surface,
      { presentation: 'inline', fullScreen: true, onClose() {} },
      'Flow',
    ),
  );
  assert.match(result, /data-native-tab-insets/);
  assert.match(result, /&quot;bottom&quot;:true/);
  assert.doesNotMatch(result, /data-native-modal/);
});

test('Android Back closes deepest inline details first regardless of registration order, with cleanup on blur', () => {
  for (const reverseOrder of [false, true]) {
    const { Surface, focusEffects, listeners } = harness();
    const closed: string[] = [];
    renderToStaticMarkup(
      React.createElement(
        Surface,
        { presentation: 'inline', onClose: () => closed.push('flow'), fullScreen: true },
        React.createElement(
          Surface,
          { onClose: () => closed.push('info'), fullScreen: false },
          'Info',
        ),
      ),
    );
    const effects = reverseOrder ? [...focusEffects].reverse() : focusEffects;
    const cleanup = effects.map(effect => effect());
    [...listeners].reverse().some(handler => handler());
    assert.deepEqual(closed, ['info']);
    cleanup.forEach(close => close?.());
    assert.equal(listeners.length, 0);
  }
});

test('browsing details stay in the real tab scene and resolved links enter that scene', () => {
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.match(app, /presentation=\{editor \|\| workoutBuilder \? 'modal' : 'inline'\}/);
  assert.match(app, /detailParams.detailKind/);
  assert.match(app, /accessibilityElementsHidden=\{inlineDetailOpen\}/);
  const link = readFileSync('mobile/src/ContentLinkScreen.tsx', 'utf8');
  assert.match(link, /<Redirect/);
  for (const route of ['/(tabs)/flows', '/(tabs)/picks', '/(tabs)/events'])
    assert.ok(link.includes(route));
  assert.doesNotMatch(link, /<BetterHabitsScreen/);
  const layout = readFileSync('mobile/app/(tabs)/_layout.tsx', 'utf8');
  assert.match(layout, /minimizeBehavior="never"/);
  for (const label of ['Home', 'Flows', 'Picks', 'Events', 'You'])
    assert.ok(layout.includes(label));
  const surface = readFileSync('mobile/src/design/DetailSurface.tsx', 'utf8');
  assert.match(surface, /useFocusEffect/);
  assert.match(surface, /back.remove\(\)/);
});

test('active tab press closes the outer detail once, while Back still closes nested information first', () => {
  const { Surface, focusEffects, tabListeners } = harness('ios');
  const closed: string[] = [];
  renderToStaticMarkup(
    React.createElement(
      Surface,
      { presentation: 'inline', fullScreen: true, onClose: () => closed.push('flow') },
      React.createElement(
        Surface,
        { fullScreen: false, onClose: () => closed.push('info') },
        'Benefits',
      ),
    ),
  );
  const cleanup = focusEffects.map(effect => effect());
  assert.equal(tabListeners.length, 1);
  tabListeners[0]();
  assert.deepEqual(closed, ['flow']);
  cleanup.forEach(remove => remove?.());
  assert.equal(tabListeners.length, 0);
});
