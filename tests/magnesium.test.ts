import assert from 'node:assert/strict';
import test from 'node:test';
import {costPer100mg,magnesiumForm,magnesiumForms,magnesiumGuideFlow,magnesiumSources} from '../shared/magnesium';
import {flows} from '../shared/mobile';
import {flowsForFocus} from '../shared/focus';

test('magnesium forms keep comparison evidence and unreviewed forms distinct',()=>{
  assert.equal(new Set(magnesiumForms.map(form=>form.id)).size,magnesiumForms.length);
  assert.equal(magnesiumForm('citrate')?.evidence,'human-comparisons');
  assert.equal(magnesiumForm('glycinate')?.evidence,'not-reviewed');
  assert.equal(magnesiumForm('unknown'),undefined);
  for(const form of magnesiumForms){
    assert.ok(form.absorption&&form.interpretation);
    if(form.evidence==='human-comparisons')assert.ok(form.sourceIds.length>0);
    assert.ok(!('absorptionPercentage' in form));assert.ok(!('score' in form));
    for(const id of form.sourceIds)assert.equal(new URL(magnesiumSources[id].url).protocol,'https:');
  }
});
test('price comparison uses elemental label content, not compound weight or estimated absorption',()=>{
  assert.equal(costPer100mg(600,60,100),10);
  assert.equal(costPer100mg(600,30,200),10);
  assert.equal(costPer100mg(600,60,200),5);
  assert.equal(costPer100mg(0,60,100),0);
});
test('unknown, invalid and overflowing label figures do not produce a value ranking',()=>{
  for(const input of [[NaN,60,100],[-1,60,100],[600,0,100],[600,-1,100],[600,60,0],[600,60,-1],[Infinity,60,100],[600,Infinity,100],[600,1e308,1e308]])assert.equal(costPer100mg(...input as [number,number,number]),null);
});
test('saved magnesium education remains in the library without becoming a food idea in Nutrition browse',()=>{
  assert.equal(flows.find(flow=>flow.guideId==='magnesium')?.id,magnesiumGuideFlow.id);
  assert.ok(!flowsForFocus(flows,'nutrition').some(flow=>flow.id===magnesiumGuideFlow.id));
  assert.ok(magnesiumGuideFlow.guidance?.includes('not a prescription'));
  assert.ok(magnesiumGuideFlow.rhythm?.includes('not a daily supplement'));
  assert.equal(magnesiumGuideFlow.workout,undefined);
  assert.ok(magnesiumGuideFlow.steps.every(step=>!step.pickContext));
});
