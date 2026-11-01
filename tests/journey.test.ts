import test from 'node:test';
import assert from 'node:assert/strict';
import {eventHorizon,eventWithinYear} from '../shared/event-registration';
import {storyGroupSeen,storyReadKey,buildStoryGroups,storyIndex} from '../shared/home-feed';
import {alternativePicks,comparisonRows} from '../shared/pick-comparison';
import type {Product,MobilePayload} from '../shared/mobile';
test('rapid story navigation stays within bounds, including removed or empty cards',()=>{
  assert.equal(storyIndex(-1,3),0);assert.equal(storyIndex(3,3),2);
  assert.equal(storyIndex(100,1),0);assert.equal(storyIndex(0,0),0);
  assert.equal(storyIndex(NaN,3),0);
  let index=0;for(let i=0;i<20;i++)index=storyIndex(index+1,3);assert.equal(index,2);
  for(let i=0;i<20;i++)index=storyIndex(index-1,3);assert.equal(index,0);
});
test('event window starts now and ends at the next calendar year, including leap-day clamping',()=>{
  const now=Date.parse('2026-10-15T00:00:00Z');assert.equal(eventWithinYear(new Date(now).toISOString(),now),false);assert.equal(eventWithinYear(new Date(now+1).toISOString(),now),true);assert.equal(eventWithinYear(new Date(eventHorizon(now)).toISOString(),now),true);assert.equal(eventWithinYear(new Date(eventHorizon(now)+1).toISOString(),now),false);
  assert.equal(new Date(eventHorizon(Date.parse('2024-02-29T12:00:00Z'))).toISOString(),'2025-02-28T12:00:00.000Z');
});
test('story read state is content-versioned, requires each card, and changes when new information arrives',()=>{
  const card={id:'flow:one',title:'One',body:'Original',eyebrow:'LEARN',action:'Open',target:{kind:'flow' as const,id:'flow'}};const second={...card,id:'flow:two'};const group={id:'flow',title:'Focus',initials:'F',cards:[card,second]};
  assert.equal(storyGroupSeen(group,[]),false);assert.equal(storyGroupSeen(group,[storyReadKey(card)]),false);assert.equal(storyGroupSeen(group,[storyReadKey(card),storyReadKey(second)]),true);assert.notEqual(storyReadKey(card),storyReadKey({...card,body:'Updated information'}));
});
test('empty related-content groups are hidden rather than populated with a fallback story',()=>{
  const flow={id:'empty',title:'An independent flow',goal:'Focus',description:'A flow without related items.',steps:[{id:'one',title:'One',cue:'Do it.',duration:'A minute'}]};
  const data={profile:{flowIds:[flow.id],availableSupportIds:[]},flows:[flow],products:[],events:[],flowResources:{products:[],events:[]}} as unknown as MobilePayload;assert.deepEqual(buildStoryGroups(data),[]);
});
test('pick alternatives retain category/use-case fit and missing specifications stay unknown',()=>{
  const base={id:'first',category:'Tech',subcategory:'Audio',status:'published',price:100,useCases:['focus-audio'],specifications:[{label:'Weight',value:'200 g'}]} as Product;
  const other={...base,id:'second',price:200,specifications:[]};const unrelated={...base,id:'wrong',category:'Food'} as Product;
  assert.deepEqual(alternativePicks(base,[base,other,unrelated,{...other,id:'pending',status:'pending'}]).map(product=>product.id),['second']);assert.deepEqual(comparisonRows([base,other]),[{label:'Weight',values:['200 g','Not recorded']}]);
});
