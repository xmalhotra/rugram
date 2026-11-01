import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardResearchSeeds} from '../shared/card-research-seeds';
import {cardOfferState,filterCardListings} from '../shared/card-research';
import {cardIssuerSchema,cardListingSchema,cardPlatformSchema,cardOfferSchema} from '../src/lib/card-research-validation';
const now=Date.parse('2026-10-16T18:00:00Z');
test('research inventory is source-tracked and honest about incomplete coverage and unknown fees',()=>{
  const data=cardResearchSeeds;assert.ok(data.listings.length>250);assert.equal(data.issuers.length,30);
  assert.equal(new Set(data.listings.map(item=>item.id)).size,data.listings.length);
  for(const item of data.listings){assert.equal(cardListingSchema.safeParse(item).success,true,item.id);assert.ok(data.issuers.some(issuer=>issuer.id===item.issuerId));assert.equal(item.annualFee,null);assert.equal(item.joiningFee,null);}
  for(const item of data.issuers)assert.equal(cardIssuerSchema.safeParse(item).success,true,item.id);
  assert.ok(data.issuers.some(item=>item.coverage==='blocked'));
  const filtered=filterCardListings(data.listings);assert.ok(filtered.length<data.listings.length);assert.ok(filtered.every(item=>!['legacy','discontinued','paused'].includes(item.availability)));
  assert.equal(data.listings.filter(item=>item.issuerId==='amex').length,6);assert.ok(data.listings.filter(item=>item.issuerId==='amex').every(item=>item.availability==='paused'));
  assert.ok(filterCardListings(data.listings,'sbi','bpcl').every(item=>item.issuerId==='sbi'&&/bpcl/i.test(item.title)));
  assert.deepEqual(filterCardListings(data.listings,'missing-issuer'),[]);
});
test('every requested platform has a collection target; missing offers are not a zero-savings assertion',()=>{
  for(const id of ['amazon','flipkart','instamart','zomato','blinkit','swiggy','tata-1mg','bigbasket','jiomart','bookmyshow','district','makemytrip','goibibo','rapido','uber','ola'])assert.ok(cardResearchSeeds.platforms.some(item=>item.id===id),id);
  for(const platform of cardResearchSeeds.platforms)assert.equal(cardPlatformSchema.safeParse(platform).success,true,platform.id);
  for(const offer of cardResearchSeeds.offers){assert.equal(cardOfferSchema.safeParse(offer).success,true,offer.id);assert.ok(cardResearchSeeds.platforms.some(item=>item.id===offer.platformId));assert.ok(cardResearchSeeds.issuers.some(item=>item.id===offer.issuerId));}
});
test('expired, stale, future, voucher and points offers cannot masquerade as guaranteed cumulative cashback',()=>{
  const historical=cardResearchSeeds.offers.find(item=>item.id==='flipkart-sbi-aug26-expired')!;assert.equal(cardOfferState(historical,now),'expired');
  const current=cardResearchSeeds.offers.find(item=>item.id==='amazon-sbi-oct26')!;assert.equal(cardOfferState(current,now),'needs-review');assert.equal(current.paymentRoute,'emi');assert.ok(current.excludedCards.includes('CASHBACK SBI Card'));
  const points=cardResearchSeeds.offers.find(item=>item.benefitType==='points')!;assert.equal(points.ratePercent,null);assert.equal(cardOfferSchema.safeParse({...points,ratePercent:5}).success,false);
  const reviewed={...current,termsStatus:'reviewed' as const};assert.equal(cardOfferState(reviewed,now),'in-window');assert.equal(cardOfferState({...reviewed,checkedAt:'2026-09-01T00:00:00Z'},now),'needs-review');assert.equal(cardOfferSchema.safeParse({...reviewed,startsAt:null}).success,false);
  assert.ok(cardResearchSeeds.offers.every(item=>item.stacking==='unknown'));
  const shared=cardResearchSeeds.offers.filter(item=>item.sharedCapKey);assert.equal(shared.length,2);assert.equal(new Set(shared.map(item=>item.sharedCapKey)).size,1);
});
test('consumer catalogue and offer research remain admin-managed rather than only bundled static UI data',()=>{
  const source=readFileSync('src/lib/admin-content-store.ts','utf8');for(const kind of ['cardIssuer','cardListing','cardPlatform','cardOffer'])assert.match(source,new RegExp(`apply\\('${kind}'`));
  const ui=readFileSync('mobile/src/CardResearchBrowser.tsx','utf8');assert.match(ui,/research\.listings/);assert.match(ui,/slice\(0,\s*limit\)/);assert.match(ui,/Offer collection pending/);assert.match(ui,/Unknown is not free/);assert.match(ui,/completeness|Completeness/);
});
