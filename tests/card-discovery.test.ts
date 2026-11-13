import test from 'node:test';
import assert from 'node:assert/strict';
import {creditCards,type CreditCard,type CardWallet} from '../shared/credit-cards';
import {rankedCardOptions,cardAlternatives} from '../shared/card-discovery';
const now=new Date('2026-10-16T12:00:00Z');
const sbi=creditCards.find(card=>card.id==='sbi-cashback')!;
const swiggy=creditCards.find(card=>card.id==='hdfc-swiggy-blck')!;
const owns=(...ids:string[]):CardWallet=>Object.fromEntries(ids.map(id=>[id,{usage:{}}]));
test('public ranking compares same-category cashback terms without inventing a spending budget',()=>{
  const result=rankedCardOptions(creditCards,'Online shopping',{},now);
  assert.deepEqual(result.ranked.map(entry=>entry.card.id),[sbi.id,swiggy.id]);
  assert.equal(result.ranked[0].rate,5);assert.equal(result.ranked[0].cap,2000);
  assert.equal('annualNet' in result.ranked[0],false);
  assert.deepEqual(rankedCardOptions(creditCards,'Food & Instamart',{},now).ranked.map(entry=>entry.card.id),[swiggy.id]);
});
test('points, discounts, stale models and unrelated cards are never assigned zero-value ranks',()=>{
  assert.equal(rankedCardOptions(creditCards,'Fuel',{},now).ranked.length,0);
  assert.equal(rankedCardOptions(creditCards,'Fuel',{},now).other.length,1);
  assert.equal(rankedCardOptions(creditCards,'Groceries',{},now).ranked.length,0);
  assert.equal(rankedCardOptions(creditCards,'Online shopping',{},new Date('2027-10-16')).ranked.length,0);
  assert.equal(rankedCardOptions([{...sbi,annualFee:-1}],'Online shopping',{},now).ranked.length,0);
});
test('alternatives require ownership and a meaningful non-inferior set of comparable terms',()=>{
  assert.deepEqual(cardAlternatives(creditCards,{},'Online shopping',now),[]);
  const result=cardAlternatives(creditCards,owns(swiggy.id),'Online shopping',now);
  assert.equal(result.length,1);assert.equal(result[0].candidate.card.id,sbi.id);assert.equal(result[0].baseline.card.id,swiggy.id);
  assert.deepEqual(cardAlternatives(creditCards,owns(sbi.id),'Online shopping',now),[]);
  assert.deepEqual(cardAlternatives(creditCards,owns(sbi.id,swiggy.id),'Online shopping',now),[]);
  const equivalent={...sbi,id:'equivalent'};
  assert.deepEqual(cardAlternatives([...creditCards,equivalent],owns(equivalent.id,swiggy.id),'Online shopping',now),[]);
  assert.deepEqual(cardAlternatives(creditCards,owns('axis-select'),'Online shopping',now),[]);
  assert.deepEqual(cardAlternatives(creditCards,{[swiggy.id]:{usage:{},annualFeeOverride:0}},'Online shopping',now),[]);
});
test('a headline rate cannot justify an upgrade with a worse cap, fee or minimum transaction',()=>{
  const current:CreditCard={...sbi,id:'current'};
  for(const change of [{annualFee:2000},{benefits:sbi.benefits.map(benefit=>({...benefit,tracker:{...benefit.tracker!,limit:100}}))},{benefits:sbi.benefits.map(benefit=>({...benefit,cashback:{...benefit.cashback!,minimumTransaction:999}}))}]){
    const candidate={...sbi,id:'candidate',...change};
    assert.deepEqual(cardAlternatives([current,candidate],owns(current.id),'Online shopping',now),[]);
  }
  const tinyFeeDifference={...sbi,id:'tiny-fee',annualFee:998};
  assert.deepEqual(cardAlternatives([current,tinyFeeDifference],owns(current.id),'Online shopping',now),[]);
});
