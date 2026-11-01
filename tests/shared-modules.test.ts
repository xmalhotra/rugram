import test from 'node:test';
import assert from 'node:assert/strict';
import {eventHorizon,eventWithinYear,hostedEventEditError} from '../shared/event-registration';
import {cardWalletSchema} from '../shared/card-wallet-validation';
import {indianMobileInput,indianMobilePhone,mockPhoneAccounts} from '../shared/auth';
import {flowsForFocus,focusIds,focusOptions} from '../shared/focus';
import {hostedDemoEvent} from '../shared/hosted-demo-event';
import {flows} from '../shared/mobile';

test('event horizon is one calendar year and clamps leap days',()=>{
  assert.equal(new Date(eventHorizon(Date.parse('2026-10-21T00:00:00Z'))).toISOString(),'2027-10-21T00:00:00.000Z');
  assert.equal(new Date(eventHorizon(Date.parse('2028-02-29T12:00:00Z'))).toISOString(),'2029-02-28T12:00:00.000Z');
  const now=Date.parse('2026-10-21T00:00:00Z');
  assert.equal(eventWithinYear('2026-10-20T23:59:00Z',now),false);
  assert.equal(eventWithinYear('2027-10-21T00:00:00Z',now),true);
  assert.equal(eventWithinYear('2027-10-21T00:00:01Z',now),false);
  assert.equal(eventWithinYear('not a date',now),false);
});

test('hosted event edits protect registrations, capacity and cancellation',()=>{
  const event=hostedDemoEvent(Date.parse('2026-10-21T00:00:00Z'));
  assert.equal(hostedEventEditError(event,{...event,title:'Renamed'},3,5),null);
  assert.match(hostedEventEditError(event,{...event,registrationMode:'external'},0,1)!,/cannot switch/);
  assert.equal(hostedEventEditError(event,{...event,registrationMode:'external'},0,0),null);
  assert.match(hostedEventEditError(event,{...event,guestCapacity:2},3,3)!,/capacity cannot be lower/);
  assert.match(hostedEventEditError({...event,registrationStatus:'Cancelled'},{...event,registrationStatus:'Waitlist'},0,0)!,/cannot be reopened/);
  assert.equal(hostedEventEditError({...event,registrationMode:'external'},{...event,guestCapacity:0},5,5),null);
});

test('hosted demo event is clearly labelled and inside the booking horizon',()=>{
  const now=Date.parse('2026-10-21T00:00:00Z');const event=hostedDemoEvent(now);
  assert.match(event.title,/^DEMO/);assert.equal(event.registrationMode,'approval');assert.equal(event.price,0);
  assert.ok(eventWithinYear(event.startsAt,now));assert.ok(Date.parse(event.endsAt!)>Date.parse(event.startsAt));
});

test('card wallet actions are strict',()=>{
  assert.equal(cardWalletSchema.safeParse({action:'card-owned',id:'hdfc-millennia',enabled:true}).success,true);
  assert.equal(cardWalletSchema.safeParse({action:'card-fee',id:'x',annualFee:null}).success,true);
  assert.equal(cardWalletSchema.safeParse({action:'card-fee',id:'x',annualFee:-1}).success,false);
  assert.equal(cardWalletSchema.safeParse({action:'card-owned',id:'x',enabled:true,extra:1}).success,false);
  assert.equal(cardWalletSchema.safeParse({action:'card-usage',id:'x',benefitId:'b',used:1,eligible:true,start:'2026-10-01',end:'2026/10/31'}).success,false);
  assert.equal(cardWalletSchema.safeParse({action:'card-delete',id:'x'}).success,false);
});

test('Indian mobile input and reserved demo accounts',()=>{
  assert.equal(indianMobileInput('+91 98765 43210'),'9876543210');
  assert.equal(indianMobileInput('98765432109999'),'9876543210');
  assert.equal(indianMobilePhone('9876543210'),'+919876543210');
  assert.equal(indianMobilePhone('5876543210'),null);
  assert.equal(new Set(mockPhoneAccounts.map(account=>account.phone)).size,mockPhoneAccounts.length);
  assert.ok(mockPhoneAccounts.every(account=>/^\+120255501\d\d$/.test(account.phone)),'Demo numbers stay in the reserved fictional range');
});

test('every focus references available flows',()=>{
  assert.deepEqual(focusIds,focusOptions.map(option=>option.id));
  for(const option of focusOptions){
    const selected=flowsForFocus(flows,option.id);
    assert.ok(selected.length>0,option.id);
    assert.ok(selected.every(flow=>(option.flowIds as readonly string[]).includes(flow.id)),option.id);
  }
  assert.deepEqual(flowsForFocus(flows,'unknown-focus'),[]);
});
