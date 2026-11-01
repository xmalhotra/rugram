import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateAnalytics, budgetProducts, flows, pickCategories, productCategory, productTechCategory, type Product } from '../shared/mobile';
import { discoverFlows, flowAreas, flowPaths, goalFlows } from '../shared/flow-catalog';
import { techResource } from '../shared/tech-resources';
import {focusOptions,flowsForFocus} from '../shared/focus';
const base: Product = { id: 'one', title: 'First', category: 'Food', tier: 'Essential', price: 250, summary: 'A test product', url: 'https://example.com', checkedAt: '2026-10-14T00:00:00Z', status: 'published', createdBy: 'admin', endorsements: [] };
test('budget picks exclude unreviewed listings and respect category, tier and spending limit', () => {
  const items: Product[] = [base, { ...base,id:'two',price:1500 }, { ...base,id:'three',status:'pending' }, { ...base,id:'four',category:'Electronics' }];
  assert.deepEqual(budgetProducts(items,'Food','Essential',500).map(p => p.id), ['one']);
});
test('analytics count distinct users and actual recorded conversions', () => {
  const analytics = aggregateAnalytics([{ userId:'a',role:'user',action:'habit_completed',at:'2026-10-14T00:00:00Z' }, { userId:'a',role:'user',action:'product_saved',at:'2026-10-14T01:00:00Z' }, { userId:'b',role:'creator',action:'event_joined',at:'2026-10-14T01:00:00Z' }]);
  assert.equal(analytics.activeUsers,2); assert.equal(analytics.completions,1); assert.equal(analytics.saves,1); assert.equal(analytics.rsvps,1); assert.deepEqual(analytics.daily,[{date:'2026-10-14',count:3}]);
});
test('Picks keeps food, supplements, Tech and gym Equipment distinct',()=>{
  assert.deepEqual(pickCategories,['Food','Supplements','Tech','Equipment']);
  const audio:Product={...base,id:'audio',category:'Tech',subcategory:'Audio'};
  const wearable:Product={...base,id:'watch',category:'Tech',subcategory:'Wearables'};
  const legacy:Product={...base,id:'legacy',category:'Electronics'};
  const gear:Product={...base,id:'bottle',category:'Gear'};
  const products=[base,audio,wearable,legacy,gear];
  assert.deepEqual(budgetProducts(products,'Tech','All',500).map(p=>p.id),['audio','watch','legacy']);
  assert.deepEqual(budgetProducts(products,'Tech','All',500,'Audio').map(p=>p.id),['audio']);
  assert.equal(productCategory(legacy),'Tech');assert.equal(productTechCategory(legacy),'Electronics');
  assert.equal(productCategory(gear),null);
  assert.ok(!budgetProducts(products,'All','All',500).some(p=>p.id==='bottle'));
  assert.deepEqual(budgetProducts(products,'Food','All',500,'Audio').map(p=>p.id),['one']);
});
test('internal flow paths remain available without breaking existing IDs', () => {
  assert.deepEqual(flowAreas.map(area=>area.id),['Fitness','Tech']);
  assert.equal(new Set(flowPaths.map(path=>path.id)).size,flowPaths.length);
  for(const path of flowPaths) {
    const matches=discoverFlows(flows,path.area,path.id);
    assert.ok(matches.length>0,`${path.id} has an actionable flow`);
    assert.ok(matches.every(flow=>flow.area===path.area && flow.pathId===path.id));
  }
  assert.deepEqual(discoverFlows(flows,'Tech','hyrox'),[]);
  assert.deepEqual(discoverFlows(flows,'Fitness','unknown'),[]);
});
test('the post-login focus choices exclude the retired CrossFit section and cooking',()=>{
  assert.deepEqual(focusOptions.map(option=>option.title),['Better sleep','Morning drinks','Workout','Running','HYROX','Supplements','Coding','Nutrition']);
  assert.equal(new Set(focusOptions.map(option=>option.id)).size,focusOptions.length);
  for(const option of focusOptions){
    const matches=flowsForFocus(flows,option.id);
    assert.equal(matches.length,option.flowIds.length,`${option.title} has all configured flows`);
    assert.ok(matches.length>0);
    assert.deepEqual(matches.map(flow=>flow.id),[...option.flowIds]);
  }
  assert.deepEqual(flowsForFocus(flows,'cooking'),[]);
  assert.equal(flowsForFocus(flows,'sleep')[0].goal,'Better sleep');
  assert.equal(flowsForFocus(flows,'nutrition')[0].goal,'Everyday protein');
});
test('starter flows have actionable steps, rhythm, milestone, review and honest sources', () => {
  assert.equal(new Set(flows.map(flow=>flow.id)).size,flows.length);
  for(const flow of goalFlows) {
    assert.ok(flow.rhythm && flow.milestone && flow.review && flow.level);
    // Written tech resources are short reading lists; their links carry the content.
    if(techResource(flow.id)) assert.ok(techResource(flow.id)!.links.length>=1, flow.id);
    else assert.ok(flow.steps.length>=3, flow.id);
    assert.equal(new Set(flow.steps.map(step=>step.id)).size,flow.steps.length);
    assert.ok(flow.steps.every(step=>step.title && step.cue && step.duration));
    assert.ok(flow.sources?.every(source=>new URL(source.url).protocol==='https:'));
    if(flow.area==='Fitness') assert.ok(flow.guidance?.includes('recovery'));
  }
});
test('previously saved flows and completion step IDs remain available', () => {
  for(const [id,step] of [['morning','water'],['running','walk'],['sleep','bed']]) {
    assert.ok(flows.find(flow=>flow.id===id)?.steps.some(item=>item.id===step));
  }
  assert.ok(!discoverFlows(flows,'Fitness','foundation').some(flow=>flow.id==='running'));
});
