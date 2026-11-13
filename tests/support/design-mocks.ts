/**
 * Stand-ins for mobile/src/design in tests that load a screen with a hand-made `require`.
 * Tokens are the real values; components are their names, so a test can find them by type.
 */
import * as tokens from '../../mobile/src/design/tokens';

/** The theme module's values without React Native: the real tokens and the iPhone tap size. */
export const designTokens = { ...tokens, hit: tokens.size.hitIos };

const byName = new Proxy({} as Record<string, string>, {
  get: (_target, key) => (typeof key === 'string' && key !== 'then' && key !== '__esModule' ? key : undefined),
});

/** Any design component module (Text, Glyph, components, parts, states): each export is its own name. */
export function designMock(name: string) {
  if (/(^|\/)design\/(Text|Glyph|components|parts|states|PageBar|DetailSurface)$/.test(name)) return byName;
  return undefined;
}
