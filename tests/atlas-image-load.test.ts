import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

type Result = {
  key: string;
  ready: boolean;
  failed: boolean;
  slow: boolean;
  reason?: string;
  onLoad: () => void;
  onError: (event: { nativeEvent: { error: string } }) => void;
  retry: () => void;
};
function harness() {
  const states: unknown[] = [],
    refs: { current: unknown }[] = [];
  const effects: (() => unknown)[] = [];
  const timers = new Map<number, () => void>();
  const prefetched: string[] = [];
  let stateIndex = 0,
    refIndex = 0,
    timerId = 0;
  const loaded = { exports: {} as { useAtlasImage: (source: number, identity: string) => Result } };
  const code = ts.transpileModule(readFileSync('mobile/src/useAtlasImage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code)(
    (name: string) => {
      if (name === 'react')
        return {
          useState: (initial: unknown) => {
            const i = stateIndex++;
            if (!(i in states)) states[i] = initial;
            return [
              states[i],
              (value: unknown) => {
                states[i] = typeof value === 'function' ? value(states[i]) : value;
              },
            ];
          },
          useRef: (initial: unknown) =>
            refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
          useEffect: (effect: () => unknown) => effects.push(effect),
        };
      if (name === 'react-native')
        return {
          Image: {
            resolveAssetSource: (source: number) => ({
              uri: source === 99 ? 'file:///bundled.png' : `http://lan/assets/${source}`,
            }),
            prefetch: async (uri: string) => {
              prefetched.push(uri);
              return true;
            },
          },
        };
      throw new Error(name);
    },
    loaded,
    loaded.exports,
    (callback: () => void) => {
      timers.set(++timerId, callback);
      return timerId;
    },
    (id: number) => timers.delete(id),
  );
  return {
    render(source = 1, identity = 'atlas:male') {
      stateIndex = 0;
      refIndex = 0;
      return loaded.exports.useAtlasImage(source, identity);
    },
    effects() {
      effects.splice(0).forEach(effect => effect());
    },
    expire() {
      [...timers.values()].forEach(callback => callback());
      timers.clear();
    },
    prefetched,
  };
}

test('cached image success before effects stays ready, including after the slow timer', () => {
  const h = harness();
  const image = h.render();
  image.onLoad();
  h.effects();
  h.expire();
  assert.equal(h.render().ready, true);
});
test('a timeout is slow, not an image failure, and a late successful load recovers', () => {
  const h = harness();
  const image = h.render();
  h.effects();
  h.expire();
  assert.equal(h.render().slow, true);
  assert.equal(h.render().failed, false);
  image.onLoad();
  assert.equal(h.render().ready, true);
});
test('old gender requests cannot overwrite the new appearance, and Retry gets its own key', () => {
  const h = harness();
  const old = h.render();
  const current = h.render(2, 'atlas:female');
  current.onLoad();
  old.onError({ nativeEvent: { error: 'stale failure' } });
  assert.equal(h.render(2, 'atlas:female').ready, true);
  current.retry();
  const retry = h.render(2, 'atlas:female');
  assert.notEqual(retry.key, current.key);
  assert.equal(retry.ready, false);
  current.onLoad();
  assert.equal(h.render(2, 'atlas:female').ready, false);
  retry.onError({ nativeEvent: { error: 'native decoder failed' } });
  const failed = h.render(2, 'atlas:female');
  assert.equal(failed.failed, true);
  assert.equal(failed.reason, 'native decoder failed');
});
test('only Expo development HTTP assets are prefetched; installed resources need no download', () => {
  const h = harness();
  h.render();
  h.effects();
  assert.deepEqual(h.prefetched, ['http://lan/assets/1']);
  const installed = harness();
  installed.render(99);
  installed.effects();
  assert.deepEqual(installed.prefetched, []);
});
