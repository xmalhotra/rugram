import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {exercises,exerciseSetStepId,prescriptionLabel,prescriptionVolume,type ExercisePrescription} from '../shared/exercises';
import {absWorkoutFlow,workoutSteps} from '../shared/workouts';
import {flowsForFocus} from '../shared/focus';
import {flows} from '../shared/mobile';

test('central exercises have unique IDs, small visuals and technique context',()=>{
  assert.equal(exercises.length,8);assert.equal(new Set(exercises.map(item=>item.id)).size,exercises.length);
  for(const exercise of exercises){assert.ok(exercise.icon);assert.ok(exercise.instructions.length>=3);assert.ok(exercise.easier && exercise.watchFor);assert.equal(new URL(exercise.source.url).protocol,'https:');}
});
test('workouts reference canonical exercises instead of copying technique',()=>{
  const plan=absWorkoutFlow.workout!;
  for(const block of plan.blocks){assert.ok(exercises.some(item=>item.id===block.exerciseId));assert.ok(!('instructions' in block));}
  assert.ok(flows.some(flow=>flow.id===absWorkoutFlow.id));
  assert.ok(!flowsForFocus(flows,'workout').some(flow=>flow.id===absWorkoutFlow.id));
});
test('rep and hold volume stay distinct, including work on both sides',()=>{
  const reps:ExercisePrescription={exerciseId:'dead-bug',mode:'reps',reps:6,sets:2,restSeconds:60,perSide:true};
  const hold:ExercisePrescription={exerciseId:'knee-plank',mode:'hold',seconds:10,sets:2,restSeconds:60,perSide:false};
  assert.equal(prescriptionLabel(reps),'2 sets × 6 reps per side · rest 60s');
  assert.equal(prescriptionVolume(reps),'12 reps per side (24 total across both sides)');
  assert.equal(prescriptionVolume(hold),'20 seconds of holds in total');
  assert.match(prescriptionLabel(hold),/10s hold/);assert.ok(!prescriptionLabel(hold).includes('reps'));
});
test('preparation, individual sets and reflection have stable completion IDs',()=>{
  const plan=absWorkoutFlow.workout!;const steps=workoutSteps(plan,exercises);
  assert.equal(steps.length,2+plan.blocks.reduce((sum,block)=>sum+block.sets,0));
  assert.equal(new Set(steps.map(step=>step.id)).size,steps.length);
  assert.equal(steps[0].id,'prepare');assert.equal(steps.at(-1)?.id,'reflect');
  assert.ok(steps.some(step=>step.id===exerciseSetStepId(plan.blocks[0],0)));
  assert.ok(steps.some(step=>step.id==='exercise-knee-plank-set-2'&&step.duration==='10s'));
});
test('newly authored workouts do not leak into the curated Workout shelf',()=>{
  const custom={...absWorkoutFlow,id:'workout-custom',title:'Custom workout'};
  assert.ok(!flowsForFocus([...flows,custom],'workout').some(flow=>flow.id===custom.id));
  assert.ok(!flowsForFocus([...flows,custom],'running').some(flow=>flow.id===custom.id));
});
test('consumer workout guides show canonical technique cards rather than set tracking',()=>{
  const journey=readFileSync('mobile/src/WorkoutJourney.tsx','utf8');
  const card=readFileSync('mobile/src/ExerciseTechniqueCard.tsx','utf8');
  const details=readFileSync('mobile/src/FlowDetails.tsx','utf8');
  assert.match(journey,/ExerciseSequence/);
  assert.match(journey,/data\.exercises\.find/);
  assert.doesNotMatch(journey,/HabitToggle|onComplete|prescriptionLabel|prescriptionVolume|exerciseSetStepId|block\.sets|block\.reps|block\.seconds/);
  assert.match(card,/exercise\.instructions\.map/);
  assert.match(card,/ExerciseThumbnail.*size=\{144\}/);
  assert.match(card,/exercise\.watchFor/);
  assert.match(card,/exercise\.source\.url/);
  const sequence=readFileSync('mobile/src/ExerciseSequence.tsx','utf8');
  assert.match(sequence,/horizontal\s+pagingEnabled/);
  assert.match(sequence,/initialScrollIndex=\{index\}/);
  assert.match(sequence,/<ScrollView/);
  assert.match(sequence,/ExerciseTechniqueCard/);
  assert.match(card,/filter\(item=>item\.verified\)/);
  assert.match(details,/flow\.rhythm && !flow\.workout/);
  assert.doesNotMatch(absWorkoutFlow.description,/check off|understand the dose/);
  assert.doesNotMatch(absWorkoutFlow.milestone!,/session|set means/);
});
