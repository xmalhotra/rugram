import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContent,flowContentSchema,exerciseContentSchema} from '../src/lib/content-validation';
import {exercises} from '../shared/exercises';
import {flows} from '../shared/mobile';
import {hyderabadTechSeeds} from '../shared/hyderabad-tech';
import {curatedFlowProducts} from '../shared/curated-flow-resources';
test('admin content preserves stable step identifiers and rejects duplicate steps or unsafe dose bounds',()=>{
  const flow=flows.find(flow=>flow.id==='morning')!;
  assert.equal(flowContentSchema.safeParse(flow).success,true);
  assert.equal(flowContentSchema.safeParse({...flow,steps:[flow.steps[0],flow.steps[0]]}).success,false);
  const workout=flows.find(flow=>flow.workout)!;
  assert.equal(flowContentSchema.safeParse({...workout,workout:{...workout.workout,blocks:[{...workout.workout!.blocks[0],sets:1000}]}}).success,false);
});
test('administrative event editing normalises sourced dates and permits correcting historical records',()=>{
  const data=validateContent('event',{...hyderabadTechSeeds[0],startsAt:'2020-01-01T10:00:00+05:30',endsAt:'2020-01-01T18:00:00+05:30'});
  assert.equal(data.startsAt,'2020-01-01T04:30:00.000Z');assert.equal(data.reviewRequired,false);
  assert.equal(data.id,hyderabadTechSeeds[0].id);
});
test('admin seller edits derive the canonical price instead of trusting stale summary fields',()=>{
  const product=curatedFlowProducts.find(product=>product.purchaseOptions?.length)!;
  const data=validateContent('product',{...product,price:999999,url:'',checkedAt:''});
  assert.notEqual(data.price,999999);assert.ok(String(data.url).startsWith('https://'));assert.equal(data.demo,false);
  assert.equal(validateContent('product',{...product,demo:true}).demo,true,'Editing a demo fixture must not turn it into a real purchase recommendation.');
});
test('exercise creator references persist through admin validation with source and verification fields',()=>{
  const reference={name:'Test creator',profileUrl:'https://example.com/creator',sourceUrl:'https://example.com/original',claim:'Mentions',context:'Demonstrates the movement, not a medical recommendation.',disclosure:'No commercial relationship.',checkedAt:'2026-01-01T00:00:00.000Z',verified:true};
  const result=exerciseContentSchema.parse({...exercises[0],recommendations:[reference]});
  assert.deepEqual(result.recommendations,[reference]);
  assert.equal(exerciseContentSchema.safeParse({...exercises[0],recommendations:[{...reference,sourceUrl:'not-a-url'}]}).success,false);
  assert.equal(exerciseContentSchema.safeParse({...exercises[0],recommendations:[{...reference,checkedAt:'2999-01-01T00:00:00.000Z'}]}).success,false);
});
