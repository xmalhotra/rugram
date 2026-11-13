import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

/** Executes startup logic with mocked sensor APIs; does not validate physical-phone motion. */
async function startup({ available = true, granted = true, reducedMotion = false } = {}) {
  const require = createRequire(import.meta.url);
  const statuses: unknown[] = [];
  const effects: (() => () => void)[] = [];
  let stateIndex = 0;
  const loaded = {
    exports: {} as {
      useMovementTilt: (
        progress: number,
        change: (value: number) => void,
        selected: boolean,
      ) => unknown;
    },
  };
  const code = ts.transpileModule(readFileSync('mobile/src/useMovementTilt.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    (name: string) => {
      if (name === 'react')
        return {
          useState: (initial: unknown) => {
            const index = stateIndex++;
            return [
              initial,
              (next: unknown) => {
                if (index === 1) statuses.push(next);
              },
            ];
          },
          useRef: (current: unknown) => ({ current }),
          useEffect: () => {},
          useCallback: (callback: unknown) => callback,
        };
      if (name === 'expo-router')
        return { useFocusEffect: (effect: () => () => void) => effects.push(effect) };
      if (name === 'react-native')
        return {
          AccessibilityInfo: { isReduceMotionEnabled: async () => reducedMotion },
          AppState: { currentState: 'active' },
        };
      if (name === 'expo-sensors')
        return {
          DeviceMotion: {
            isAvailableAsync: async () => available,
            getPermissionsAsync: async () => ({ granted, canAskAgain: false }),
          },
        };
      if (name === '../../shared/movement-viewer') return require('../shared/movement-viewer');
      return require(name);
    },
    loaded,
    loaded.exports,
  );
  loaded.exports.useMovementTilt(0, () => {}, true);
  const cleanup = effects[0]();
  // Flush the bounded async availability + permission checks, without timers or device calls.
  for (let n = 0; n < 8; n++) await Promise.resolve();
  cleanup();
  return statuses;
}

test('successful tilt startup/resume is silent rather than publishing Tilt on', async () => {
  assert.deepEqual(await startup(), [null]);
  assert.doesNotMatch(
    readFileSync('mobile/src/useMovementTilt.ts', 'utf8'),
    /setStatus\(['"]Tilt on['"]\)/i,
  );
});

test('actionable motion diagnostics are retained for the information panel', async () => {
  assert.deepEqual(await startup({ available: false }), ['Tilt unavailable · use slider']);
  assert.deepEqual(await startup({ granted: false }), ['Allow Motion in Settings']);
  assert.deepEqual(await startup({ reducedMotion: true }), ['Reduce Motion is on']);
});

test('swipe pages clip adjacent card content', () => {
  const deck = readFileSync('mobile/src/AnimalMovementDeck.tsx', 'utf8');
  assert.match(deck, /width, height, overflow: 'hidden'/);
  assert.match(deck, /marginHorizontal: -space\.lg/);
});
