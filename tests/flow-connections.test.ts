import assert from 'node:assert/strict';
import test from 'node:test';
import {flows,type Product} from '../shared/mobile';
import {eventsForFlow,eventCost,picksForHabit} from '../shared/flow-connections';
import {curatedFlowEvents,curatedFlowProducts} from '../shared/curated-flow-resources';
const flow=flows.find(item=>item.id==='fitness-hyrox-base')!;
test('HYROX habits link to specific Picks use cases, not every food or supplement',()=>{
  const habit=flow.steps.find(step=>step.id==='drink')!;
  assert.equal(habit.pickContext?.useCase,'pre-workout-drink');
  const unrelated:Product={...curatedFlowProducts[0],id:'unrelated',useCases:['breakfast']};
  const pending:Product={...curatedFlowProducts[0],id:'pending',status:'pending'};
  assert.deepEqual(picksForHabit([...curatedFlowProducts,unrelated,pending],'pre-workout-drink',250).map(item=>item.id),['pick-reload-orange-20']);
  assert.equal(picksForHabit(curatedFlowProducts,'pre-workout-drink',100).length,0);
  assert.equal(picksForHabit(curatedFlowProducts,'pre-workout-drink').length,2);
});
test('flow events span India across cities, excluding past, unpublished and overseas races',()=>{
  const base=curatedFlowEvents.find(event=>event.id==='race-hyrox-gujarat-2026')!;
  const items=[...curatedFlowEvents,{...base,id:'overseas',country:'DE'},{...base,id:'pending',status:'pending' as const},{...base,id:'past',startsAt:'2000-01-01',endsAt:'2000-01-02'},{...base,id:'tech',topic:'Tech' as const}];
  const related=eventsForFlow(items,flow,new Date('2026-10-15').getTime());
  assert.deepEqual(related.map(event=>event.id),['race-hyrox-gujarat-2026','race-hyrox-noida-2027']);
  assert.equal(eventsForFlow(items,flows.find(item=>item.id==='morning')!).length,0);
  assert.equal(eventsForFlow(items,flow,new Date('2030-01-01').getTime()).length,0);
});
test('an unverified race fee cannot be displayed as free or registration-open',()=>{
  const race=curatedFlowEvents.find(event=>event.id==='race-hyrox-gujarat-2026')!;
  assert.equal(eventCost(race),'Price not publicly verified');
  assert.equal(eventCost({...race,entryFee:0}),'Free entry');
  assert.equal(eventCost({...race,entryFee:5000}),'From ₹5,000');
  assert.equal(curatedFlowEvents.find(event=>event.id==='race-hyrox-noida-2027')?.registrationStatus,'Tickets coming soon');
  assert.ok(curatedFlowEvents.every(event=>event.sourceUrl && event.checkedAt && event.registrationUrl));
  assert.ok(curatedFlowProducts.every(product=>product.url && product.checkedAt && product.packLabel && !product.demo && product.endorsements.length===0));
});
