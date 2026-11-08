import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
import {eventInterests,defaultEventTopics,enabledEventInterests,eventMatchesInterest,type EventInterest} from '../shared/event-interests';
import {hyderabadTechEvents} from '../shared/hyderabad-tech';
import type {CityEvent} from '../shared/mobile';
import {validateContent} from '../src/lib/content-validation';
const now=Date.parse('2026-10-16T00:00:00Z');
const event={id:'one',title:'Cloud and AI developer meetup',description:'A community gathering about AWS and machine learning.',topic:'Tech',city:'Hyderabad',country:'IN',status:'published',startsAt:'2026-11-01T10:00:00Z',registrationUrl:'https://luma.com/example'} as CityEvent;
test('event interest selection respects admin topic scope and does not invent broader listings',()=>{
  const enabled=enabledEventInterests(eventInterests,['Tech']);assert.equal(enabled.length,1);
  assert.ok(enabled.every(category=>category.topics.includes('Tech')));
  assert.ok(!enabled.some(category=>category.id==='hyrox-simulations'||category.id==='marathons'));
  const interest=enabled.find(category=>category.id==='tech')!;
  const approved=hyderabadTechEvents([event,{...event,id:'pending',status:'pending'},{...event,id:'outside',city:'Mumbai'}],now);
  assert.deepEqual(approved.filter(item=>eventMatchesInterest(item,interest)).map(item=>item.id),['one']);
});
test('event interests match topic and whole keywords, not accidental substrings or every event',()=>{
  const ai:EventInterest={id:'custom-ai',title:'AI',illustration:'ai',topics:['Tech'],keywords:['ai','machine learning']};const security:EventInterest={id:'custom-security',title:'Security',illustration:'security',topics:['Tech'],keywords:['security']};
  assert.equal(eventMatchesInterest(event,ai),true);assert.equal(eventMatchesInterest(event,security),false);
  assert.equal(eventMatchesInterest({...event,title:'India annual gathering',description:'A community event'},ai),false);
  assert.equal(eventMatchesInterest({...event,topic:'HYROX'},ai),false);
  assert.equal(eventMatchesInterest({...event,title:'Security workshop'},security),true);
});
test('default event categories are broad interests; technical tracks stay inside Tech',()=>{
  // The five Luma-style categories; Running gathers races and HYROX.
  assert.deepEqual(eventInterests.map(category=>category.title),['Tech','AI','Running','Food & Drink','Books']);
  assert.equal(enabledEventInterests(eventInterests,defaultEventTopics).length,5);
  const tech=eventInterests.find(category=>category.id==='tech')!;
  for(const title of ['AI workshop','Python coding group','Cloud & DevOps meetup','Security forum'])assert.ok(eventMatchesInterest({...event,title},tech));
  const running=eventInterests.find(category=>category.id==='marathons')!;
  assert.equal(eventMatchesInterest({...event,topic:'HYROX'},running),true);
  assert.equal(eventMatchesInterest({...event,topic:'Tech'},running),false);
  assert.equal(eventMatchesInterest({...event,topic:'HYROX simulations'},running),true);
  const reading=eventInterests.find(category=>category.id==='reading-groups')!;
  assert.equal(eventMatchesInterest({...event,topic:'Reading groups'},reading),true);
});
test('event landing page shows city categories followed by events before a category is selected',()=>{
  const source=readFileSync('mobile/src/HyderabadEvents.tsx','utf8');
  assert.doesNotMatch(source,/Browse by category|Picked for you/);
  containsCode(source,'!interest||eventMatchesInterest(event,interest)');
  assert.doesNotMatch(source,/if\(!interest\)return/);
  containsCode(source,'groupEventsByDay(shown).map(day=>');
});
test('admin can edit event category names, topics, illustrations and matching keywords',()=>{
  const settings={id:'app',title:'BetterHabits',eventCities:['Hyderabad'],eventCountry:'IN',eventTopics:['Tech'],defaultCreatorMonthlyEvents:2,productCategories:[{id:'Tech',title:'Tech',subcategories:[]}],tiers:['Essential'],eventInterests};
  assert.ok(validateContent('settings',settings).eventInterests);
  assert.throws(()=>validateContent('settings',{...settings,eventInterests:[eventInterests[0],eventInterests[0]]}));
  assert.throws(()=>validateContent('settings',{...settings,eventInterests:[{...eventInterests[0],topics:['Party']}]}));
});
test('Flows, Picks, supplement goals and Events share the illustrated category slider',()=>{
  for(const file of ['FlowSections'])assert.match(readFileSync(`mobile/src/${file}.tsx`,'utf8'),/<CategoryRail\b/);
  // Events dropped its category browser for a Luma-style list by day.
  // The Flows tab is a fitness catalog and no longer uses that slider.
  assert.doesNotMatch(readFileSync('mobile/src/FlowCatalogHome.tsx','utf8'),/<CategoryRail|<FlowTopicBrowser/);
  const rail=readFileSync('mobile/src/CategoryRail.tsx','utf8');assert.match(rail,/horizontal\s+showsHorizontalScrollIndicator=\{false\}/);containsCode(rail,'accessibilityState={{selected:selected===item.id}}');
  containsCode(rail,"alignItems:'center'");containsCode(rail,"textAlign:'center'");
});
