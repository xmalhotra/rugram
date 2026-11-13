import assert from 'node:assert/strict';
import test from 'node:test';
import {benefitPeriod,benefitRemaining,creditCards,indiaDay,type BenefitUsage} from '../shared/credit-cards';
import {cardWalletSchema} from '../shared/card-wallet-validation';
import {flows} from '../shared/mobile';
const now=new Date('2026-10-15T12:00:00Z');const axis=creditCards[0];const lounge=axis.benefits.find(benefit=>benefit.id==='domestic-lounge')!;
const usage:BenefitUsage={used:1,eligible:true,start:'2026-10-01',end:'2026-12-31',termsVersion:axis.revision,checkedAt:now.toISOString()};
test('credit cards are a separate Picks catalogue, not habits or retail products',()=>{
  assert.equal(creditCards.length,9);assert.equal(new Set(creditCards.map(card=>card.id)).size,9);
  for(const card of creditCards){assert.equal(new URL(card.sourceUrl).protocol,'https:');assert.ok(card.feeNote&&card.waiver&&card.checkedAt);assert.ok(card.benefits.every(benefit=>benefit.conditions&&benefit.sourceUrl));assert.ok(!flows.some(flow=>flow.id===card.id));}
  assert.equal(creditCards[2].joiningFee,null);assert.ok(axis.reviewNote);
});
test('India calendar months and quarters respect boundaries and leap years',()=>{
  assert.equal(indiaDay(new Date('2026-03-31T19:00:00Z')),'2026-04-01');
  assert.deepEqual(benefitPeriod('quarter',now),{start:'2026-10-01',end:'2026-12-31'});
  assert.deepEqual(benefitPeriod('month',new Date('2028-02-10')),{start:'2028-02-01',end:'2028-02-29'});
  assert.deepEqual(benefitPeriod('quarter',new Date('2027-01-01')),{start:'2027-01-01',end:'2027-03-31'});
});
test('billing cycles are entered explicitly and never silently replaced with calendar months',()=>{
  assert.equal(benefitPeriod('billing-cycle',now),null);
  const cycle={start:'2026-09-26',end:'2026-10-25'};assert.deepEqual(benefitPeriod('billing-cycle',now,cycle),cycle);
  for(const invalid of [{start:'2026-09-01',end:'2026-12-01'},{start:'2026-11-01',end:'2026-11-30'},{start:'2026-02-31',end:'2026-10-31'}])assert.equal(benefitPeriod('billing-cycle',now,invalid),null);
});
test('lounge remaining is unknown without eligibility, a current period and matching terms',()=>{
  assert.equal(benefitRemaining(axis,lounge,undefined,now),null);
  assert.equal(benefitRemaining(axis,lounge,usage,now),1);
  for(const change of [{eligible:false},{termsVersion:'outdated'},{start:'2026-07-01',end:'2026-09-30'},{used:3},{used:.5}])assert.equal(benefitRemaining(axis,lounge,{...usage,...change},now),null);
  assert.equal(benefitRemaining(axis,lounge,usage,new Date('2027-01-01')),null);
});
test('cashback caps use currency and fuel points do not become cash automatically',()=>{
  const swiggy=creditCards[1];const benefit=swiggy.benefits[0];const entry={...usage,start:'2026-09-26',end:'2026-10-25',used:300,termsVersion:swiggy.revision};
  assert.equal(benefitRemaining(swiggy,benefit,entry,now),1200);assert.equal(benefit.tracker?.period,'billing-cycle');
  assert.equal(creditCards[2].benefits[0].kind,'Reward points');assert.equal(creditCards[2].benefits[0].tracker?.unit,'points');
  assert.match(swiggy.benefits[1].conditions,/Not all online/);
});
test('wallet API accepts only card types and bounded records, rejecting payment credentials',()=>{
  assert.equal(cardWalletSchema.safeParse({action:'card-owned',id:axis.id,enabled:true}).success,true);
  assert.equal(cardWalletSchema.safeParse({action:'card-owned',id:axis.id,enabled:true,cardNumber:'4111111111111111'}).success,false);
  assert.equal(cardWalletSchema.safeParse({action:'card-fee',id:axis.id,annualFee:0}).success,true);
  assert.equal(cardWalletSchema.safeParse({action:'card-fee',id:axis.id,annualFee:-1}).success,false);
});
