import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSupplementDiscovery,topicProducts} from '../shared/supplement-discovery';
import {flows,type Product} from '../shared/mobile';
import {curatedFlowProducts} from '../shared/curated-flow-resources';
import {validateContent} from '../src/lib/content-validation';
import {curatedWheyProducts} from '../shared/curated-whey-products';
import {alternativePicks} from '../shared/pick-comparison';
import {productSchema} from '../src/lib/product-validation';
const settings={id:'app',title:'BetterHabits',eventCities:['Hyderabad'],eventCountry:'IN',eventTopics:['Tech'],defaultCreatorMonthlyEvents:2,productCategories:[{id:'Supplements',title:'Supplements',subcategories:[]}],tiers:['Essential'],supplementDiscovery:defaultSupplementDiscovery};
test('supplements starts with goals and links only existing educational topics',()=>{
  assert.deepEqual(defaultSupplementDiscovery.goals.map(goal=>goal.id),['strength','running','hyrox','recovery']);
  for(const goal of defaultSupplementDiscovery.goals)for(const id of goal.topicIds)assert.ok(defaultSupplementDiscovery.topics.some(topic=>topic.id===id));
  assert.ok(!defaultSupplementDiscovery.goals.find(goal=>goal.id==='running')!.topicIds.includes('creatine'));
  for(const topic of defaultSupplementDiscovery.topics){assert.ok(topic.consider&&topic.foodFirst&&topic.sourceUrls.length);for(const id of topic.flowIds)assert.ok(flows.some(flow=>flow.id===id));}
});
test('a supplement topic never falls back to all products, demo products or unrelated pre-workout items',()=>{
  const hydration=defaultSupplementDiscovery.topics.find(topic=>topic.id==='hydration')!;
  const base=curatedFlowProducts.find(product=>product.id===hydration.productIds[0])!;
  assert.ok(base);
  const wrong={...base,id:'unrelated',title:'Different ingredient'};
  assert.deepEqual(topicProducts(hydration,[base,base,wrong,{...base,status:'pending'},{...base,demo:true},{...base,category:'Food'}] as Product[]).map(product=>product.id),[base.id]);
  assert.deepEqual(topicProducts(defaultSupplementDiscovery.topics.find(topic=>topic.id==='creatine')!,[base,wrong]),[]);
});
test('admin-editable supplement journeys reject duplicate goals and dangling topic references',()=>{
  assert.ok(validateContent('settings',settings).supplementDiscovery);
  assert.throws(()=>validateContent('settings',{...settings,supplementDiscovery:{...defaultSupplementDiscovery,goals:[defaultSupplementDiscovery.goals[0],defaultSupplementDiscovery.goals[0]]}}));
  assert.throws(()=>validateContent('settings',{...settings,supplementDiscovery:{...defaultSupplementDiscovery,goals:[{...defaultSupplementDiscovery.goals[0],topicIds:['does-not-exist']}]}}));
});
test('whey has three real, valid, photographed products in editorial order regardless of catalogue order',()=>{
  const topic=defaultSupplementDiscovery.topics.find(topic=>topic.id==='protein')!;
  const picks=topicProducts(topic,[...curatedFlowProducts].reverse());
  assert.deepEqual(picks.map(product=>product.title),['TrueBasics','NAKPRO','Optimum Nutrition']);
  for(const pick of picks){assert.ok(productSchema.safeParse(pick).success,pick.title);assert.ok(pick.imageUrl);assert.ok(!pick.demo);assert.ok(pick.assessment?.whyChosen);assert.ok(pick.purchaseOptions?.[0].url);}
  assert.equal(curatedWheyProducts.find(product=>product.title==='NAKPRO')!.price,2199);
});
test('a whey comparison excludes electrolytes, pending products and duplicates',()=>{
  const [first,...others]=curatedWheyProducts;
  const comparison=alternativePicks(first,[...curatedFlowProducts,...others,{...others[0],id:'pending-whey',status:'pending'}]);
  assert.deepEqual(new Set(comparison.map(product=>product.id)),new Set(others.map(product=>product.id)));
});
test('topic shortlists cap at three and preserve explicit editorial selection',()=>{
  const topic=defaultSupplementDiscovery.topics.find(topic=>topic.id==='protein')!;
  const extra={...curatedWheyProducts[0],id:'fourth'};
  assert.equal(topicProducts({...topic,productIds:[...topic.productIds,extra.id]},[...curatedWheyProducts,extra]).length,3);
});
