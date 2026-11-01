import assert from 'node:assert/strict';
import test from 'node:test';
import {flows} from '../shared/mobile';
import {nutritionCategories,nutritionFlow,nutritionFlows,nutritionOptions} from '../shared/nutrition';
test('Nutrition has five categories, each with a working context-specific flow',()=>{
  assert.deepEqual(nutritionCategories.map(item=>item.title),['Everyday protein','Hydration & electrolytes','Pre-workout','Intra-workout','Post-workout']);
  assert.equal(nutritionFlows.length,16);
  for(const category of nutritionCategories){
    assert.ok(nutritionOptions(category.id).length>=3);
    for(const option of nutritionOptions(category.id)){
      const flow=nutritionFlow(flows,category.id,option.id);
      assert.ok(flow,`${category.id}/${option.id} resolves to the central library`);
      assert.ok(flow.steps.length>=3);
      assert.ok(flow.guidance?.includes('not a personalised diet'));
    }
  }
});
test('training stages branch to Running, Gym and HYROX, without crossing unrelated paths',()=>{
  for(const stage of ['pre','intra','post'] as const){
    assert.deepEqual(nutritionOptions(stage).map(item=>item.title),['Running','Gym','HYROX']);
    const run=nutritionFlow(flows,stage,'running')!;const gym=nutritionFlow(flows,stage,'gym')!;const hyrox=nutritionFlow(flows,stage,'hyrox')!;
    assert.notEqual(run.description,gym.description);assert.notEqual(hyrox.description,run.description);
  }
  assert.equal(nutritionFlow(flows,'protein','running'),undefined);
  assert.equal(nutritionFlow(flows,'pre','plant'),undefined);
  assert.equal(nutritionFlow(flows,'cooking','gym'),undefined);
});
test('sports nutrition does not equate an electrolyte mix with intra-workout fuel',()=>{
  for(const activity of ['running','gym','hyrox']){
    const pre=nutritionFlow(flows,'pre',activity)!;
    assert.equal(pre.steps.find(step=>step.id==='drink')?.pickContext?.useCase,'pre-workout-drink');
    assert.ok(pre.steps.find(step=>step.id==='drink')?.cue.includes('not the same thing as carbohydrate fuel'));
    const intra=nutritionFlow(flows,'intra',activity)!;
    assert.ok(intra.steps.every(step=>!step.pickContext));
    assert.ok(intra.steps[0].cue.includes('Do not assume every short workout needs'));
  }
});
