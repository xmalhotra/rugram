import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
import {creditCards} from '../shared/credit-cards';
import {cardContentSchema} from '../src/lib/content-validation';
import {cardFeeBand,cardTopics,editorialCardShortlist,newCreditCards,similarFeeCards} from '../shared/card-discovery';
const now=new Date('2026-10-16T12:00:00Z');
test('everyday card records validate and preserve actual reward types and fee conditions',()=>{
  for(const card of creditCards)assert.equal(cardContentSchema.safeParse(card).success,true,card.name);
  const phonepe=creditCards.find(card=>card.id==='phonepe-hdfc-ultimo')!;
  assert.equal(phonepe.annualFee,999);assert.equal(phonepe.benefits[0].kind,'Reward points');assert.equal(phonepe.benefits[0].cashback,undefined);
  assert.equal(creditCards.find(card=>card.id==='amazon-pay-icici')!.annualFee,0);
  const airtel=creditCards.find(card=>card.id==='airtel-axis')!;
  assert.match(airtel.benefits[0].conditions,/other eligible spending/);assert.equal(airtel.benefits[0].tracker,undefined);
});
test('curated topic shortlists are explicit editorial order, not invented market rankings',()=>{
  assert.ok(cardTopics(creditCards).includes('Electricity & bills'));
  assert.deepEqual(editorialCardShortlist(creditCards,'Flipkart',now).map(item=>item.card.id),['flipkart-axis','flipkart-sbi','sbi-cashback']);
  assert.equal(editorialCardShortlist(creditCards,'Amazon',now)[0].card.id,'amazon-pay-icici');
  assert.deepEqual(editorialCardShortlist(creditCards,'Amazon',new Date('2027-10-16')),[]);
  const card=creditCards.find(card=>card.curation)!;
  const custom={...card,id:'custom',curation:{...card.curation!,placements:[{topic:'My purpose',rank:1,reason:'A reviewed editorial reason.'}]}};
  assert.equal(editorialCardShortlist([custom],'My purpose',now)[0].card.id,'custom');
  assert.equal(cardContentSchema.safeParse({...custom,curation:{...custom.curation,placements:[...custom.curation.placements,...custom.curation.placements]}}).success,false);
});
test('same-fee alternatives stay within fee bands, exclude self and stale cards, and share a relevant use',()=>{
  const flipkart=creditCards.find(card=>card.id==='flipkart-axis')!;
  const peers=similarFeeCards(flipkart,creditCards,now);
  assert.deepEqual(peers.map(card=>card.id),['flipkart-sbi']);
  assert.ok(peers.every(card=>card.id!==flipkart.id&&cardFeeBand(card.annualFee)===cardFeeBand(flipkart.annualFee)));
  assert.deepEqual(similarFeeCards(flipkart,creditCards,new Date('2027-10-16')),[]);
  assert.notEqual(cardFeeBand(0),cardFeeBand(500));
});
test('New arrivals requires a confirmed recent launch date; a watchlist label is not a launch date',()=>{
  assert.deepEqual(newCreditCards(creditCards,now),[]);
  const card=creditCards.find(card=>card.curation)!;
  const recent={...card,curation:{...card.curation!,launchedAt:'2026-10-01'}};
  assert.equal(newCreditCards([recent],now).length,1);
  assert.equal(newCreditCards([{...recent,curation:{...recent.curation,launchedAt:'2027-01-01'}}],now).length,0);
});
test('card pages progressively disclose details and support alternative navigation without preserving old scroll',()=>{
  const ui=readFileSync('mobile/src/CreditCardPicks.tsx','utf8');
  assert.match(ui,/Disclosure title="Fees & catches"/);assert.match(ui,/Disclosure key=\{benefit.id\} title=\{benefit.title\}/);
  assert.match(ui,/Similar annual fee/);containsCode(ui,'onPress={()=>onOpen(other)}');
  const app=readFileSync('mobile/App.tsx','utf8');containsCode(app,'contentKey={selectedCard?.id}');containsCode(app,'setCardHistory(previous=>previous.slice(0,-1))');
});
