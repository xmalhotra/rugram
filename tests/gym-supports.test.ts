import assert from 'node:assert/strict';
import test from 'node:test';
import {gymSupports,gymSupportFlow,supportKindIds} from '../shared/gym-supports';
import {curatedGymProducts} from '../shared/curated-gym-products';
import {budgetProducts,flows,type Product} from '../shared/mobile';
import {flowsForFocus} from '../shared/focus';
import {picksForHabit} from '../shared/flow-connections';
import {productSchema} from '../src/lib/product-validation';
test('legacy gym equipment remains addable without appearing on the curated Workout shelf',()=>{
  assert.equal(new Set(gymSupports.map(item=>item.id)).size,supportKindIds.length);
  assert.ok(flows.some(flow=>flow.id===gymSupportFlow.id));
  assert.ok(!flowsForFocus(flows,'workout').some(flow=>flow.id===gymSupportFlow.id));
  assert.ok(gymSupportFlow.steps.filter(step=>step.pickContext).every(step=>step.duration.includes('optional')));
  assert.ok(gymSupports[0].context.includes('does not automatically require a belt'));
  assert.ok(gymSupports[0].compare.some(point=>point.includes('not universal beginner/advanced')));
});
test('support habits resolve only matching published equipment, never mismatched wraps or straps',()=>{
  const belt=curatedGymProducts[0];
  const wrong:Product={...belt,id:'wrong',equipmentType:'wrist-wraps'};
  const mislabeled:Product={...belt,id:'drink',category:'Supplements'};
  const pending:Product={...belt,id:'pending',status:'pending'};
  assert.deepEqual(picksForHabit([belt,wrong,mislabeled,pending],'lifting-belt').map(item=>item.id),[belt.id]);
  for(const kind of supportKindIds)assert.ok(picksForHabit(curatedGymProducts,kind).length>0);
  assert.deepEqual(picksForHabit(curatedGymProducts,'lifting-belt',5000).map(item=>item.id),['pick-cali-belt-10']);
  assert.equal(picksForHabit(curatedGymProducts,'wrist-wraps',1000).length,0);
});
test('equipment filters preserve budget, type and moderation without reclassifying legacy Gear',()=>{
  const straps=budgetProducts(curatedGymProducts,'Equipment','All',5000,'All','lifting-straps');
  assert.deepEqual(straps.map(item=>item.id),['pick-sbd-straps-classic']);
  assert.equal(budgetProducts(curatedGymProducts,'Supplements','All',100000).length,0);
});
test('equipment submissions require a matching type and habit; Tech and food cannot masquerade as support gear',()=>{
  for(const item of curatedGymProducts){
    assert.equal(productSchema.safeParse(item).success,true,item.id);
    assert.ok(item.url&&item.checkedAt&&item.packLabel);assert.equal(item.endorsements.length,0);
  }
  const base=curatedGymProducts[0];
  for(const changes of [{equipmentType:undefined},{useCases:['wrist-wraps']},{category:'Tech',subcategory:'Electronics'},{category:'Food'},{useCases:['pre-workout-drink']}])assert.equal(productSchema.safeParse({...base,...changes}).success,false);
});
