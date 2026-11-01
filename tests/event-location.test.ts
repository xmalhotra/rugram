import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
import {eventCities,eventCity,eventsInCity} from '../shared/event-location';
import type {CityEvent} from '../shared/mobile';
const scope={eventCities:['Hyderabad','Bengaluru'],eventCountry:'IN',eventTopics:['Tech']};
const now=Date.parse('2026-10-16T00:00:00Z');
const event={id:'hyd',title:'Developer meetup',description:'A tech gathering',topic:'Tech',city:'Hyderabad',country:'IN',status:'published',startsAt:'2026-11-01T10:00:00Z',registrationUrl:'https://luma.com/test'} as CityEvent;
test('event city defaults to covered profile location, otherwise to the first enabled city',()=>{
  assert.deepEqual(eventCities(),['Hyderabad']);
  assert.equal(eventCity(eventCities(scope),' bengaluru '),'Bengaluru');
  assert.equal(eventCity(eventCities(scope),'Mumbai'),'Hyderabad');
  assert.equal(eventCity([],'Hyderabad'),null);
  assert.deepEqual(eventCities({...scope,eventCities:[' Hyderabad ','HYDERABAD','Bengaluru','']}),['HYDERABAD','Bengaluru']);
});
test('changing location filters the city without bypassing curation, country, topic or publication rules',()=>{
  const events=[event,{...event,id:'blr',city:'Bengaluru',registrationUrl:'https://luma.com/bangalore'},{...event,id:'outside',city:'Mumbai'},{...event,id:'pending',status:'pending' as const},{...event,id:'country',country:'US'},{...event,id:'fitness',topic:'HYROX' as const},{...event,id:'cancelled',registrationStatus:'Cancelled'},{...event,id:'past',startsAt:'2025-01-01T00:00:00Z'}] as CityEvent[];
  assert.deepEqual(eventsInCity(events,'Hyderabad',scope,now).map(item=>item.id),['hyd']);
  assert.deepEqual(eventsInCity(events,'Bengaluru',scope,now).map(item=>item.id),['blr']);
  assert.deepEqual(eventsInCity(events,'Mumbai',scope,now),[]);
  assert.deepEqual(eventsInCity(events,null,scope,now),[]);
});
test('location filtering keeps native approval events and source-link deduplication',()=>{
  const native={...event,id:'native',registrationMode:'approval',registrationUrl:undefined} as CityEvent;
  assert.deepEqual(eventsInCity([event,{...event,id:'duplicate',registrationUrl:'https://luma.com/test?utm_source=example'},native],'Hyderabad',scope,now).map(item=>item.id),['duplicate','native']);
});
test('Events shows a location control before categories and within event results, without asking for GPS',()=>{
  const screen=readFileSync('mobile/src/HyderabadEvents.tsx','utf8');
  const picker=readFileSync('mobile/src/EventLocationPicker.tsx','utf8');
  assert.match(screen,/Explore events in/);containsCode(screen,'onPress={()=>setChoosingCity(true)}');
  assert.ok(screen.indexOf('{locationHeader}')<screen.indexOf('<CategoryRail'));
  containsCode(screen,'eventsInCity(data.events,selectedCity,scope)');
  assert.match(picker,/Choose a city/);assert.match(picker,/accessibilityRole="radio"/);
  assert.doesNotMatch(screen+picker,/requestForegroundPermissions|requestBackgroundPermissions|navigator\.geolocation/);
  assert.doesNotMatch(screen,/eventCities\.join/);
});
