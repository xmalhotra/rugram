import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creditCards} from '../shared/credit-cards';
import {cardReturn,compareCardReturns} from '../shared/card-comparison';
import {cardContentSchema} from '../src/lib/content-validation';
const now=new Date('2026-10-16T12:00:00Z');const sbi=creditCards.find(card=>card.id==='sbi-cashback')!;const swiggy=creditCards.find(card=>card.id==='hdfc-swiggy-blck')!;
test('Picks compares published terms without asking for spend or assuming a user budget',()=>{
  const ui=readFileSync('mobile/src/CardComparison.tsx','utf8');
  assert.doesNotMatch(ui,/Eligible spend per statement cycle|setSpend|compareCardReturns|Higher estimated net|12-cycle net|Back \/ cycle/);
  for(const label of ['Cashback rate','Benefit cap','Annual fee','Main trade-off','Eligibility, waivers & sources'])assert.ok(ui.includes(label));
});
test('cashback comparison respects revised issuer caps and subtracts renewal fee once',()=>{
  assert.equal(cardReturn(sbi,'Online shopping',5000,999,now)?.perCycle,250);
  assert.equal(cardReturn(sbi,'Online shopping',60000,999,now)?.perCycle,2000);
  assert.equal(cardReturn(swiggy,'Online shopping',60000,1000,now)?.perCycle,1500);
  assert.equal(cardReturn(sbi,'Online shopping',60000,999,now)?.annualNet,23001);
  assert.equal(cardReturn(swiggy,'Food & Instamart',15000,1000,now)?.perCycle,1500);
  assert.equal(cardReturn(swiggy,'Online shopping',99,1000,now)?.perCycle,0);
});
test('the lead follows the scenario, not editorial placement; near ties and insufficient comparisons do not force a winner',()=>{
  assert.equal(compareCardReturns([swiggy,sbi],'Online shopping',5000,{},now).leader,null);
  assert.equal(compareCardReturns([swiggy,sbi],'Online shopping',40000,{},now).leader,sbi.id);
  assert.equal(compareCardReturns([sbi,swiggy],'Food & Instamart',5000,{},now).leader,null);
  assert.equal(cardReturn(sbi,'Online shopping',0,999,now)?.annualNet,-999);
  assert.equal(cardReturn(sbi,'Online shopping',5000,0,now)?.annualNet,3000);
});
test('points and discounts are never cash estimates; stale, invalid and future rules stay unknown',()=>{
  for(const card of creditCards.filter(card=>card.id==='axis-select'||card.id==='rbl-indianoil-xtra'))assert.equal(cardReturn(card,card.benefits[0].category,5000,card.annualFee,now),null);
  assert.equal(cardReturn(sbi,'Online shopping',5000,999,new Date('2027-04-01')),null);
  assert.equal(cardReturn({...sbi,checkedAt:'2027-10-01'},'Online shopping',5000,999,now),null);
  assert.equal(cardReturn(sbi,'Online shopping',NaN,999,now),null);
  assert.equal(cardReturn(sbi,'Online shopping',-1,999,now),null);
});
test('admin card schema preserves comparison rules and rejects disguised reward-point cashback',()=>{
  assert.equal(cardContentSchema.parse(sbi).benefits[0].cashback?.rate,5);
  assert.equal(cardContentSchema.safeParse({...sbi,benefits:[{...sbi.benefits[0],kind:'Reward points'}]}).success,false);
  assert.equal(cardContentSchema.safeParse({...sbi,benefits:[{...sbi.benefits[0],cashback:{rate:200,minimumTransaction:0}}]}).success,false);
});
