import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { containsCode } from './source-assertions';
import { deckPage } from '../shared/swipe-deck';
test('swipe pages clamp bounce and invalid layout without wrapping', () => {
  assert.equal(deckPage(0, 390, 3), 0);
  assert.equal(deckPage(390, 390, 3), 1);
  assert.equal(deckPage(780, 390, 3), 2);
  assert.equal(deckPage(-500, 390, 3), 0);
  assert.equal(deckPage(5000, 390, 3), 2);
  for (const [offset, width, count] of [
    [NaN, 390, 3],
    [1, 0, 3],
    [1, Infinity, 3],
    [1, 390, 0],
    [1, 390, NaN],
  ])
    assert.equal(deckPage(offset, width, count), 0);
});
test('detail deck uses native paging, independent vertical reading and a fixed action footer', () => {
  const ui = readFileSync('mobile/src/SwipeDeck.tsx', 'utf8');
  containsCode(ui, 'horizontal pagingEnabled');
  assert.match(ui, /onMomentumScrollEnd=\{settle\}/);
  assert.match(ui, /onAccessibilityAction/);
  containsCode(ui, 'accessibilityState={{selected:index===position}}');
  containsCode(ui, "height:'100%'");
  containsCode(ui, '<ScrollView showsVerticalScrollIndicator');
  assert.ok(ui.indexOf('{footer}') > ui.indexOf('</ScrollView>'));
  const sheet = readFileSync('mobile/src/design/components.shared.tsx', 'utf8');
  assert.match(sheet, /scrollable\?<ScrollView/);
  assert.match(sheet, /<DetailSurface/);
  const surface = readFileSync('mobile/src/design/DetailSurface.tsx', 'utf8');
  containsCode(surface, "fullScreen?'fullScreen':'pageSheet'");
});
test('Picks and card details read as one scrolling page and every Flow uses cards containing visual frames', () => {
  const picks = readFileSync('mobile/src/PickDetails.tsx', 'utf8');
  assert.doesNotMatch(picks, /<SwipeDeck|<DeckPage/);
  assert.match(picks, /details\s*&&\s*\(?\s*<Sheet/);
  const cardUi = readFileSync('mobile/src/CreditCardPicks.tsx', 'utf8');
  assert.doesNotMatch(cardUi, /<SwipeDeck|<DeckPage/);
  assert.match(cardUi, /At a glance/);
  const flow = readFileSync('mobile/src/FlowDetails.tsx', 'utf8');
  assert.match(flow, /resolveVisualFlow\(flow, data.flows\)/);
  assert.match(flow, /<AnimalMovementDeck/);
  assert.doesNotMatch(flow, /<SwipeDeck|<DeckPage/);
  const card = readFileSync('mobile/src/CreditCardPicks.tsx', 'utf8');
  assert.match(card, /Benefits/);
  assert.match(card, /Verify current issuer terms/);
});
test('saved flow action opens Home instead of looking like a disabled add button', () => {
  const action = readFileSync('mobile/src/FlowHomeAction.tsx', 'utf8');
  assert.match(action, /added\?'View on Home →':'Add to Home'/);
  assert.match(action, /onPress=\{added\?onHome:onAdd\}/);
  assert.match(action, /disabled=\{busy\}/);
  assert.match(action, /minHeight:56/);
  assert.doesNotMatch(action, /SwiftButton|<Host|disabled=\{[^}]*added/);
  const surface = readFileSync('mobile/src/design/DetailSurface.tsx', 'utf8');
  containsCode(
    surface,
    '<SafeAreaProvider initialMetrics={fullScreen?initialWindowMetrics:undefined}>',
  );
  const flow = readFileSync('mobile/src/FlowDetails.tsx', 'utf8');
  assert.match(flow, /<FlowHomeAction/);
  const app = readFileSync('mobile/App.tsx', 'utf8');
  containsCode(
    app,
    "onHome={()=>{setSelectedFlow(null);setFlowReturn(null);router.navigate('/(tabs)');}}",
  );
});
