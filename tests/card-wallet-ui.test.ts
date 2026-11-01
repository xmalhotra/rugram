import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';

test('credit card discovery opens with reviewed cards; My Cards stays a simple ownership list',()=>{
  const source=readFileSync('mobile/src/CreditCardPicks.tsx','utf8');
  const browse=source.slice(source.indexOf('export function CreditCardPicks'),source.indexOf('export function CreditCardDetails'));
  containsCode(browse,"useState<'discover'|'owned'|'add'>('discover')");
  containsCode(browse,"view==='discover'?'Credit cards':view==='add'?'Add cards':'My Cards'");
  containsCode(browse,'<CreditCardShowcase cards={catalogue} wallet={owned}');
  assert.doesNotMatch(browse,/CardResearchBrowser/);
  assert.match(browse,/title="\+ Add cards"/);
  containsCode(browse,'catalogue.filter(card=>Boolean(owned[card.id]))');
  assert.match(browse,/No cards added yet/);
  assert.match(browse,/card\.issuer/);
  assert.match(browse,/card\.name/);
  containsCode(browse,"action:'card-owned',id:card.id,enabled:true");
  containsCode(browse,"owned[card.id]?'Added'");
  assert.doesNotMatch(browse,/CardComparison|Compare cards|BenefitTracker|setSpend|Eligible spend per statement cycle/);
  const ownership=browse.slice(browse.indexOf('{cards.map'));
  assert.doesNotMatch(ownership,/rankedCardOptions|card\.benefits|annualFee|Why consider it/);
});

test('adding a card is wired to the persisted wallet action, not a local-only selection',()=>{
  const app=readFileSync('mobile/App.tsx','utf8');
  const picks=readFileSync('mobile/src/PicksBrowser.tsx','utf8');
  assert.match(app,/onCardChange=\{cardChange\}/);
  containsCode(picks,'<CreditCardPicks data={data} busy={busy} onOpen={onCard} onChange={onCardChange} onLink={onLink}');
});
