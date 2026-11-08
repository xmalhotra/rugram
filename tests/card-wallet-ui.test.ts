import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';

test('a held card keeps ownership, fee and usage actions, and removal still asks first',()=>{
  const source=readFileSync('mobile/src/CreditCardPicks.tsx','utf8');
  containsCode(source,"action: 'card-owned', id: card.id, enabled: !wallet");
  assert.match(source,/Add to my cards/);
  assert.match(source,/✓ In my cards/);
  containsCode(source,"action: 'card-fee'");
  containsCode(source,"action: 'card-usage'");
  assert.match(source,/function BenefitTracker/);
  assert.doesNotMatch(source,/export function CreditCardPicks|CreditCardShowcase|Eligible spend per statement cycle|setSpend|compareCardReturns/);
  const app=readFileSync('mobile/App.tsx','utf8');
  assert.match(app,/onCardChange=\{cardChange\}/);
  assert.match(app,/Remove this card\?/);
});

test('adding a card is wired to the persisted wallet action, not a local-only selection',()=>{
  const app=readFileSync('mobile/App.tsx','utf8');
  assert.match(app,/onCardChange=\{cardChange\}/);
  assert.match(app,/onAddCard=\{\(\) => setPicksTab\('products'\)\}/);
});
