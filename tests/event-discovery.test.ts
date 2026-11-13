import assert from 'node:assert/strict';
import test from 'node:test';
import {discoverEvents,eventDirectories,eventProvider,eventTopics,eventWebsite} from '../shared/event-discovery';
import {eventLinkSchema} from '../src/lib/event-validation';
import type {CityEvent} from '../shared/mobile';
import {hyderabadTechEvents,hyderabadTechSeeds,canOpenRegistration,registrationState,eventSourceKey} from '../shared/hyderabad-tech';
const base:CityEvent={id:'one',title:'Developer gathering',city:'Bengaluru',venue:'Community space',startsAt:'2099-01-01T10:00:00.000Z',capacity:0,price:0,description:'An isolated fixture, not a real public event.',createdBy:'admin',status:'published',topic:'Tech',registrationUrl:'https://luma.com/test-fixture'};
test('event discovery includes only future curated Tech, HYROX and marathon links in the selected city',()=>{
  assert.deepEqual(eventTopics,['Tech','AI','HYROX','Marathons','HYROX simulations','Reading groups','Food & Drink','Other']);
  const items:CityEvent[]=[base,{...base,id:'race',topic:'HYROX'},{...base,id:'other-city',city:'Mumbai'},{...base,id:'old',startsAt:'2000-01-01T00:00:00Z'},{...base,id:'pending',status:'pending'},{...base,id:'legacy',topic:undefined,registrationUrl:undefined},{...base,id:'party',topic:'Party' as CityEvent['topic']},{...base,id:'unsafe',registrationUrl:'javascript:alert(1)'}];
  assert.deepEqual(discoverEvents(items,' bengaluru ').map(event=>event.id),['one','race']);
  assert.deepEqual(discoverEvents(items,'Bengaluru','HYROX').map(event=>event.id),['race']);
  assert.deepEqual(discoverEvents(items,'Bengaluru','Marathons'),[]);
});
test('provider labels are inferred from actual hosts, not spoofed paths or lookalike domains',()=>{
  assert.equal(eventProvider('https://luma.com/example'),'Luma');
  assert.equal(eventProvider('https://lu.ma/example'),'Luma');
  assert.equal(eventProvider('https://www.meetup.com/example/events/123'),'Meetup');
  assert.equal(eventProvider('https://hyrox.co.in/race'),'HYROX');
  assert.equal(eventProvider('https://luma.com.evil.example/event'),'Organiser');
  assert.equal(eventProvider('https://example.com/luma.com'),'Organiser');
  for(const unsafe of ['http://luma.com/event','javascript:alert(1)','https://person:secret@luma.com/event','https://localhost/event','https://127.0.0.1/event'])assert.equal(eventWebsite(unsafe),null);
  assert.ok(eventDirectories.every(source=>eventWebsite(source.url)));
});
test('external event submissions require a supported focus and safe URL, not ticket capacity or fabricated prices',()=>{
  const input={title:base.title,topic:base.topic,city:'Hyderabad',country:'IN',venue:base.venue,startsAt:new Date(Date.now()+86400000).toISOString(),description:base.description,registrationUrl:base.registrationUrl,sourceUrls:[base.registrationUrl],checkedAt:new Date().toISOString(),registrationClosesAt:null,entryFee:null,feeNote:'Unknown, not free.',registrationStatus:'Check provider',audience:'Local developers',outcomes:['Meet community members.'],editorialPriority:{score:3,reason:'An editorial test assessment.'}};
  assert.equal(eventLinkSchema.safeParse(input).success,true);
  for(const invalid of [{country:'invalid-country'},{topic:'Party'},{registrationUrl:''},{registrationUrl:'http://luma.com/event'},{startsAt:'2000-01-01T00:00:00Z'},{capacity:100},{sourceUrls:[]},{editorialPriority:{score:6,reason:'Not valid.'}},{registrationClosesAt:'2099-01-02T00:00:00.000Z'},{checkedAt:'2099-01-01T00:00:00.000Z'}])assert.equal(eventLinkSchema.safeParse({...input,...invalid}).success,false,JSON.stringify(invalid));
});
test('Hyderabad shortlist excludes unrelated, pending, cancelled, expired and duplicate provider links',()=>{
  const event:CityEvent={...base,city:'Hyderabad',country:'IN'};
  assert.deepEqual(hyderabadTechEvents([event,{...event,id:'copy',registrationUrl:`${event.registrationUrl}?utm_source=chat`},{...event,id:'other',city:'Mumbai'},{...event,id:'sport',topic:'HYROX'},{...event,id:'pending',status:'pending'},{...event,id:'cancelled',registrationStatus:'Cancelled'},{...event,id:'old',startsAt:'2000-01-01T00:00:00Z'}]).map(item=>item.id),['copy']);
  assert.equal(eventSourceKey('https://luma.com/hello/?utm_source=chat#top'),'https://luma.com/hello');
});
test('registration has explicit closed, ended and cancelled gates without inventing unknown deadlines',()=>{
  const event:CityEvent={...base,city:'Hyderabad',country:'IN',registrationClosesAt:null};
  assert.equal(registrationState(event),'Check provider');assert.equal(canOpenRegistration(event),true);
  for(const change of [{registrationClosesAt:'2000-01-01T00:00:00Z'},{startsAt:'2000-01-01T00:00:00Z'},{registrationStatus:'Sold out' as const},{registrationStatus:'Cancelled' as const},{registrationStatus:'Closed' as const},{status:'pending' as const}])assert.equal(canOpenRegistration({...event,...change}),false);
  assert.equal(canOpenRegistration({...event,registrationStatus:'Waitlist'}),true);
});
test('shortlist ordering compares actual instants across India and UTC date representations',()=>{
  const event:CityEvent={...base,city:'Hyderabad',country:'IN'};
  const early={...event,id:'early',registrationUrl:'https://luma.com/early',startsAt:'2099-01-01T10:00:00+05:30'};
  const late={...event,id:'late',registrationUrl:'https://luma.com/late',startsAt:'2099-01-01T06:00:00.000Z'};
  assert.deepEqual(hyderabadTechEvents([late,early]).map(item=>item.id),['early','late']);
});
test('research seed publishes only confirmed DevFest and holds conflicting HydPy copy for admin verification',()=>{
  assert.deepEqual(hyderabadTechEvents(hyderabadTechSeeds,Date.parse('2026-10-15T00:00:00Z')).map(item=>item.id),['hyd-tech-devfest-2026']);
  assert.equal(hyderabadTechSeeds[1].reviewRequired,true);
  assert.ok(hyderabadTechSeeds.every(event=>event.registrationClosesAt===null));
});
