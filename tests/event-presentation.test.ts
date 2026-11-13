import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationPresentation} from '../shared/event-presentation';
import type {CityEvent} from '../shared/mobile';
import type {EventRegistrationView} from '../shared/event-registration';
const now=Date.parse('2026-10-16T12:00:00Z');
const event={id:'test',status:'published',registrationMode:'approval',registrationStatus:'Registration link available',guestCapacity:2,startsAt:new Date(now+86400000).toISOString(),endsAt:new Date(now+90000000).toISOString()} as CityEvent;
const base:EventRegistrationView={mode:'approval',ownStatus:null,approvedCount:0,canManage:false,canViewAttendees:false,guests:[],requests:[],note:''};
test('registration presents request, pending, approved, withdrawn and declined distinctly',()=>{
  assert.equal(registrationPresentation(event,base,now).canRequest,true);
  const pending=registrationPresentation(event,{...base,ownStatus:'pending'},now);assert.equal(pending.title,'Request sent');assert.equal(pending.canRequest,false);assert.equal(pending.canCancel,true);
  assert.equal(registrationPresentation(event,{...base,ownStatus:'approved'},now).title,'You’re going');
  assert.equal(registrationPresentation(event,{...base,ownStatus:'cancelled'},now).action,'Request again');
  assert.equal(registrationPresentation(event,{...base,ownStatus:'declined'},now).canRequest,false);
});
test('full events block new requests but retain an approved guest’s place and pending requests',()=>{
  assert.equal(registrationPresentation(event,{...base,approvedCount:2},now).title,'Event full');
  assert.equal(registrationPresentation(event,{...base,approvedCount:2,ownStatus:'approved'},now).title,'You’re going');
  assert.equal(registrationPresentation(event,{...base,approvedCount:2,ownStatus:'pending'},now).title,'Request sent');
});
test('unpublished, cancelled, closed, expired and not-yet-open events cannot accept requests',()=>{
  for(const registrationStatus of ['Cancelled','Closed','Sold out','Tickets coming soon'] as const)assert.equal(registrationPresentation({...event,registrationStatus},base,now).canRequest,false);
  assert.equal(registrationPresentation({...event,status:'pending'},base,now).canRequest,false);
  assert.equal(registrationPresentation({...event,registrationClosesAt:new Date(now-1).toISOString()},base,now).canRequest,false);
  assert.equal(registrationPresentation({...event,startsAt:new Date(now-1000).toISOString()},base,now).title,'Event has started');
  assert.equal(registrationPresentation({...event,endsAt:new Date(now-1).toISOString()},base,now).title,'Event ended');
  assert.equal(registrationPresentation({...event,registrationStatus:'Cancelled'},{...base,ownStatus:'approved'},now).title,'Event cancelled');
});
