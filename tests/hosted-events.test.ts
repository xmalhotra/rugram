import assert from 'node:assert/strict';
import test from 'node:test';
import {hostedDemoEvent} from '../shared/hosted-demo-event';
import {hostedEventEditError} from '../shared/event-registration';
import {eventLinkSchema} from '../src/lib/event-validation';

function draft(){
  const {id,capacity,price,createdBy,status,simulation,...input}=hostedDemoEvent();
  void id;void capacity;void price;void createdBy;void status;void simulation;
  return {...input,editorialPriority:{score:3,reason:'A clearly labelled local demonstration event.'}};
}
test('free hosted events do not require a provider URL or organizer website',()=>{
  assert.equal(eventLinkSchema.safeParse(draft()).success,true);
  assert.equal(eventLinkSchema.safeParse({...draft(),entryFee:500}).success,false);
  assert.equal(eventLinkSchema.safeParse({...draft(),guestCapacity:0}).success,false);
  assert.equal(eventLinkSchema.safeParse({...draft(),organizers:[]}).success,false);
});
test('external listings require both a registration link and a source',()=>{
  const external={...draft(),registrationMode:'external',registrationUrl:'https://luma.com/example'};
  assert.equal(eventLinkSchema.safeParse(external).success,false);
  assert.equal(eventLinkSchema.safeParse({...external,sourceUrls:['https://luma.com/example']}).success,true);
});
test('host edits preserve confirmed capacity, registration mode, and terminal cancellation',()=>{
  const event=hostedDemoEvent();
  assert.match(hostedEventEditError(event,{...event,guestCapacity:99},100,101)!,/capacity/);
  assert.match(hostedEventEditError(event,{...event,registrationMode:'external'},0,1)!,/switch/);
  assert.equal(hostedEventEditError(event,{...event,guestCapacity:101},100,101),null);
  assert.match(hostedEventEditError({...event,registrationStatus:'Cancelled'},event,0,0)!,/reopened/);
});
