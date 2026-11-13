import assert from 'node:assert/strict';
import test from 'node:test';
import {creatorEventQuota,eventMonth} from '../shared/creator-events';
import {creatorEventSchema,eventLinkSchema} from '../src/lib/event-validation';
test('creator allowance defaults to two, can be disabled, and never reports negative remaining slots',()=>{
  assert.equal(creatorEventQuota(undefined,0).remaining,2);
  assert.equal(creatorEventQuota(0,0).remaining,0);
  assert.equal(creatorEventQuota(1,2).remaining,0);
  assert.equal(creatorEventQuota(5,2).remaining,3);
});
test('event quota resets at India midnight rather than UTC or a rolling 30-day window',()=>{
  assert.equal(eventMonth(Date.parse('2026-10-31T18:29:59.999Z')).key,'2026-10');
  assert.deepEqual(eventMonth(Date.parse('2026-10-31T18:30:00.000Z')),{key:'2026-11',start:'2026-10-31T18:30:00.000Z',end:'2026-11-30T18:30:00.000Z'});
  assert.equal(eventMonth(Date.parse('2026-12-31T18:30:00Z')).end,'2027-01-31T18:30:00.000Z');
});
test('creator submissions cannot assign editorial scores or publication/ownership fields',()=>{
  const event={title:'Isolated creator fixture',city:'Hyderabad',country:'IN',topic:'Tech',venue:'Test venue',startsAt:new Date(Date.now()+86400000).toISOString(),description:'Test source-linked event submission.',registrationUrl:'https://luma.com/test',sourceUrls:['https://luma.com/test'],checkedAt:new Date().toISOString(),registrationClosesAt:null,entryFee:null,feeNote:'Not verified.',registrationStatus:'Check provider',audience:'Test audience',outcomes:['Test expected benefit.']};
  assert.equal(creatorEventSchema.safeParse(event).success,true);
  assert.equal(eventLinkSchema.safeParse(event).success,false);
  for(const extra of [{status:'published'},{createdBy:'admin'},{listedAt:'2000-01-01T00:00:00.000Z'},{editorialPriority:{score:5,reason:'My own high rating.'}},{creatorMonthlyEventLimit:999}])assert.equal(creatorEventSchema.safeParse({...event,...extra}).success,false);
});
